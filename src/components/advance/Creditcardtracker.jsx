import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, X, Save, Eye,
  CreditCard, TrendingUp, AlertCircle, DollarSign
} from "lucide-react";
import supabase from "../../lib/supabaseClient";
import { usePerms } from "../../context/PermissionsContext";

const PAY_HEADER_OPTIONS = ["Travel", "Fuel", "Entertainment", "Office Supplies", "Food & Dining", "Utilities", "Software", "Advertising", "Medical", "Other"];
const COST_HEAD_OPTIONS = ["Direct Expense", "Indirect Expense", "Capital", "Revenue", "Admin", "Marketing", "Operations", "IT", "Other"];

const emptyCardForm = {
  bank: "",
  card_last4: "",
  issued_to: "",
  billing_cycle_from: "",
  billing_cycle_to: "",
  payment_date: "",
};

const emptyBillForm = {
  card_master_id: "",
  amount: "",
  penalty: "",
  cash_back: "",
  amount_paid: "",
  bill_date: "",        // ← ADDED
};

const emptyDetailForm = {
  date_of_expense: "",
  amount: "",
  pay_header: "",
  details: "",
  cost_head_breakup: "",
  bill_supporting_received: "No",
};

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function GoldStatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl p-5 border border-yellow-700/30 flex items-center gap-4 shadow-sm"
         style={{ background: "linear-gradient(135deg, #1c1200 0%, #2a1f00 100%)" }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
           style={{ background: "linear-gradient(135deg, #b45309, #d97706)" }}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#d97706" }}>{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function CreditCardTracker() {
  const { isIntern } = usePerms?.() || {};
  const [cards, setCards] = useState([]);
  const [bills, setBills] = useState([]);
  const [billDetails, setBillDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  const [banks, setBanks] = useState([]);

  // Card modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [cardForm, setCardForm] = useState(emptyCardForm);

  // Bill modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [billForm, setBillForm] = useState(emptyBillForm);
  const [selectedBillCard, setSelectedBillCard] = useState(null);

  // Searchable card dropdown in bill modal
  const [cardQuery, setCardQuery] = useState("");
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const cardDropdownRef = useRef(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [editDetail, setEditDetail] = useState(null);
  const [detailForm, setDetailForm] = useState(emptyDetailForm);
  const [showDetailFormInline, setShowDetailFormInline] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // ─── Advanced Filters ──────────────────────────────────────────────
  const [advFilters, setAdvFilters] = useState({
    dateFrom: "",
    dateTo: "",
    cardSearch: "",
  });

  useEffect(() => {
    fetchAll();
    fetchBanks();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (cardDropdownRef.current && !cardDropdownRef.current.contains(e.target)) {
        setShowCardDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchBanks() {
    const { data } = await supabase
      .from("bank_master")
      .select("id, bank_name")
      .order("bank_name");
    setBanks(data || []);
  }

  async function fetchAll() {
    setLoading(true);
    const [c, b, d] = await Promise.all([
      supabase.from("credit_card_master").select("*").order("created_at", { ascending: false }),
      supabase.from("credit_card_bills").select("*").order("created_at", { ascending: false }),
      supabase.from("credit_card_bill_details").select("*").order("date_of_expense", { ascending: true }),
    ]);
    setCards(c.data || []);
    setBills(b.data || []);
    setBillDetails(d.data || []);
    setLoading(false);
  }

  // ─── CARD CRUD ──────────────────────────────────────────────────────
  function openAddCard() { setEditCard(null); setCardForm(emptyCardForm); setShowCardModal(true); }
  function openEditCard(c) {
    setEditCard(c);
    setCardForm({ bank: c.bank, card_last4: c.card_last4, issued_to: c.issued_to, billing_cycle_from: c.billing_cycle_from, billing_cycle_to: c.billing_cycle_to, payment_date: c.payment_date });
    setShowCardModal(true);
  }
  async function saveCard() {
    if (isIntern) return;
    if (!cardForm.bank || !cardForm.card_last4) return;
    setSaving(true);
    if (editCard) { await supabase.from("credit_card_master").update(cardForm).eq("id", editCard.id); }
    else { await supabase.from("credit_card_master").insert([cardForm]); }
    setSaving(false); setShowCardModal(false); fetchAll();
  }

  // ─── BILL CRUD ──────────────────────────────────────────────────────
  function openAddBill() {
    setEditBill(null);
    setBillForm({ ...emptyBillForm, card_master_id: cards[0]?.id || "" });
    setSelectedBillCard(cards[0] || null);
    setCardQuery(cards[0] ? `${cards[0].bank} ••••${cards[0].card_last4} — ${cards[0].issued_to}` : "");
    setShowCardDropdown(false);
    setShowBillModal(true);
  }

  function openEditBill(b) {
    setEditBill(b);
    setBillForm({
      card_master_id: b.card_master_id,
      amount: b.amount,
      penalty: b.penalty,
      cash_back: b.cash_back,
      amount_paid: b.amount_paid,
      bill_date: b.bill_date || "",
    });
    const card = cards.find((c) => c.id === b.card_master_id);
    setSelectedBillCard(card || null);
    setCardQuery(card ? `${card.bank} ••••${card.card_last4} — ${card.issued_to}` : "");
    setShowCardDropdown(false);
    setShowBillModal(true);
  }

  async function saveBill() {
    if (isIntern) return;
    if (!billForm.card_master_id) return;
    setSaving(true);
    const amount_payable = Math.max(0, (parseFloat(billForm.amount) || 0) + (parseFloat(billForm.penalty) || 0) - (parseFloat(billForm.cash_back) || 0));
    const payload = { ...billForm, amount_payable };
    if (editBill) { await supabase.from("credit_card_bills").update(payload).eq("id", editBill.id); }
    else { await supabase.from("credit_card_bills").insert([payload]); }
    setSaving(false); setShowBillModal(false); fetchAll();
  }

  // ─── DETAIL CRUD ────────────────────────────────────────────────────
  function openViewDetails(bill) { setViewBill(bill); setEditDetail(null); setDetailForm(emptyDetailForm); setShowDetailFormInline(false); setShowDetailModal(true); }
  function startAddDetail() { setEditDetail(null); setDetailForm(emptyDetailForm); setShowDetailFormInline(true); }
  function startEditDetail(d) {
    setEditDetail(d);
    setDetailForm({ date_of_expense: d.date_of_expense, amount: d.amount, pay_header: d.pay_header, details: d.details, cost_head_breakup: d.cost_head_breakup, bill_supporting_received: d.bill_supporting_received });
    setShowDetailFormInline(true);
  }
  async function saveDetail() {
    if (isIntern) return;
    if (!viewBill) return;
    setSaving(true);
    const payload = { ...detailForm, bill_id: viewBill.id };
    if (editDetail) { await supabase.from("credit_card_bill_details").update(payload).eq("id", editDetail.id); }
    else { await supabase.from("credit_card_bill_details").insert([payload]); }
    setSaving(false); setShowDetailFormInline(false); setEditDetail(null); fetchAll();
  }

  // ─── DELETE ─────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    if (type === "card") await supabase.from("credit_card_master").delete().eq("id", id);
    if (type === "bill") await supabase.from("credit_card_bills").delete().eq("id", id);
    if (type === "detail") await supabase.from("credit_card_bill_details").delete().eq("id", id);
    setDeleteTarget(null); fetchAll();
  }

  // ─── FILTERED BILLS ────────────────────────────────────────────────
  const filteredBills = bills.filter((b) => {
    const card = cards.find((c) => c.id === b.card_master_id);
    
    // Main search bar (bank, name, last4)
    const matchesSearch =
      !search ||
      card?.bank?.toLowerCase().includes(search.toLowerCase()) ||
      card?.issued_to?.toLowerCase().includes(search.toLowerCase()) ||
      card?.card_last4?.includes(search);

    // Advanced card search (number / name)
    const matchesCardSearch =
      !advFilters.cardSearch ||
      card?.card_last4?.includes(advFilters.cardSearch) ||
      card?.issued_to?.toLowerCase().includes(advFilters.cardSearch.toLowerCase()) ||
      card?.bank?.toLowerCase().includes(advFilters.cardSearch.toLowerCase());

    // Date range filter
    const matchesDate =
      (!advFilters.dateFrom || (b.bill_date && b.bill_date >= advFilters.dateFrom)) &&
      (!advFilters.dateTo || (b.bill_date && b.bill_date <= advFilters.dateTo));

    return matchesSearch && matchesCardSearch && matchesDate;
  });

  const totalBilled = bills.reduce((s, b) => s + (parseFloat(b.amount_payable) || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + (parseFloat(b.amount_paid) || 0), 0);
  const totalCashBack = bills.reduce((s, b) => s + (parseFloat(b.cash_back) || 0), 0);

  const goldGrad = "linear-gradient(135deg, #78350f 0%, #b45309 60%, #d97706 100%)";
  const cardBg = "#1c1200";

  const viewDetails = viewBill ? billDetails.filter((d) => d.bill_id === viewBill.id) : [];
  const viewCard = viewBill ? cards.find((c) => c.id === viewBill.card_master_id) : null;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <GoldStatCard label="Total Billed" value={fmt(totalBilled)} icon={CreditCard} />
        <GoldStatCard label="Total Paid" value={fmt(totalPaid)} icon={TrendingUp} />
        <GoldStatCard label="Total Cash Back" value={fmt(totalCashBack)} icon={DollarSign} />
      </div>

      {/* ─── CARD MASTER TABLE ──────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden mb-6 shadow-lg border border-yellow-800/30" style={{ background: cardBg }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: goldGrad }}>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-white" />
            <h3 className="text-white font-bold text-base tracking-wide">Credit Card Master</h3>
          </div>
          {!isIntern && (
            <button onClick={openAddCard}
              className="flex items-center gap-2 px-4 py-2 bg-black/30 hover:bg-black/50 text-white rounded-xl text-sm font-semibold transition-all border border-white/20">
              <Plus className="w-4 h-4" /> Add Card
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#2a1f00" }}>
                {["Bank", "Card Last 4", "Issued To", "Billing Cycle From", "Billing Cycle To", "Payment Date", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#d97706" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-yellow-800/50">No cards added</td></tr>
              ) : cards.map((c) => (
                <tr key={c.id} className="border-b transition-colors" style={{ borderColor: "#2a1f00" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#1a1000"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#d97706" }}>{c.bank}</td>
                  <td className="px-4 py-3 font-mono text-white">••••{c.card_last4}</td>
                  <td className="px-4 py-3 text-gray-300">{c.issued_to}</td>
                  <td className="px-4 py-3 text-gray-400">{c.billing_cycle_from}</td>
                  <td className="px-4 py-3 text-gray-400">{c.billing_cycle_to}</td>
                  <td className="px-4 py-3 text-gray-400">{c.payment_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEditCard(c)} className="p-1.5 rounded-lg transition-colors" style={{ background: "#2a1f00", color: "#d97706" }}><Edit2 className="w-3.5 h-3.5" /></button>
                      {!isIntern && (
                        <button onClick={() => setDeleteTarget({ type: "card", id: c.id })} className="p-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── BILLS TABLE ────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-yellow-800/30" style={{ background: cardBg }}>
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3" style={{ background: goldGrad }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-white" />
            <h3 className="text-white font-bold text-base tracking-wide">Credit Card Bills</h3>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input className="pl-9 pr-4 py-2 text-sm rounded-xl border border-white/20 bg-black/30 text-white placeholder-white/50 focus:outline-none"
                placeholder="Search cards…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {!isIntern && (
              <button onClick={openAddBill}
                className="flex items-center gap-2 px-4 py-2 bg-black/30 hover:bg-black/50 text-white rounded-xl text-sm font-semibold transition-all border border-white/20">
                <Plus className="w-4 h-4" /> Add Bill
              </button>
            )}
          </div>
        </div>

        {/* ─── ADVANCED FILTERS ─────────────────────────────────────── */}
        <div className="px-6 py-3 flex flex-wrap gap-3 items-end border-b border-yellow-800/20" style={{ background: "#1a1000" }}>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#d97706" }}>Date From</label>
            <input type="date" className="px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
              style={{ background: "#2a1f00", border: "1px solid #78350f" }}
              value={advFilters.dateFrom} onChange={(e) => setAdvFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#d97706" }}>Date To</label>
            <input type="date" className="px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
              style={{ background: "#2a1f00", border: "1px solid #78350f" }}
              value={advFilters.dateTo} onChange={(e) => setAdvFilters(f => ({ ...f, dateTo: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#d97706" }}>Search by Card / Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none"
                style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                placeholder="Card no, holder name or bank…"
                value={advFilters.cardSearch}
                onChange={(e) => setAdvFilters(f => ({ ...f, cardSearch: e.target.value }))} />
            </div>
          </div>
          <button onClick={() => setAdvFilters({ dateFrom: "", dateTo: "", cardSearch: "" })}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-yellow-800/40 text-gray-300 hover:text-white transition-colors">
            Clear Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#2a1f00" }}>
                {["Bank", "Card No", "Issued To", "Bill Date", "Billing Cycle", "Amount", "Penalty", "Cash Back", "Amount Payable", "Amount Paid", "View", "Edit/Delete"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#d97706" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-16 text-yellow-800/50">Loading…</td></tr>
              ) : filteredBills.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16 text-yellow-800/50">No bills found</td></tr>
              ) : filteredBills.map((b, i) => {
                const card = cards.find((c) => c.id === b.card_master_id);
                const amtPayable = (parseFloat(b.amount) || 0) + (parseFloat(b.penalty) || 0) - (parseFloat(b.cash_back) || 0);
                return (
                  <motion.tr key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="border-b" style={{ borderColor: "#2a1f00" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#1a1000"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#d97706" }}>{card?.bank || "—"}</td>
                    <td className="px-4 py-3 font-mono text-white">••••{card?.card_last4 || "—"}</td>
                    <td className="px-4 py-3 text-gray-300">{card?.issued_to || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{b.bill_date || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{card?.billing_cycle_from} – {card?.billing_cycle_to}</td>
                    <td className="px-4 py-3 font-mono text-white">{fmt(b.amount)}</td>
                    <td className="px-4 py-3 font-mono text-red-400">{fmt(b.penalty)}</td>
                    <td className="px-4 py-3 font-mono text-green-400">{fmt(b.cash_back)}</td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: "#d97706" }}>{fmt(amtPayable)}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">{fmt(b.amount_paid)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openViewDetails(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: goldGrad, color: "white" }}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditBill(b)} className="p-1.5 rounded-lg transition-colors" style={{ background: "#2a1f00", color: "#d97706" }}><Edit2 className="w-3.5 h-3.5" /></button>
                        {!isIntern && (
                          <button onClick={() => setDeleteTarget({ type: "bill", id: b.id })} className="p-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD/EDIT CARD MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ background: "#1c1200", border: "1px solid #78350f" }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: goldGrad }}>
                <h2 className="text-white font-bold text-lg">{editCard ? "Edit Card" : "Add Credit Card"}</h2>
                <button onClick={() => setShowCardModal(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Bank *</label>
                  <select className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                    value={cardForm.bank} onChange={(e) => setCardForm((f) => ({ ...f, bank: e.target.value }))}>
                    <option value="">Select Bank</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.bank_name}>{b.bank_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Card Last 4 Digits *</label>
                  <input maxLength={4} className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                    value={cardForm.card_last4} onChange={(e) => setCardForm((f) => ({ ...f, card_last4: e.target.value.replace(/\D/g, "") }))}
                    placeholder="e.g. 4321" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Issued To</label>
                  <input className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                    value={cardForm.issued_to} onChange={(e) => setCardForm((f) => ({ ...f, issued_to: e.target.value }))} placeholder="Name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Billing Cycle From</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                    value={cardForm.billing_cycle_from} onChange={(e) => setCardForm((f) => ({ ...f, billing_cycle_from: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Billing Cycle To</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                    value={cardForm.billing_cycle_to} onChange={(e) => setCardForm((f) => ({ ...f, billing_cycle_to: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Payment Date</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                    value={cardForm.payment_date} onChange={(e) => setCardForm((f) => ({ ...f, payment_date: e.target.value }))} />
                </div>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-3">
                <button onClick={() => setShowCardModal(false)} className="px-5 py-2.5 rounded-xl border text-gray-300 text-sm font-semibold" style={{ borderColor: "#78350f" }}>Cancel</button>
                <button onClick={saveCard} disabled={saving || isIntern} className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow disabled:opacity-60 ${
                  isIntern ? "bg-gray-600 text-gray-300 cursor-not-allowed" : "text-white"
                }`} style={isIntern ? {} : { background: goldGrad }}>
                  <Save className="w-4 h-4" /> {saving ? "Saving…" : isIntern ? "View Only" : editCard ? "Update" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ADD/EDIT BILL MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showBillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ background: "#1c1200", border: "1px solid #78350f" }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: goldGrad }}>
                <h2 className="text-white font-bold text-lg">{editBill ? "Edit Bill" : "Add Credit Card Bill"}</h2>
                <button onClick={() => setShowBillModal(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                {/* ─── SEARCHABLE CARD DROPDOWN ─────────────────────── */}
                <div className="col-span-2 relative" ref={cardDropdownRef}>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Card *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                      style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                      placeholder="Search card no, name or bank…"
                      value={cardQuery}
                      onChange={(e) => {
                        setCardQuery(e.target.value);
                        setShowCardDropdown(true);
                      }}
                      onFocus={() => setShowCardDropdown(true)}
                    />
                  </div>
                  
                  {showCardDropdown && (
                    <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-lg"
                         style={{ background: "#2a1f00", borderColor: "#78350f" }}>
                      {cards.filter((c) => {
                        const q = cardQuery.toLowerCase();
                        return !q ||
                          c.card_last4.includes(q) ||
                          c.issued_to.toLowerCase().includes(q) ||
                          c.bank.toLowerCase().includes(q);
                      }).length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">No cards found</div>
                      ) : (
                        cards.filter((c) => {
                          const q = cardQuery.toLowerCase();
                          return !q ||
                            c.card_last4.includes(q) ||
                            c.issued_to.toLowerCase().includes(q) ||
                            c.bank.toLowerCase().includes(q);
                        }).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setBillForm((f) => ({ ...f, card_master_id: c.id }));
                              setSelectedBillCard(c);
                              setCardQuery(`${c.bank} ••••${c.card_last4} — ${c.issued_to}`);
                              setShowCardDropdown(false);
                            }}
                            className="px-3 py-2.5 text-sm text-gray-300 hover:bg-yellow-900/20 cursor-pointer border-b border-yellow-900/10 last:border-0"
                          >
                            <span className="font-semibold" style={{ color: "#d97706" }}>{c.bank}</span>
                            <span className="mx-1.5 text-gray-500">••••{c.card_last4}</span>
                            <span className="text-gray-400">— {c.issued_to}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {selectedBillCard && (
                    <p className="text-[10px] mt-1.5 text-gray-500">
                      Selected: <span className="text-gray-300">{selectedBillCard.bank} ••••{selectedBillCard.card_last4}</span>
                    </p>
                  )}
                </div>

                {/* ─── BILL DATE ─────────────────────────────────────── */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Bill Date</label>
                  <input type="date" className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                    style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                    value={billForm.bill_date} onChange={(e) => setBillForm((f) => ({ ...f, bill_date: e.target.value }))} />
                </div>

                {[
                  { key: "amount", label: "Amount" },
                  { key: "penalty", label: "Penalty" },
                  { key: "cash_back", label: "Cash Back" },
                  { key: "amount_paid", label: "Amount Paid" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>{label}</label>
                    <input type="number" className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none text-white"
                      style={{ background: "#2a1f00", border: "1px solid #78350f" }}
                      value={billForm[key]} onChange={(e) => setBillForm((f) => ({ ...f, [key]: e.target.value }))} placeholder="0.00" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Amount Payable (Auto)</label>
                  <div className="px-3 py-2.5 rounded-xl text-sm font-bold" style={{ background: "#2a1f00", border: "1px solid #78350f", color: "#d97706" }}>
                    {fmt(Math.max(0, (parseFloat(billForm.amount) || 0) + (parseFloat(billForm.penalty) || 0) - (parseFloat(billForm.cash_back) || 0)))}
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-3">
                <button onClick={() => setShowBillModal(false)} className="px-5 py-2.5 rounded-xl border text-gray-300 text-sm font-semibold" style={{ borderColor: "#78350f" }}>Cancel</button>
                <button onClick={saveBill} disabled={saving || isIntern} className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60 ${
                  isIntern ? "bg-gray-600 text-gray-300 cursor-not-allowed" : "text-white"
                }`} style={isIntern ? {} : { background: goldGrad }}>
                  <Save className="w-4 h-4" /> {saving ? "Saving…" : isIntern ? "View Only" : editBill ? "Update" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DETAIL MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDetailModal && viewBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col"
              style={{ background: "#1c1200", border: "1px solid #78350f" }}>
              <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: goldGrad }}>
                <div>
                  <h2 className="text-white font-bold text-lg">DETAILS — CARD ••••{viewCard?.card_last4 || "XXXX"}</h2>
                  <p className="text-white/70 text-xs mt-0.5">{viewCard?.bank} | {viewCard?.issued_to} | Cycle: {viewCard?.billing_cycle_from} → {viewCard?.billing_cycle_to}</p>
                </div>
                <div className="flex items-center gap-3">
                  {!isIntern && (
                    <button onClick={startAddDetail}
                      className="flex items-center gap-1.5 px-4 py-2 bg-black/30 hover:bg-black/50 text-white rounded-xl text-sm font-semibold border border-white/20">
                      <Plus className="w-4 h-4" /> Add Expense
                    </button>
                  )}
                  <button onClick={() => setShowDetailModal(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <AnimatePresence>
                {showDetailFormInline && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex-shrink-0" style={{ background: "#2a1f00", borderBottom: "1px solid #78350f" }}>
                    <div className="p-5 grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Date of Expense</label>
                        <input type="date" className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none text-white"
                          style={{ background: "#1c1200", border: "1px solid #78350f" }}
                          value={detailForm.date_of_expense} onChange={(e) => setDetailForm((f) => ({ ...f, date_of_expense: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Amount</label>
                        <input type="number" className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none text-white"
                          style={{ background: "#1c1200", border: "1px solid #78350f" }}
                          value={detailForm.amount} onChange={(e) => setDetailForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Pay Header</label>
                        <select className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none text-white"
                          style={{ background: "#1c1200", border: "1px solid #78350f" }}
                          value={detailForm.pay_header} onChange={(e) => setDetailForm((f) => ({ ...f, pay_header: e.target.value }))}>
                          <option value="">Select</option>
                          {PAY_HEADER_OPTIONS.map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Details</label>
                        <input className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none text-white"
                          style={{ background: "#1c1200", border: "1px solid #78350f" }}
                          value={detailForm.details} onChange={(e) => setDetailForm((f) => ({ ...f, details: e.target.value }))} placeholder="Description" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Cost Head Break Up</label>
                        <select className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none text-white"
                          style={{ background: "#1c1200", border: "1px solid #78350f" }}
                          value={detailForm.cost_head_breakup} onChange={(e) => setDetailForm((f) => ({ ...f, cost_head_breakup: e.target.value }))}>
                          <option value="">Select</option>
                          {COST_HEAD_OPTIONS.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#d97706" }}>Bill Supporting Received</label>
                        <select className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none text-white"
                          style={{ background: "#1c1200", border: "1px solid #78350f" }}
                          value={detailForm.bill_supporting_received} onChange={(e) => setDetailForm((f) => ({ ...f, bill_supporting_received: e.target.value }))}>
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>
                      <div className="col-span-3 flex justify-end gap-3 pt-1">
                        <button onClick={() => { setShowDetailFormInline(false); setEditDetail(null); }}
                          className="px-4 py-2 rounded-xl border text-gray-300 text-sm font-semibold" style={{ borderColor: "#78350f" }}>Cancel</button>
                        <button onClick={saveDetail} disabled={saving || isIntern}
                          className={`px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60 ${
                            isIntern ? "bg-gray-600 text-gray-300 cursor-not-allowed" : "text-white"
                          }`} style={isIntern ? {} : { background: goldGrad }}>
                          <Save className="w-4 h-4" /> {saving ? "Saving…" : isIntern ? "View Only" : editDetail ? "Update" : "Add"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr style={{ background: "#2a1f00" }}>
                      {["Date of Expense", "Amount", "Pay Header", "Details", "Cost Head Break Up", "Bill Supporting", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#d97706" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewDetails.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-yellow-800/50">No expenses recorded. Click "Add Expense" to begin.</td></tr>
                    ) : viewDetails.map((d, i) => (
                      <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="border-b" style={{ borderColor: "#2a1f00" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#1a1000"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{d.date_of_expense}</td>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: "#d97706" }}>{fmt(d.amount)}</td>
                        <td className="px-4 py-3 text-gray-300">{d.pay_header}</td>
                        <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">{d.details}</td>
                        <td className="px-4 py-3 text-gray-400">{d.cost_head_breakup}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${d.bill_supporting_received === "Yes" ? "bg-green-900/40 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                            {d.bill_supporting_received}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => startEditDetail(d)} className="p-1.5 rounded-lg transition-colors" style={{ background: "#2a1f00", color: "#d97706" }}><Edit2 className="w-3.5 h-3.5" /></button>
                            {!isIntern && (
                              <button onClick={() => setDeleteTarget({ type: "detail", id: d.id })} className="p-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                  {viewDetails.length > 0 && (
                    <tfoot>
                      <tr style={{ background: "#2a1f00" }}>
                        <td className="px-4 py-3 font-bold text-white">Total</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: "#d97706" }}>
                          {fmt(viewDetails.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0))}
                        </td>
                        <td colSpan={5}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DELETE CONFIRM ──────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center" style={{ background: "#1c1200", border: "1px solid #78350f" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-900/30">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Record?</h3>
              <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 rounded-xl border text-gray-300 text-sm font-semibold" style={{ borderColor: "#78350f" }}>Cancel</button>
                <button onClick={confirmDelete} className="px-5 py-2.5 bg-red-700 text-white rounded-xl text-sm font-semibold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}