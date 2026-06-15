import React, { useState, useEffect, useRef } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, Wallet, AlertCircle, ChevronDown,
  CheckCircle2, Loader2, X, RefreshCw, TrendingUp, TrendingDown,
  History, Search,
} from "lucide-react";
import PettyCashHistoryModal from "./Pettycashhistorymodal.jsx";
import { usePerms } from "../context/PermissionsContext";

// ─── MASTER DATA ─────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  "Common","OS","Temp","Rec","BD","Accts","HR","Admin","IT","Legal","Projects","Others",
];

const COST_HEADS  = ["OS","temp","recruitment","projects","others"];
const COST_LABELS = { ops:"OS", temp:"Temp", recruitment:"Rec", projects:"Projects", others:"Others" };

const DEFAULT_EXPENSE = {
  entry_date: "",
  amount: "",
  header: "",
  department: "",
  remarks: "",
  costHeadBreakup: { ops:0, temp:0, recruitment:0, projects:0, others:0 },
};

const DEFAULT_CASH_IN = {
  entry_date: "",
  amount: "",
  remarks: "",
};

// ─── SUB COMPONENTS ──────────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Field = ({ children, error }) => (
  <div>
    {children}
    {error && (
      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />{error}
      </p>
    )}
  </div>
);

const inputCls = (error) =>
  `w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 transition placeholder:text-gray-400
  ${error ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`;

const SelectInput = ({ value, onChange, options, placeholder, error }) => (
  <div className="relative">
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`${inputCls(error)} appearance-none pr-8`}>
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

