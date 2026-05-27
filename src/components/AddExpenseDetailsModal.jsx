import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Receipt,
  Search,
  Eye,
  Wallet,
  Building2,
  User,
  RefreshCw,
} from "lucide-react";
import ExpenseViewModal from "./ExpenseViewModal";

// ─── MASTER DATA ──────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "Common", "OS", "Temp", "Rec", "BD", "Accts",
  "HR", "Admin", "IT", "Legal", "Projects", "Others",
];

const PAY_HEADS = [
  "Asset Purchase", "Repair", "Software", "F&B", "HK", "Stationery",
  "Non IT Parts", "IT Parts", "Rental", "Water", "Electricity", "Parking",
  "Internet", "Mobile Bill", "Printing", "Insurance", "Donation", "Liaison",
  "Office Décor", "Office Event", "Gifts", "Fuel", "CC Bill", "Uja Related",
  "Consultant Fee", "Petty Cash", "Others",
];

const COST_HEADS = ["ops", "temp", "recruitment", "projects", "others"];
const COST_HEAD_LABELS = {
  ops: "Ops", temp: "Temp", recruitment: "Rec", projects: "Projects", others: "Others",
};

const ASSET_STOCK_STATUS = ["In Use", "In Stock", "Defective", "Disposed"];

const DEFAULT_FORM = {
  // Header
  expenseNature: "Internal",
  clientName: "",
  entity: "",
  paidToType: "Vendor",
  vendorName: "",
  empCode: "",
  employeeName: "",
  manualVendor: false,
  department: "",
  payHead: "",
  monthOfExpense: "",
  // Payment
  paymentDescription: "",
  dueAmount: "",
  tdsAmount: "",
  transferAmount: "",
  dateOfPay: "",
  // Payment source (bank or cash only)
  paymentMode: "bank",
  bankId: "",
  bankName: "",
  // Cost
  costHeadBreakup: { ops: 0, temp: 0, recruitment: 0, projects: 0, others: 0 },
  isBillable: false,
  // Asset
  assetDescription: "",
  assetWarranty: "",
  assetStockStatus: "",
  // Misc
  remarks: "",
};

// ─── SUB COMPONENTS ──────────────────────────────────────────────────────────
const FieldRow = ({ label, required, hint, error, children, highlight }) => (
  <div
    className={`grid grid-cols-[200px_1fr] gap-4 items-start py-3 border-b border-gray-100 last:border-0 ${
      highlight ? "bg-orange-50 -mx-4 px-4 rounded-lg" : ""
    }`}
  >
    <div className="pt-2">
      <span className={`text-sm font-medium ${highlight ? "text-orange-700" : "text-gray-700"}`}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </span>
      {hint && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{hint}</p>}
    </div>
    <div>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  </div>
);

const SelectField = ({ value, onChange, options, placeholder, error, className = "" }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition pr-8
        ${error ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"} ${className}`}
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((opt) =>
        typeof opt === "string"
          ? <option key={opt} value={opt}>{opt}</option>
          : <option key={opt.value} value={opt.value}>{opt.label}</option>
      )}
    </select>
    <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

const InputField = ({ value, onChange, type = "text", placeholder, error, readOnly, className = "" }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition
      ${error ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}
      ${readOnly ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "bg-white"} ${className}`}
  />
);

const TabBtn = ({ active, onClick, children, color = "orange" }) => {
  const activeColors = {
    orange: "bg-orange-500 text-white border-orange-500",
    blue:   "bg-blue-500 text-white border-blue-500",
    emerald:"bg-emerald-500 text-white border-emerald-500",
    slate:  "bg-slate-500 text-white border-slate-500",
    violet: "bg-violet-500 text-white border-violet-500",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition border
        ${active ? activeColors[color] : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
    >
      {children}
    </button>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const AddExpenseDetailsModal = ({ isOpen, onClose, onSaved, editData, invoice }) => {
  const [form, setForm]       = useState(DEFAULT_FORM);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);

  const [entities, setEntities]     = useState([]);
  const [banks, setBanks]           = useState([]);
  const [clients, setClients]       = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [vendors, setVendors]       = useState([]);

  const [viewModalOpen, setViewModalOpen]   = useState(false);
  const [invoiceSearch, setInvoiceSearch]   = useState("");
  const [invoiceResults, setInvoiceResults] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searching, setSearching]           = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // ── Fetch masters ──
  useEffect(() => {
    if (!isOpen) return;
    const fetchMasters = async () => {
      const [e, b, c, emp] = await Promise.all([
        supabase.from("entity_master").select("id,entity_name").order("entity_name"),
        supabase.from("bank_master").select("id,bank_name,account_number").order("bank_name"),
        supabase.from("clients_master").select("id,client_name").order("client_name"),
        supabase.from("internal_team").select("id,emp_code,name,designation").order("name"),
      ]);
      if (!e.error)   setEntities(e.data || []);
      if (!b.error)   setBanks(b.data || []);
      if (!c.error)   setClients(c.data || []);
      if (!emp.error) setEmployees(emp.data || []);
    };
    fetchMasters();
  }, [isOpen]);

  // ── Pre-fill edit ──
  useEffect(() => {
    if (editData) {
      setForm({
        expenseNature:      editData.client_name ? "Client" : "Internal",
        clientName:         editData.client_name || "",
        entity:             editData.entity || "",
        paidToType:         editData.emp_code ? "Employee" : "Vendor",
        vendorName:         editData.vendor_name || "",
        empCode:            editData.emp_code || "",
        employeeName:       editData.employee_name || "",
        manualVendor:       editData.manual_vendor || false,
        department:         editData.department || "",
        payHead:            editData.pay_head || "",
        monthOfExpense:     editData.month_of_expense ? editData.month_of_expense.slice(0, 7) : "",
        paymentDescription: editData.payment_description || "",
        dueAmount:          editData.due_amount || "",
        tdsAmount:          editData.tds_amount || "",
        transferAmount:     editData.transfer_amount || "",
        dateOfPay:          editData.payment_date || "",
        paymentMode:
          editData.payment_source === "CASH" ? "cash" : "bank",
        bankId:             editData.bank_id || "",
        bankName:           editData.bank_name || "",
        costHeadBreakup: {
          ops:         editData.cost_ops         || 0,
          temp:        editData.cost_temp        || 0,
          recruitment: editData.cost_recruitment || 0,
          projects:    editData.cost_projects    || 0,
          others:      editData.cost_others      || 0,
        },
        isBillable:       editData.is_billable || false,
        assetDescription: editData.asset_description  || "",
        assetWarranty:    editData.asset_warranty      || "",
        assetStockStatus: editData.asset_stock_status  || "",
        remarks:          editData.expense_remarks     || "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setSelectedInvoice(invoice || null);
    setErrors({});
    setSaved(false);
    setInvoiceSearch("");
    setInvoiceResults([]);
  }, [editData, isOpen, invoice]);

  // ── Auto transfer amount ──
  useEffect(() => {
    const due = parseFloat(form.dueAmount) || 0;
    const tds = parseFloat(form.tdsAmount) || 0;
    setForm((p) => ({ ...p, transferAmount: Math.max(due - tds, 0).toString() }));
  }, [form.dueAmount, form.tdsAmount]);

  // ── Invoice search ──
  useEffect(() => {
    if (invoice || form.expenseNature !== "Client" || !form.isBillable) return;
    const timer = setTimeout(async () => {
      const kw = invoiceSearch?.trim();
      if (!kw) { setInvoiceResults([]); return; }
      setSearching(true);
      try {
        const { data } = await supabase
          .from("outstanding_invoice_view")
          .select("id,invoice_number,client_name,outstanding,receivable_amount")
          .ilike("invoice_number", `%${kw}%`)
          .limit(20);
        const sorted = [...(data || [])].sort((a, b) => {
          const kl = kw.toLowerCase();
          const aS = (a.invoice_number || "").toLowerCase().startsWith(kl);
          const bS = (b.invoice_number || "").toLowerCase().startsWith(kl);
          if (aS && !bS) return -1;
          if (!aS && bS) return 1;
          return (a.invoice_number || "").localeCompare(b.invoice_number || "");
        });
        setInvoiceResults(sorted);
      } finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [invoiceSearch, form.expenseNature, form.isBillable]);

  const setField = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const setCostHead = (head, value) => {
    const num = Math.min(Math.max(parseInt(value) || 0, 0), 100);
    setForm((p) => ({ ...p, costHeadBreakup: { ...p.costHeadBreakup, [head]: num } }));
    if (errors.costHead) setErrors((p) => ({ ...p, costHead: "" }));
  };

  const costTotal         = Object.values(form.costHeadBreakup).reduce((a, b) => a + b, 0);
  const isAsset           = form.payHead === "Asset Purchase";
  const isCCBill          = form.payHead === "CC Bill";
  const isPettyCashPayHead = form.payHead === "Petty Cash";
  const resolvedInvoiceId = selectedInvoice?.dbId || selectedInvoice?.id || invoice?.dbId || null;

  const paymentSourceMap = { bank: "BANK", cash: "CASH" };

  // ── Validate ──
  const validate = () => {
    const e = {};
    if (!form.entity)         e.entity        = "Entity is required";
    if (!form.department)     e.department    = "Department is required";
    if (!form.payHead)        e.payHead       = "Pay Head is required";
    if (!form.monthOfExpense) e.monthOfExpense= "Month of expense is required";
    if (!form.dueAmount || parseFloat(form.dueAmount) <= 0)
                              e.dueAmount     = "Amount must be > 0";
    if (!form.dateOfPay)      e.dateOfPay     = "Date of pay is required";
    if (form.paymentMode === "bank" && !form.bankId)
                              e.bankId        = "Select a bank";
    if (form.isBillable && form.expenseNature === "Client" && !resolvedInvoiceId)
                              e.invoiceId     = "Select an invoice";
    if (Math.round(costTotal) !== 100)
                              e.costHead      = `Total must be 100% (currently ${costTotal}%)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const selectedBank = banks.find((b) => b.id === form.bankId);
      const transferAmt  = parseFloat(form.transferAmount) || 0;
      const dueAmt       = parseFloat(form.dueAmount) || 0;

      const payload = {
        amount:               transferAmt,
        invoice_id:           resolvedInvoiceId,
        payment_date:         form.dateOfPay,
        client_name:          form.expenseNature === "Client" ? form.clientName : null,
        is_billable:          form.isBillable,
        entity:               form.entity,
        department:           form.department,
        pay_head:             form.payHead,
        payment_description:  form.paymentDescription,
        month_of_expense:     form.monthOfExpense ? form.monthOfExpense + "-01" : null,
        due_amount:           dueAmt,
        tds_amount:           parseFloat(form.tdsAmount) || 0,
        transfer_amount:      transferAmt,
        bank_id:              form.paymentMode === "bank" ? form.bankId || null : null,
        bank_name:            form.paymentMode === "cash" ? "Cash" : selectedBank?.bank_name || null,
        payment_source:       paymentSourceMap[form.paymentMode],
        // petty_cash_id intentionally omitted — handled by DB trigger when pay_head = 'Petty Cash'
        expense_type:         form.expenseNature,
        vendor_name:          form.paidToType === "Vendor"   ? form.vendorName   : null,
        emp_code:             form.paidToType === "Employee" ? form.empCode      : null,
        employee_name:        form.paidToType === "Employee" ? form.employeeName : null,
        manual_vendor:        form.manualVendor,
        cost_ops:             form.costHeadBreakup.ops,
        cost_temp:            form.costHeadBreakup.temp,
        cost_recruitment:     form.costHeadBreakup.recruitment,
        cost_projects:        form.costHeadBreakup.projects,
        cost_others:          form.costHeadBreakup.others,
        asset_description:    isAsset ? form.assetDescription : null,
        asset_warranty:       isAsset ? form.assetWarranty    : null,
        asset_stock_status:   isAsset ? form.assetStockStatus : null,
        expense_remarks:      form.remarks,
        // petty_cash flag: DB trigger reads pay_head directly, but keep this for compatibility
        petty_cash:           isPettyCashPayHead,
      };

      let error, savedPayment;
      if (editData?.id) {
        ({ data: savedPayment, error } = await supabase
          .from("payments_made").update(payload).eq("id", editData.id).select().single());
      } else {
        ({ data: savedPayment, error } = await supabase
          .from("payments_made").insert([payload]).select().single());
      }
      if (error) throw error;

      // TDS liability
      if ((parseFloat(form.tdsAmount) || 0) > 0) {
        await supabase.from("statutory_liabilities").insert([{
          source_type:    "expense",
          source_id:      savedPayment.id,
          statutory_type: "TDS",
          entity:         form.entity,
          amount:         parseFloat(form.tdsAmount),
          status:         "pending",
        }]);
      }

      setSaved(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
        setForm(DEFAULT_FORM);
        setSaved(false);
        setSelectedInvoice(null);
        setInvoiceSearch("");
      }, 1000);
    } catch (err) {
      alert("Error saving: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[99999]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-t-2xl text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl"><Receipt className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">
                    {editData ? "Edit" : "Add"} Non-Salary Expense / Payout
                  </h3>
                  <p className="text-orange-100 text-xs">Fields marked * are required</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Petty Cash quick-link button */}
                <button
                  onClick={() => window.location.href = "/?tab=petty-cash"}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-medium transition"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Petty Cash</span>
                </button>
                <button
                  onClick={() => setViewModalOpen(true)} type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition border border-white/30"
                >
                  <Eye className="w-4 h-4" /><span>View Data</span>
                </button>
                <button onClick={onClose} type="button" className="p-2 rounded-xl hover:bg-white/20 transition">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

              {/* ══ SECTION 1 — HEADER INFO ══ */}
              <section>
                <SectionTitle color="orange" label="Header Information" />
                <div className="bg-gray-50 rounded-xl p-4 divide-y divide-gray-100">

                  {/* Expense Nature */}
                  <FieldRow label="Expense Nature" required hint="Internal = Verto expenses, Client = billable/client linked">
                    <div className="flex gap-3 flex-wrap">
                      {["Internal", "Client"].map((opt) => (
                        <TabBtn key={opt} active={form.expenseNature === opt} color="orange"
                          onClick={() => { setField("expenseNature", opt); setField("isBillable", opt === "Client"); }}>
                          {opt}
                        </TabBtn>
                      ))}
                      {form.expenseNature === "Client" && (
                        <div className="relative flex-1 min-w-[200px]">
                          <input type="text" placeholder="Type client name..."
                            value={form.clientName}
                            onChange={(e) => { setField("clientName", e.target.value); setShowClientDropdown(true); }}
                            onFocus={() => setShowClientDropdown(true)}
                            onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                            className="w-full border border-gray-800 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-black"
                          />
                          {showClientDropdown && form.clientName.length > 0 && (
                            <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                              {clients
                                .filter((c) => c.client_name.toLowerCase().includes(form.clientName.toLowerCase()))
                                .map((c) => (
                                  <button key={c.id} type="button"
                                    onClick={() => { setField("clientName", c.client_name); setShowClientDropdown(false); }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 text-sm border-b border-gray-100 last:border-0 text-black">
                                    {c.client_name}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FieldRow>

                  {/* Billable toggle */}
                  {form.expenseNature === "Client" && (
                    <FieldRow label="Billable?">
                      <div className="flex gap-3 pt-1">
                        <TabBtn active={form.isBillable}  color="emerald" onClick={() => setField("isBillable", true)}>Billable</TabBtn>
                        <TabBtn active={!form.isBillable} color="slate"   onClick={() => setField("isBillable", false)}>Non Billable</TabBtn>
                      </div>
                    </FieldRow>
                  )}

                  {/* Link Invoice */}
                  {form.isBillable && form.expenseNature === "Client" && (
                    <FieldRow label="Link Invoice" required error={errors.invoiceId}
                      hint="Invoice this expense is billed against" highlight>
                      {invoice ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="font-semibold text-gray-900 text-sm">{invoice.invoice_number || invoice.id}</p>
                          <p className="text-xs text-gray-500">{invoice.client_name} — auto-linked</p>
                        </div>
                      ) : selectedInvoice ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{selectedInvoice.invoice_number}</p>
                            <p className="text-xs text-gray-500">
                              {selectedInvoice.client_name} • Outstanding: ₹{Number(selectedInvoice.outstanding || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <button onClick={() => { setSelectedInvoice(null); setInvoiceSearch(""); }}
                            className="text-xs text-rose-500 hover:text-rose-700 ml-3">Change</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input type="text" placeholder="Search invoice number..."
                            value={invoiceSearch}
                            onChange={(e) => { setInvoiceSearch(e.target.value); setSelectedInvoice(null); }}
                            className={`w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.invoiceId ? "border-red-400" : "border-gray-200"}`}
                          />
                          {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
                          {invoiceResults.length > 0 && (
                            <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
                              {invoiceResults.map((inv) => (
                                <button key={inv.id} type="button"
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setInvoiceSearch(inv.invoice_number);
                                    setInvoiceResults([]);
                                    setField("clientName", inv.client_name || "");
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-orange-50 text-sm border-b border-gray-100 last:border-0">
                                  <div className="flex justify-between">
                                    <div>
                                      <p className="font-semibold text-gray-900">{inv.invoice_number}</p>
                                      <p className="text-xs text-gray-500">{inv.client_name}</p>
                                    </div>
                                    <p className="text-xs text-emerald-600 font-semibold">
                                      ₹{Number(inv.outstanding || 0).toLocaleString("en-IN")}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </FieldRow>
                  )}

                  {/* Entity */}
                  <FieldRow label="Entity" required error={errors.entity}>
                    <SelectField value={form.entity} onChange={(v) => setField("entity", v)}
                      options={entities.map((e) => ({ value: e.entity_name, label: e.entity_name }))}
                      placeholder="Select entity..." error={errors.entity} />
                  </FieldRow>

                  {/* Paid To */}
                  <FieldRow label="Paid To / Vendor / Emp" hint="Who received this payment">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <TabBtn active={form.paidToType === "Vendor"}   color="orange" onClick={() => setField("paidToType", "Vendor")}>
                          <Building2 className="w-3.5 h-3.5 inline mr-1" />Vendor
                        </TabBtn>
                        <TabBtn active={form.paidToType === "Employee"} color="blue"   onClick={() => setField("paidToType", "Employee")}>
                          <User className="w-3.5 h-3.5 inline mr-1" />Employee
                        </TabBtn>
                      </div>

                      {form.paidToType === "Vendor" && (
                        <div className="space-y-2">
                          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                            <input type="checkbox" checked={form.manualVendor}
                              onChange={(e) => setField("manualVendor", e.target.checked)} className="rounded" />
                            Manual entry (vendor not in master)
                          </label>
                          <InputField value={form.vendorName} onChange={(v) => setField("vendorName", v)}
                            placeholder="Type or select vendor name..." />
                          {!form.manualVendor && form.vendorName.length > 0 && vendors.length > 0 && (
                            <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
                              {vendors
                                .filter((v) => v.vendor_name?.toLowerCase().includes(form.vendorName.toLowerCase()))
                                .map((v) => (
                                  <button key={v.id} type="button"
                                    onClick={() => setField("vendorName", v.vendor_name)}
                                    className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm border-b border-gray-50 last:border-0">
                                    {v.vendor_name}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      {form.paidToType === "Employee" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Emp Code</label>
                            <div className="relative">
                              <InputField value={form.empCode}
                                onChange={(v) => {
                                  setField("empCode", v);
                                  const match = employees.find((e) => e.emp_code?.toLowerCase() === v.toLowerCase());
                                  if (match) setField("employeeName", match.name);
                                }}
                                placeholder="EMP001..." />
                              {form.empCode.length > 0 && (
                                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                                  {employees
                                    .filter((e) => e.emp_code?.toLowerCase().includes(form.empCode.toLowerCase()))
                                    .map((e) => (
                                      <button key={e.id} type="button"
                                        onClick={() => { setField("empCode", e.emp_code); setField("employeeName", e.name); }}
                                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
                                        <span className="font-mono font-bold text-blue-700">{e.emp_code}</span> — {e.name}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Employee Name</label>
                            <InputField value={form.employeeName} onChange={(v) => setField("employeeName", v)}
                              placeholder="Auto-filled from code..."
                              readOnly={!!form.empCode && employees.some((e) => e.emp_code === form.empCode)} />
                          </div>
                        </div>
                      )}
                    </div>
                  </FieldRow>

                  {/* Department */}
                  <FieldRow label="Department" required error={errors.department} highlight>
                    <SelectField value={form.department} onChange={(v) => setField("department", v)}
                      options={DEPARTMENTS} placeholder="Select department..." error={errors.department} />
                  </FieldRow>

                  {/* Pay Head */}
                  <FieldRow label="Pay Head" required error={errors.payHead} highlight>
                    <SelectField value={form.payHead} onChange={(v) => setField("payHead", v)}
                      options={PAY_HEADS} placeholder="Select pay head..." error={errors.payHead} />
                  </FieldRow>

                  {/* Petty Cash pay head info banner */}
                  {isPettyCashPayHead && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2.5 mt-1"
                    >
                      <Wallet className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-violet-700 font-medium leading-relaxed">
                        <strong>Petty Cash Pay Head:</strong> This expense amount will be automatically added to the Petty Cash ledger via a DB trigger. Manage petty cash history &amp; top-ups from the{" "}
                        <button
                          type="button"
                          onClick={() => window.open("/petty-cash", "_blank")}
                          className="underline hover:text-violet-900"
                        >
                          Petty Cash page ↗
                        </button>
                      </p>
                    </motion.div>
                  )}
                </div>
              </section>

              {/* ══ SECTION 2 — PAYMENT DETAILS ══ */}
              <section>
                <SectionTitle color="blue" label="Payment Details" />
                <div className="bg-gray-50 rounded-xl p-4 divide-y divide-gray-100">

                  <FieldRow label="Payment Description">
                    <textarea value={form.paymentDescription}
                      onChange={(e) => setField("paymentDescription", e.target.value)}
                      placeholder="Describe the expense..." rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-none"
                    />
                  </FieldRow>

                  <FieldRow label="Month of Expense" required error={errors.monthOfExpense}>
                    <InputField type="month" value={form.monthOfExpense}
                      onChange={(v) => setField("monthOfExpense", v)} error={errors.monthOfExpense} />
                  </FieldRow>

                  <FieldRow label="Due / TDS / Transfer" required error={errors.dueAmount}>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Due Amount *",  key: "dueAmount",      readOnly: false },
                        { label: "TDS Amount",    key: "tdsAmount",      readOnly: false },
                        { label: "Transfer Amt",  key: "transferAmount", readOnly: true, style: "border-emerald-200 bg-emerald-50 font-semibold" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
                            <input type="number" value={form[f.key]}
                              onChange={(e) => !f.readOnly && setField(f.key, e.target.value)}
                              readOnly={f.readOnly} placeholder="0"
                             className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-400
                                ${f.readOnly
                                  ? "cursor-not-allowed " + (f.style || "bg-gray-50")
                                  : errors.dueAmount && f.key === "dueAmount"
                                  ? "border-red-400 bg-red-50"
                                  : "border-gray-200 bg-white"}`}
                            />
                          </div>
                          {f.key === "transferAmount" && (
                            <p className="text-xs text-gray-400 mt-0.5">= Due − TDS (auto)</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </FieldRow>

                  <FieldRow label="Date of Pay" required error={errors.dateOfPay}>
                    <InputField type="date" value={form.dateOfPay}
                      onChange={(v) => setField("dateOfPay", v)} error={errors.dateOfPay} />
                  </FieldRow>

                  {/* ── Payment Mode: Bank or Cash only ── */}
                  <FieldRow label="Payment Mode" required error={errors.bankId}>
                    <div className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { label: "Bank Transfer", value: "bank",  color: "blue"   },
                          { label: "Cash",          value: "cash",  color: "orange" },
                        ].map((opt) => (
                          <TabBtn key={opt.value} active={form.paymentMode === opt.value} color={opt.color}
                            onClick={() => setField("paymentMode", opt.value)}>
                            {opt.label}
                          </TabBtn>
                        ))}
                      </div>

                      {/* Bank */}
                      {form.paymentMode === "bank" && (
                        <SelectField value={form.bankId} onChange={(v) => setField("bankId", v)}
                          options={banks.map((b) => ({ value: b.id, label: `${b.bank_name} — ${b.account_number}` }))}
                          placeholder="Select bank account..." error={errors.bankId} />
                      )}

                      {/* Cash */}
                      {form.paymentMode === "cash" && (
                        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
                          💵 Cash Payment — no bank entry will be created
                        </div>
                      )}
                    </div>
                  </FieldRow>
                </div>
              </section>

              {/* ══ SECTION 3 — COST HEAD ══ */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle color="purple" label="Cost Head Break Up" inline />
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    costTotal === 100 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : costTotal > 100 ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                    Total: {costTotal}% {costTotal === 100 ? "✓" : `(need ${100 - costTotal}% more)`}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="grid grid-cols-5 gap-3">
                    {COST_HEADS.map((head) => (
                      <div key={head}>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                          {COST_HEAD_LABELS[head]}
                        </label>
                        <div className="relative">
                          <input type="number" min="0" max="100"
                            value={form.costHeadBreakup[head]}
                            onChange={(e) => setCostHead(head, e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2.5 pr-7 text-sm text-center font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400
                              ${errors.costHead ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                          />
                          <span className="absolute right-2.5 top-2.5 text-gray-500 font-medium text-xs">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                    {COST_HEADS.map((head, i) => {
                      const colors = ["bg-blue-400","bg-emerald-400","bg-orange-400","bg-purple-400","bg-gray-400"];
                      const pct = form.costHeadBreakup[head];
                      return pct > 0
                        ? <div key={head} className={`${colors[i]} transition-all duration-300`}
                            style={{ width: `${Math.min(pct, 100)}%` }} title={`${COST_HEAD_LABELS[head]}: ${pct}%`} />
                        : null;
                    })}
                  </div>
                  {errors.costHead && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errors.costHead}
                    </p>
                  )}
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {[
                      { label: "Ops 100%",     fn: () => setForm((p) => ({ ...p, costHeadBreakup: { ops:100, temp:0, recruitment:0, projects:0, others:0 } })) },
                      { label: "Split equally", fn: () => { const e = Math.floor(100/5); setForm((p) => ({ ...p, costHeadBreakup: { ops:e, temp:e, recruitment:e, projects:e, others:100-e*4 } })); } },
                      { label: "Reset",         fn: () => setForm((p) => ({ ...p, costHeadBreakup: { ops:0, temp:0, recruitment:0, projects:0, others:0 } })) },
                    ].map((b) => (
                      <button key={b.label} type="button" onClick={b.fn}
                        className="text-xs text-orange-600 hover:text-orange-800 underline">{b.label}</button>
                    ))}
                  </div>
                </div>
              </section>

              {/* ══ SECTION 4 — ASSET DETAILS ══ */}
              <AnimatePresence>
                {isAsset && (
                  <motion.section
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <SectionTitle color="indigo" label="Asset Details" badge="Asset Purchase only" />
                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 divide-y divide-indigo-100">
                      <FieldRow label="Asset Description + Warranty">
                        <InputField value={form.assetDescription} onChange={(v) => setField("assetDescription", v)}
                          placeholder="e.g. Dell Laptop 16GB, warranty 1 year expires Dec 2026..." />
                      </FieldRow>
                      <FieldRow label="Asset Warranty Period">
                        <InputField value={form.assetWarranty} onChange={(v) => setField("assetWarranty", v)}
                          placeholder="e.g. 2 years, expires Jan 2028..." />
                      </FieldRow>
                      <FieldRow label="Current Stock Status">
                        <div className="flex gap-2 flex-wrap">
                          {ASSET_STOCK_STATUS.map((s) => (
                            <TabBtn key={s} active={form.assetStockStatus === s} color="blue"
                              onClick={() => setField("assetStockStatus", s)}>{s}</TabBtn>
                          ))}
                        </div>
                      </FieldRow>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* ══ SECTION 5 — CC BILL NOTE ══ */}
              <AnimatePresence>
                {isCCBill && (
                  <motion.section
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                      <p className="text-xs text-sky-700 font-medium">
                        💳 <strong>CC Bill:</strong> Ensure Month of Expense, Payment Amount, Description,
                        Date of Pay and Bank are all filled — these represent the credit card statement payment.
                      </p>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* ══ SECTION 6 — REMARKS ══ */}
              <section>
                <SectionTitle color="gray" label="Remarks" />
                <textarea value={form.remarks} onChange={(e) => setField("remarks", e.target.value)}
                  placeholder="Any additional notes..." rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 resize-none"
                />
              </section>

              {/* Billable banner */}
              {form.isBillable && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <p className="text-xs text-indigo-700 font-medium">
                    ✅ Billable Expense: ₹{form.transferAmount || "0"} will be added to invoice outstanding — client owes this amount.
                  </p>
                </div>
              )}

              {/* Payment source summary banner */}
              <div className={`border rounded-xl p-3 text-xs font-medium
                ${form.paymentMode === "bank"
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                {form.paymentMode === "bank" && "🏦 Bank Transfer → bank_entries (debit) will be auto-created by trigger"}
                {form.paymentMode === "cash" && "💵 Cash → only software_entries will be created (no bank entry)"}
              </div>
            </div>
            {/* end body */}

            {/* ── Footer ── */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
              <div className="text-xs text-gray-500">
                {costTotal === 100
                  ? <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Cost head complete</span>
                  : <span className="text-amber-600">⚠ Cost head: {costTotal}% of 100%</span>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={loading || saved}
                  className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 min-w-[140px] justify-center
                    ${saved ? "bg-emerald-500 text-white" : "bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60"}`}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  : saved   ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                  :           <><Plus className="w-4 h-4" /> {editData ? "Update" : "Save"} Expense</>}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <ExpenseViewModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} />
    </>,
    document.body
  );
};

// ── Helper ──
const SectionTitle = ({ color, label, badge, inline }) => {
  const colors = {
    orange: "bg-orange-500", blue: "bg-blue-500", purple: "bg-purple-500",
    indigo: "bg-indigo-500", gray: "bg-gray-400",
  };
  if (inline) return (
    <div className="flex items-center gap-2">
      <div className={`w-1 h-5 ${colors[color]} rounded-full`} />
      <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">{label}</h4>
    </div>
  );
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-1 h-5 ${colors[color] || "bg-gray-400"} rounded-full`} />
      <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">{label}</h4>
      {badge && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
  );
};

export default AddExpenseDetailsModal;