// ─── SEARCHABLE HEADER DROPDOWN ───────────────────────────────────────────────
const HeaderDropdown = ({ value, onChange, headers, setHeaders, error }) => {
  const [search, setSearch]   = useState(value || "");
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const ref                   = useRef(null);

  // Sync display when value changes externally (e.g. form reset)
  useEffect(() => { setSearch(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = headers.filter((h) =>
    h.header_name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = headers.some(
    (h) => h.header_name.toLowerCase() === search.toLowerCase()
  );

  const select = (name) => {
    onChange(name);
    setSearch(name);
    setOpen(false);
  };

  const addHeader = async () => {
    if (!search.trim() || saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("petty_cash_headers")
        .insert([{ header_name: search.trim() }])
        .select()
        .single();
      if (error) throw error;
      setHeaders((prev) => [...prev, data].sort((a,b) => a.header_name.localeCompare(b.header_name)));
      select(data.header_name);
    } catch (err) {
      alert("Error adding header: " + err.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search or add header..."
          className={`${inputCls(error)} pl-8`}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto"
          >
            {filtered.length === 0 && search.trim() === "" && (
              <p className="text-xs text-gray-400 px-3 py-3">Type to search headers...</p>
            )}

            {filtered.map((h) => (
              <button key={h.id} type="button"
                onClick={() => select(h.header_name)}
                className={`w-full text-left px-3 py-2.5 hover:bg-violet-50 text-sm border-b border-gray-50 last:border-0 transition
                  ${value === h.header_name ? "bg-violet-50 text-violet-700 font-semibold" : "text-gray-800"}`}>
                {h.header_name}
              </button>
            ))}

            {/* Add new header option */}
            {!exactMatch && search.trim() !== "" && (
              <button type="button" onClick={addHeader} disabled={saving}
                className="w-full text-left px-3 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-semibold border-t border-violet-100 flex items-center gap-2 transition">
                {saving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Adding...</>
                  : <><Plus className="w-3.5 h-3.5" />Add "{search.trim()}" as new header</>}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, accentColor, icon: Icon, children, footer }) => {
  if (!open) return null;
  const accents = {
    red:    "from-red-600 to-orange-600",
    green:  "from-emerald-600 to-teal-600",
    violet: "from-violet-600 to-purple-600",
  };
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity:0, scale:0.96, y:12 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.96, y:12 }}
        transition={{ duration:0.18 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 bg-gradient-to-r ${accents[accentColor]} rounded-t-2xl text-white flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl"><Icon className="w-4 h-4" /></div>
            <h3 className="font-bold text-base">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── COST HEAD INPUT ─────────────────────────────────────────────────────────
const CostHeadSection = ({ breakup, onChange, error }) => {
  const total = Object.values(breakup).reduce((a, b) => a + b, 0);
  const setCost = (head, val) => {
    const n = Math.min(Math.max(parseInt(val) || 0, 0), 100);
    onChange({ ...breakup, [head]: n });
  };
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cost Head Break Up</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border
          ${total===100 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : total>100  ? "bg-red-100 text-red-700 border-red-200"
          : "bg-amber-100 text-amber-700 border-amber-200"}`}>
          {total}% {total===100 ? "✓" : `(need ${100-total}%)`}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {COST_HEADS.map((h) => (
          <div key={h}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 text-center">{COST_LABELS[h]}</p>
            <div className="relative">
              <input type="number" min="0" max="100" value={breakup[h]}
                onChange={(e) => setCost(h, e.target.value)}
                className={`w-full border rounded-lg py-1.5 pr-5 text-xs text-center font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400
                  ${error ? "border-red-300" : "border-gray-200"}`} />
              <span className="absolute right-1.5 top-1.5 text-gray-400 text-[10px]">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
        {COST_HEADS.map((h, i) => {
          const colors = ["bg-blue-400","bg-emerald-400","bg-orange-400","bg-purple-400","bg-gray-400"];
          const p = breakup[h];
          return p > 0 ? <div key={h} className={`${colors[i]} transition-all`} style={{ width:`${Math.min(p,100)}%` }} /> : null;
        })}
      </div>
      <div className="flex gap-3 mt-2">
        {[
          { label:"OS 100%", fn: () => onChange({ ops:100, temp:0, recruitment:0, projects:0, others:0 }) },
          { label:"Split",   fn: () => { const e=Math.floor(100/5); onChange({ ops:e,temp:e,recruitment:e,projects:e,others:100-e*4 }); } },
          { label:"Reset",   fn: () => onChange({ ops:0, temp:0, recruitment:0, projects:0, others:0 }) },
        ].map((b) => (
          <button key={b.label} type="button" onClick={b.fn}
            className="text-[11px] text-violet-600 hover:text-violet-800 underline">{b.label}</button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const PettyCashPage = () => {
  const { isIntern } = usePerms?.() || {};
  const [pettyCashes, setPettyCashes]       = useState([]);
  const [selectedBox, setSelectedBox]       = useState(null);
  const [entries, setEntries]               = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // DB-driven headers
  const [headers, setHeaders]               = useState([]);

  const [expenseOpen, setExpenseOpen]       = useState(false);
  const [cashInOpen, setCashInOpen]         = useState(false);
  const [historyOpen, setHistoryOpen]       = useState(false);

  const [expenseForm, setExpenseForm]       = useState(DEFAULT_EXPENSE);
  const [cashInForm, setCashInForm]         = useState(DEFAULT_CASH_IN);
  const [expenseErrors, setExpenseErrors]   = useState({});
  const [cashInErrors, setCashInErrors]     = useState({});
  const [saving, setSaving]                 = useState(false);
  const [savedMsg, setSavedMsg]             = useState("");

  // ── Load petty cash boxes ──
  const loadBoxes = async () => {
    const { data } = await supabase
      .from("petty_cash_master")
      .select("id,cash_name,opening_balance,current_balance")
      .order("cash_name");
    setPettyCashes(data || []);
    if (!selectedBox && data?.length) setSelectedBox(data[0]);
  };

  // ── Load DB headers ──
  const loadHeaders = async () => {
    const { data } = await supabase
      .from("petty_cash_headers")
      .select("*")
      .order("header_name");
    setHeaders(data || []);
  };

  useEffect(() => {
    loadBoxes();
    loadHeaders();
  }, []);

  // ── Load entries for selected box ──
  const loadEntries = async () => {
    if (!selectedBox) return;
    setLoadingEntries(true);
    const { data } = await supabase
      .from("petty_cash_entries")
      .select("*")
      .eq("petty_cash_id", selectedBox.id)
      .order("entry_date", { ascending: false });
    setEntries(data || []);
    setLoadingEntries(false);
  };

  useEffect(() => { loadEntries(); }, [selectedBox]);

  // ── Refresh box balance after save ──
  const refreshBox = async () => {
    const { data } = await supabase
      .from("petty_cash_master")
      .select("id,cash_name,opening_balance,current_balance")
      .order("cash_name");
    setPettyCashes(data || []);
    const updated = data?.find((b) => b.id === selectedBox?.id);
    if (updated) setSelectedBox(updated);
  };

  // ── EXPENSE: validate + save ──
  const validateExpense = () => {
    const e = {};
    if (!expenseForm.entry_date) e.entry_date = "Date required";
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) e.amount = "Amount must be > 0";
    if (!expenseForm.header) e.header = "Header required";
    if (!expenseForm.department) e.department = "Department required";
    const total = Object.values(expenseForm.costHeadBreakup).reduce((a,b)=>a+b,0);
    if (Math.round(total) !== 100) e.costHead = `Total must be 100% (currently ${total}%)`;
    setExpenseErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveExpense = async () => {
    if (isIntern) return;
    if (!validateExpense() || !selectedBox) return;
    setSaving(true);
    try {
      const amt = parseFloat(expenseForm.amount);

      const { error: entryErr } = await supabase.from("petty_cash_entries").insert([{
        petty_cash_id:    selectedBox.id,
        payment_made_id:  null,
        entry_date:       expenseForm.entry_date,
        amount:           amt,
        type:             "debit",
        entry_mode:       "EXPENSE",
        header:           expenseForm.header,
        department:       expenseForm.department,
        cost_ops:         expenseForm.costHeadBreakup.ops,
        cost_temp:        expenseForm.costHeadBreakup.temp,
        cost_recruitment: expenseForm.costHeadBreakup.recruitment,
        cost_projects:    expenseForm.costHeadBreakup.projects,
        cost_others:      expenseForm.costHeadBreakup.others,
        remarks:          expenseForm.remarks,
      }]);
      if (entryErr) throw entryErr;

      const { error: balErr } = await supabase
        .from("petty_cash_master")
        .update({ current_balance: selectedBox.current_balance - amt })
        .eq("id", selectedBox.id);
      if (balErr) throw balErr;

      await refreshBox();
      await loadEntries();
      setExpenseOpen(false);
      setExpenseForm(DEFAULT_EXPENSE);
      setExpenseErrors({});
      setSavedMsg("Expense added");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setSaving(false); }
  };

  // ── CASH IN: validate + save ──
  const validateCashIn = () => {
    const e = {};
    if (!cashInForm.entry_date) e.entry_date = "Date required";
    if (!cashInForm.amount || parseFloat(cashInForm.amount) <= 0) e.amount = "Amount must be > 0";
    setCashInErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveCashIn = async () => {
    if (isIntern) return;
    if (!validateCashIn() || !selectedBox) return;
    setSaving(true);
    try {
      const amt = parseFloat(cashInForm.amount);

      const { error: entryErr } = await supabase.from("petty_cash_entries").insert([{
        petty_cash_id:   selectedBox.id,
        payment_made_id: null,
        entry_date:      cashInForm.entry_date,
        amount:          amt,
        type:            "credit",
        entry_mode:      "CASH_RECEIVED",
        header:          "Cash Received",
        remarks:         cashInForm.remarks,
      }]);
      if (entryErr) throw entryErr;

      const { error: balErr } = await supabase
        .from("petty_cash_master")
        .update({ current_balance: selectedBox.current_balance + amt })
        .eq("id", selectedBox.id);
      if (balErr) throw balErr;

      await refreshBox();
      await loadEntries();
      setCashInOpen(false);
      setCashInForm(DEFAULT_CASH_IN);
      setCashInErrors({});
      setSavedMsg("Cash received added");
      setTimeout(() => setSavedMsg(""), 2500);
    } catch (err) {
      alert("Error: " + err.message);
    } finally { setSaving(false); }
  };

  const costDisplay = (row) => {
    const parts = [];
    if (row.cost_ops)         parts.push(`OS:${row.cost_ops}%`);
    if (row.cost_temp)        parts.push(`Tmp:${row.cost_temp}%`);
    if (row.cost_recruitment) parts.push(`Rec:${row.cost_recruitment}%`);
    if (row.cost_projects)    parts.push(`Prj:${row.cost_projects}%`);
    if (row.cost_others)      parts.push(`Oth:${row.cost_others}%`);
    return parts.join(" / ") || "—";
  };

  const totalDebits  = entries.filter(e => e.type==="debit").reduce((s,e)=>s+Number(e.amount||0),0);
  const totalCredits = entries.filter(e => e.type==="credit").reduce((s,e)=>s+Number(e.amount||0),0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page Header ── */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Petty Cash</h1>
              <p className="text-violet-200 text-xs">Track cash expenses and receipts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedMsg && (
              <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />{savedMsg}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Cash Box Selector ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pettyCashes.map((box) => (
            <button key={box.id} type="button"
              onClick={() => setSelectedBox(box)}
              className={`rounded-xl border p-4 text-left transition
                ${selectedBox?.id === box.id
                  ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
                  : "border-gray-200 bg-white hover:border-violet-200"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${selectedBox?.id===box.id ? "text-violet-600" : "text-gray-500"}`}>
                {box.cash_name}
              </p>
              <p className={`text-xl font-bold ${Number(box.current_balance) < 0 ? "text-red-600" : "text-gray-900"}`}>
                ₹{Number(box.current_balance||0).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Opening: ₹{Number(box.opening_balance||0).toLocaleString("en-IN")}
              </p>
            </button>
          ))}
        </div>

        {/* ── Summary Strip ── */}
        {selectedBox && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Received</p>
                <p className="text-lg font-bold text-emerald-600">₹{totalCredits.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="w-4 h-4 text-red-500" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className="text-lg font-bold text-red-500">₹{totalDebits.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-lg"><Wallet className="w-4 h-4 text-violet-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Current Balance</p>
                <p className={`text-lg font-bold ${Number(selectedBox.current_balance)<0 ? "text-red-600" : "text-violet-600"}`}>
                  ₹{Number(selectedBox.current_balance||0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Table Section ── */}
        {selectedBox && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-wrap gap-2">
              <h2 className="font-semibold text-gray-800 text-sm">
                {selectedBox.cash_name} — Ledger
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={loadEntries}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
                {/* View History */}
                <button onClick={() => setHistoryOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm font-semibold transition">
                  <History className="w-4 h-4" />View History
                </button>
                {!isIntern && (
                  <button
                    onClick={() => { setCashInForm(DEFAULT_CASH_IN); setCashInErrors({}); setCashInOpen(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition">
                    <Plus className="w-4 h-4" />Add Cash Received (+)
                  </button>
                )}
                {!isIntern && (
                  <button
                    onClick={() => { setExpenseForm(DEFAULT_EXPENSE); setExpenseErrors({}); setExpenseOpen(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition">
                    <Minus className="w-4 h-4" />Add Expense (−)
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[80px]">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[110px]">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[140px]">Header</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[100px]">Department</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost Break Up</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEntries ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...
                    </td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No entries yet</p>
                      <p className="text-xs mt-1">Add an expense or cash received above</p>
                    </td></tr>
                  ) : entries.map((row, i) => (
                    <tr key={row.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition ${i%2===0 ? "" : "bg-gray-50/40"}`}>
                      <td className="px-4 py-3 text-gray-700 text-xs font-mono">
                        {row.entry_date ? new Date(row.entry_date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
                          ${row.type==="credit" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {row.type==="credit" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {row.type==="credit" ? "In" : "Out"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={row.type==="credit" ? "text-emerald-600" : "text-red-500"}>
                          {row.type==="credit" ? "+" : "−"}₹{Number(row.amount||0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{row.header || "—"}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs">{row.department || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-[11px] font-mono">{row.type==="debit" ? costDisplay(row) : "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{row.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                {entries.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Total</td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-[11px] text-emerald-600 font-bold">+₹{totalCredits.toLocaleString("en-IN")}</div>
                        <div className="text-[11px] text-red-500 font-bold">−₹{totalDebits.toLocaleString("en-IN")}</div>
                      </td>
                      <td colSpan={4} className="px-4 py-3 text-xs text-gray-500">
                        Balance: <span className={`font-bold ${Number(selectedBox.current_balance)<0?"text-red-600":"text-violet-700"}`}>
                          ₹{Number(selectedBox.current_balance||0).toLocaleString("en-IN")}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══ ADD EXPENSE MODAL ══ */}
      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)}
        title="Add Petty Cash Expense" accentColor="red" icon={Minus}
        footer={<>
          <button onClick={() => setExpenseOpen(false)}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-100 transition">
            Cancel
          </button>
          <button onClick={saveExpense} disabled={saving || isIntern}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-60 ${
              isIntern ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white"
            }`}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />{isIntern ? "View Only" : "Add Expense"}</>}
          </button>
        </>}
      >
        <div className="space-y-4">
          {selectedBox && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-xs text-violet-600 font-medium">Cash Box</p>
                <p className="font-bold text-gray-800 text-sm">{selectedBox.cash_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Available Balance</p>
                <p className={`font-bold text-lg ${Number(selectedBox.current_balance)<0 ? "text-red-600":"text-emerald-600"}`}>
                  ₹{Number(selectedBox.current_balance||0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field error={expenseErrors.entry_date}>
              <Label required>Date</Label>
              <input type="date" value={expenseForm.entry_date}
                onChange={(e) => setExpenseForm((p) => ({ ...p, entry_date:e.target.value }))}
                className={inputCls(expenseErrors.entry_date)} />
            </Field>
            <Field error={expenseErrors.amount}>
              <Label required>Amount (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                <input type="number" value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, amount:e.target.value }))}
                  placeholder="0"
                  className={`${inputCls(expenseErrors.amount)} pl-7`} />
              </div>
              {selectedBox && expenseForm.amount && Number(expenseForm.amount) > Number(selectedBox.current_balance) && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />Exceeds available balance
                </p>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field error={expenseErrors.header}>
              <Label required>Header</Label>
              {/* DB-driven searchable header dropdown */}
              <HeaderDropdown
                value={expenseForm.header}
                onChange={(v) => setExpenseForm((p) => ({ ...p, header: v }))}
                headers={headers}
                setHeaders={setHeaders}
                error={expenseErrors.header}
              />
            </Field>
            <Field error={expenseErrors.department}>
              <Label required>Department</Label>
              <SelectInput value={expenseForm.department}
                onChange={(v) => setExpenseForm((p) => ({ ...p, department:v }))}
                options={DEPARTMENTS} placeholder="Select dept..."
                error={expenseErrors.department} />
            </Field>
          </div>

          <CostHeadSection
            breakup={expenseForm.costHeadBreakup}
            onChange={(v) => setExpenseForm((p) => ({ ...p, costHeadBreakup:v }))}
            error={expenseErrors.costHead}
          />

          <Field>
            <Label>Remarks</Label>
            <textarea value={expenseForm.remarks}
              onChange={(e) => setExpenseForm((p) => ({ ...p, remarks:e.target.value }))}
              rows={2} placeholder="Optional notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none placeholder:text-gray-400" />
          </Field>
        </div>
      </Modal>

      {/* ══ ADD CASH RECEIVED MODAL ══ */}
      <Modal open={cashInOpen} onClose={() => setCashInOpen(false)}
        title="Add Cash Received" accentColor="green" icon={Plus}
        footer={<>
          <button onClick={() => setCashInOpen(false)}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-100 transition">
            Cancel
          </button>
          <button onClick={saveCashIn} disabled={saving || isIntern}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-60 ${
              isIntern ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />{isIntern ? "View Only" : "Add Cash Received"}</>}
          </button>
        </>}
      >
        <div className="space-y-4">
          {selectedBox && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Topping up</p>
                <p className="font-bold text-gray-800 text-sm">{selectedBox.cash_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Current Balance</p>
                <p className="font-bold text-lg text-emerald-600">
                  ₹{Number(selectedBox.current_balance||0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field error={cashInErrors.entry_date}>
              <Label required>Date</Label>
              <input type="date" value={cashInForm.entry_date}
                onChange={(e) => setCashInForm((p) => ({ ...p, entry_date:e.target.value }))}
                className={inputCls(cashInErrors.entry_date)} />
            </Field>
            <Field error={cashInErrors.amount}>
              <Label required>Amount Received (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                <input type="number" value={cashInForm.amount}
                  onChange={(e) => setCashInForm((p) => ({ ...p, amount:e.target.value }))}
                  placeholder="0"
                  className={`${inputCls(cashInErrors.amount)} pl-7`} />
              </div>
            </Field>
          </div>
          <Field>
            <Label>Remarks / Source</Label>
            <textarea value={cashInForm.remarks}
              onChange={(e) => setCashInForm((p) => ({ ...p, remarks:e.target.value }))}
              rows={2} placeholder="e.g. Cash from accounts team for office expenses..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder:text-gray-400" />
          </Field>
          {cashInForm.amount && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">New balance after this entry:</p>
              <p className="font-bold text-emerald-600 text-lg">
                ₹{(Number(selectedBox?.current_balance||0) + Number(cashInForm.amount||0)).toLocaleString("en-IN")}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ══ HISTORY MODAL ══ */}
      <PettyCashHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        selectedBox={selectedBox}
      />
    </div>
  );
};

export default PettyCashPage;