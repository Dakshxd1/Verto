import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Plus, Search, Edit2, Trash2, X, Save,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
  Upload, Download, ChevronRight, ChevronDown,
  FileSpreadsheet, AlertTriangle, XCircle, CheckCheck,
  Loader2, Eye
} from "lucide-react";
import supabase from "../../lib/supabaseClient";
import { logExport, EXPORT_ACTIONS } from "../../utils/Auditlog.js";

const STATUS_OPTIONS = ["Pending", "Partially Paid", "Closed"];

const emptyForm = {
  client_name: "", ledger_name: "", date: "", amount: "",
  interest: "", paid_back: "", status: "Pending", remarks: "",
};

// ─── Excel column map ─────────────────────────────────────────────────────────
const COL_MAP = {
  "client name": "client_name", client_name: "client_name", client: "client_name",
  "ledger name": "ledger_name", ledger_name: "ledger_name", ledger: "ledger_name",
  date: "date", "date of loan": "date", "advance date": "date",
  amount: "amount", "amount (la)": "amount", "loan amount": "amount",
  interest: "interest", "interest amount": "interest",
  "paid back": "paid_back", paid_back: "paid_back", "amount paid": "paid_back",
  status: "status",
  remarks: "remarks", notes: "remarks",
};
const normalizeHeader = (h) => String(h || "").trim().toLowerCase();

const excelDateToString = (v) => {
  if (!v) return null;
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return null;
  }
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return null;
};

function calcPendingDue(amount, interest, paidBack) {
  return Math.max(
    0,
    (parseFloat(amount) || 0) + (parseFloat(interest) || 0) - (parseFloat(paidBack) || 0)
  );
}

const fmt = (n) =>
  `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Download template ────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const headers = ["Client Name", "Ledger Name", "Date", "Amount (LA)", "Interest", "Paid Back", "Status", "Remarks"];
  const sample  = ["ABC Corp", "ABC Corp Ledger", "2026-06-01", 500000, 25000, 100000, "Pending", "Q1 advance"];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, "Client Advance");
  XLSX.writeFile(wb, "client_advance_template.xlsx");
  logExport({
    action:      EXPORT_ACTIONS.TEMPLATE,
    category:    "Advance",
    description: "Downloaded Client Advance Upload Template",
    meta:        { file: "client_advance_template.xlsx" },
  });
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl p-5 bg-orange-50 flex items-center gap-4 shadow-sm border border-orange-100">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-orange-900">{value}</p>
      </div>
    </div>
  );
}

// ─── Bulk Upload Result Modal ─────────────────────────────────────────────────
const BulkResultModal = ({ result, onClose }) => {
  const { added, failed, failedDetails } = result;
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <FileSpreadsheet size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Bulk Upload Result</h3>
                <p className="text-slate-400 text-xs">Client advance records processed</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X size={14} className="text-white" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`${added > 0 ? "bg-emerald-500" : "bg-white/10"} rounded-xl p-3 text-center`}>
              <p className="text-2xl font-bold text-white">{added}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white opacity-80">✅ Added</p>
            </div>
            <div className={`${failed > 0 ? "bg-rose-500" : "bg-white/10"} rounded-xl p-3 text-center`}>
              <p className="text-2xl font-bold text-white">{failed}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white opacity-80">❌ Failed</p>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {added > 0 && failed === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCheck size={30} className="text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-slate-800">{added} record{added > 1 ? "s" : ""} saved</p>
              <p className="text-sm text-slate-500 text-center">All rows inserted successfully</p>
            </div>
          )}
          {failedDetails?.map((row, i) => (
            <div key={i} className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <XCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-rose-800 text-sm">{row.client_name || "(empty)"}</span>
                <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full ml-2">Row {row.rowNum}</span>
                <p className="text-xs text-rose-700 mt-0.5">{row.error}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-all">
            {added > 0 ? "Done — View Records" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Inline Edit Row Form (inside BulkDetailModal) ────────────────────────────
const InlineEditRow = ({ row, onSave, onCancel }) => {
  const [f, setF] = useState({
    client_name: row.client_name || "",
    ledger_name: row.ledger_name || "",
    date: row.date || "",
    amount: row.amount || "",
    interest: row.interest || "",
    paid_back: row.paid_back || "",
    status: row.status || "Pending",
    remarks: row.remarks || "",
  });
  const [saving, setSaving] = useState(false);
  const livePending = calcPendingDue(f.amount, f.interest, f.paid_back);

  const handleSave = async () => {
    if (!f.client_name || !f.amount) return;
    setSaving(true);
    const pending_due = calcPendingDue(f.amount, f.interest, f.paid_back);
    const payload = {
      client_name: f.client_name,
      ledger_name: f.ledger_name || null,
      date: f.date || null,
      amount: parseFloat(f.amount) || 0,
      interest: parseFloat(f.interest) || 0,
      paid_back: parseFloat(f.paid_back) || 0,
      pending_due,
      status: f.status,
      remarks: f.remarks || null,
    };
    const { error } = await supabase
      .from("client_advance_tracker")
      .update(payload)
      .eq("id", row.id);
    setSaving(false);
    if (!error) onSave({ ...row, ...payload });
  };

  const inp = "px-2 py-1.5 border border-orange-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 w-full bg-white";

  return (
    <tr className="bg-orange-50/60 border-b-2 border-orange-300">
      {/* # */}
      <td className="px-4 py-2 text-gray-400 text-xs align-top pt-3">✏️</td>
      {/* Client Name */}
      <td className="px-2 py-2 align-top">
        <input className={inp} value={f.client_name}
          onChange={(e) => setF((p) => ({ ...p, client_name: e.target.value }))} placeholder="Client name *" />
      </td>
      {/* Ledger */}
      <td className="px-2 py-2 align-top">
        <input className={inp} value={f.ledger_name}
          onChange={(e) => setF((p) => ({ ...p, ledger_name: e.target.value }))} placeholder="Ledger" />
      </td>
      {/* Date */}
      <td className="px-2 py-2 align-top">
        <input type="date" className={inp} value={f.date}
          onChange={(e) => setF((p) => ({ ...p, date: e.target.value }))} />
      </td>
      {/* Amount */}
      <td className="px-2 py-2 align-top">
        <input type="number" className={inp} value={f.amount}
          onChange={(e) => setF((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
      </td>
      {/* Interest */}
      <td className="px-2 py-2 align-top">
        <input type="number" className={inp} value={f.interest}
          onChange={(e) => setF((p) => ({ ...p, interest: e.target.value }))} placeholder="0" />
      </td>
      {/* Paid Back */}
      <td className="px-2 py-2 align-top">
        <input type="number" className={inp} value={f.paid_back}
          onChange={(e) => setF((p) => ({ ...p, paid_back: e.target.value }))} placeholder="0" />
      </td>
      {/* Pending Due (auto) */}
      <td className="px-2 py-2 align-top">
        <div className="px-2 py-1.5 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-600 text-center whitespace-nowrap">
          {fmt(livePending)}
        </div>
      </td>
      {/* Status */}
      <td className="px-2 py-2 align-top">
        <select className={inp} value={f.status}
          onChange={(e) => setF((p) => ({ ...p, status: e.target.value }))}>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </td>
      {/* Remarks */}
      <td className="px-2 py-2 align-top">
        <input className={inp} value={f.remarks}
          onChange={(e) => setF((p) => ({ ...p, remarks: e.target.value }))} placeholder="Remarks" />
      </td>
      {/* Actions */}
      <td className="px-2 py-2 align-top">
        <div className="flex gap-1.5">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-60">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {saving ? "…" : "Save"}
          </button>
          <button onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold transition">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Bulk Upload Row Modal (drill-down) ───────────────────────────────────────
const BulkDetailModal = ({ upload, onClose, onDataChanged }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRowId, setEditingRowId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_advance_tracker")
      .select("*")
      .eq("bulk_upload_id", upload.id)
      .order("created_at", { ascending: true });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { loadRows(); }, [upload.id]);

  // ── Live totals computed from current rows state (always up-to-date) ─────────
  const liveTotals = rows.reduce(
    (acc, r) => ({
      amount:      acc.amount      + (parseFloat(r.amount)      || 0),
      interest:    acc.interest    + (parseFloat(r.interest)    || 0),
      paid_back:   acc.paid_back   + (parseFloat(r.paid_back)   || 0),
      pending_due: acc.pending_due + (parseFloat(r.pending_due) || 0),
    }),
    { amount: 0, interest: 0, paid_back: 0, pending_due: 0 }
  );

  const handleRowSaved = async (updatedRow) => {
    const newRows = rows.map((r) => (r.id === updatedRow.id ? updatedRow : r));
    setRows(newRows);
    setEditingRowId(null);

    // Recompute and persist updated totals to the bulk upload session row
    const totals = newRows.reduce(
      (acc, r) => ({
        amount:      acc.amount      + (parseFloat(r.amount)      || 0),
        interest:    acc.interest    + (parseFloat(r.interest)    || 0),
        paid_back:   acc.paid_back   + (parseFloat(r.paid_back)   || 0),
        pending_due: acc.pending_due + (parseFloat(r.pending_due) || 0),
      }),
      { amount: 0, interest: 0, paid_back: 0, pending_due: 0 }
    );
    await supabase.from("client_advance_bulk_uploads").update({
      total_amount:      totals.amount,
      total_interest:    totals.interest,
      total_paid_back:   totals.paid_back,
      total_pending_due: totals.pending_due,
    }).eq("id", upload.id);

    // Refresh parent (stats cards + bulk upload history row)
    if (onDataChanged) onDataChanged();
  };

  // ── Delete a single row from the bulk upload ──────────────────────────────
  const handleRowDeleted = async (rowId) => {
    setDeleting(true);
    const rec = rows.find((r) => r.id === rowId);
    await supabase.from("client_advance_tracker").delete().eq("id", rowId);
    logExport({
      action:      "DELETE",
      category:    "Advance",
      description: `Deleted Client Advance Row — ${rec?.client_name || rowId} (from bulk upload)`,
      client_name: rec?.client_name || null,
      amount:      rec?.amount || null,
      meta:        { id: rowId, bulk_upload_id: upload?.id },
    });
    const newRows = rows.filter((r) => r.id !== rowId);
    setRows(newRows);
    setConfirmDeleteId(null);
    setDeleting(false);

    // Recompute totals and persist
    const totals = newRows.reduce(
      (acc, r) => ({
        amount:      acc.amount      + (parseFloat(r.amount)      || 0),
        interest:    acc.interest    + (parseFloat(r.interest)    || 0),
        paid_back:   acc.paid_back   + (parseFloat(r.paid_back)   || 0),
        pending_due: acc.pending_due + (parseFloat(r.pending_due) || 0),
      }),
      { amount: 0, interest: 0, paid_back: 0, pending_due: 0 }
    );
    await supabase.from("client_advance_bulk_uploads").update({
      row_count:         newRows.length,
      total_amount:      totals.amount,
      total_interest:    totals.interest,
      total_paid_back:   totals.paid_back,
      total_pending_due: totals.pending_due,
    }).eq("id", upload.id);

    if (onDataChanged) onDataChanged();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
        <div className="bg-gradient-to-r from-[#7c2d12] to-[#ea580c] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">{upload.upload_label}</h3>
            <p className="text-orange-200 text-xs mt-0.5">
              {rows.length} rows · {fmtDate(upload.uploaded_at)} · Total Advanced: {fmt(liveTotals.amount)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Summary bar — uses live totals, never stale */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-orange-50 border-b border-orange-100 flex-shrink-0">
          {[
            { label: "Total Amount",      value: fmt(liveTotals.amount),      color: "text-orange-800" },
            { label: "Total Interest",    value: fmt(liveTotals.interest),    color: "text-orange-600" },
            { label: "Total Paid Back",   value: fmt(liveTotals.paid_back),   color: "text-green-700" },
            { label: "Total Pending Due", value: fmt(liveTotals.pending_due), color: "text-red-600"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-orange-100 text-center">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
              <p className={`text-lg font-bold font-mono mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" /><span>Loading rows…</span>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  {["#", "Client Name", "Ledger", "Date", "Amount", "Interest", "Paid Back", "Pending Due", "Status", "Remarks", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) =>
                  editingRowId === r.id ? (
                    <InlineEditRow
                      key={r.id}
                      row={r}
                      onSave={handleRowSaved}
                      onCancel={() => setEditingRowId(null)}
                    />
                  ) : (
                    <tr key={r.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-orange-900">{r.client_name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.ledger_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-orange-800">{fmt(r.amount)}</td>
                      <td className="px-4 py-3 font-mono text-orange-600">{fmt(r.interest)}</td>
                      <td className="px-4 py-3 font-mono text-green-700">{fmt(r.paid_back)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-red-600">{fmt(r.pending_due)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === "Closed"         ? "bg-green-100 text-green-700" :
                          r.status === "Partially Paid" ? "bg-yellow-100 text-yellow-700" :
                                                          "bg-red-100 text-red-600"
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{r.remarks || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingRowId(r.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-semibold transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(r.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Inline delete confirmation ─────────────────────────────────────── */}
        {confirmDeleteId && (
          <div className="flex-shrink-0 border-t-2 border-red-200 bg-red-50 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-sm font-semibold text-red-800">
                Delete this record? <span className="font-normal text-red-600">This cannot be undone.</span>
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRowDeleted(confirmDeleteId)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition">Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ClientAdvanceTracker() {
  const [records, setRecords]         = useState([]);
  const [bulkUploads, setBulkUploads] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showModal, setShowModal]     = useState(false);
  const [editRecord, setEditRecord]   = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [deleteId, setDeleteId]       = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Bulk upload state
  const [bulkLoading, setBulkLoading]     = useState(false);
  const [bulkResult, setBulkResult]       = useState(null);
  const [viewUpload, setViewUpload]       = useState(null);
  const [showBulkSection, setShowBulkSection] = useState(true);
  const excelFileRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [recRes, bulkRes] = await Promise.all([
      supabase.from("client_advance_tracker").select("*").order("created_at", { ascending: false }),
      supabase.from("client_advance_bulk_uploads").select("*").order("uploaded_at", { ascending: false }),
    ]);
    if (!recRes.error) setRecords(recRes.data || []);
    if (!bulkRes.error) setBulkUploads(bulkRes.data || []);
    setLoading(false);
  }

  function openAdd() { setEditRecord(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(rec) {
    setEditRecord(rec);
    setForm({ client_name: rec.client_name || "", ledger_name: rec.ledger_name || "", date: rec.date || "", amount: rec.amount || "", interest: rec.interest || "", paid_back: rec.paid_back || "", status: rec.status || "Pending", remarks: rec.remarks || "" });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.client_name || !form.amount) return;
    setSaving(true);
    const pending_due = calcPendingDue(form.amount, form.interest, form.paid_back);
    const payload = {
      client_name: form.client_name, ledger_name: form.ledger_name,
      date: form.date || null, amount: parseFloat(form.amount) || 0,
      interest: parseFloat(form.interest) || 0, paid_back: parseFloat(form.paid_back) || 0,
      pending_due, status: form.status, remarks: form.remarks,
    };
    if (editRecord) {
      await supabase.from("client_advance_tracker").update(payload).eq("id", editRecord.id);
      logExport({
        action:      "UPDATE",
        category:    "Advance",
        description: `Updated Client Advance — ${form.client_name}`,
        client_name: form.client_name,
        amount:      parseFloat(form.amount) || 0,
        meta:        { id: editRecord.id, status: form.status, pending_due },
      });
    } else {
      await supabase.from("client_advance_tracker").insert([payload]);
      logExport({
        action:      "INSERT",
        category:    "Advance",
        description: `Added Client Advance — ${form.client_name}`,
        client_name: form.client_name,
        amount:      parseFloat(form.amount) || 0,
        meta:        { status: form.status, pending_due },
      });
    }
    setSaving(false);
    setShowModal(false);
    fetchAll();
  }

  async function handleDelete(id) {
    const rec = records.find((r) => r.id === id);
    await supabase.from("client_advance_tracker").delete().eq("id", id);
    logExport({
      action:      "DELETE",
      category:    "Advance",
      description: `Deleted Client Advance — ${rec?.client_name || id}`,
      client_name: rec?.client_name || null,
      amount:      rec?.amount || null,
      meta:        { id, status: rec?.status, pending_due: rec?.pending_due },
    });
    setDeleteId(null);
    fetchAll();
  }

  async function handleDeleteBulkUpload(bulkId) {
    setBulkDeleting(true);
    const bulkRec = bulkUploads.find((u) => u.id === bulkId);
    await supabase.from("client_advance_tracker").delete().eq("bulk_upload_id", bulkId);
    await supabase.from("client_advance_bulk_uploads").delete().eq("id", bulkId);
    logExport({
      action:      "DELETE",
      category:    "Advance",
      description: `Deleted Bulk Advance Upload — ${bulkRec?.upload_label || bulkId} (${bulkRec?.row_count || "?"} rows)`,
      meta:        { bulk_id: bulkId, label: bulkRec?.upload_label, rows: bulkRec?.row_count },
    });
    setBulkDeleting(false);
    setConfirmBulkDelete(null);
    fetchAll();
  }

  // ── BULK UPLOAD ──────────────────────────────────────────────────────────────
  const handleExcelFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (excelFileRef.current) excelFileRef.current.value = "";
    setBulkLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: "array", cellDates: false });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { raw: true, defval: "" });
      if (!rawRows.length) { alert("Excel file is empty."); setBulkLoading(false); return; }

      const normalizedRows = rawRows.map((row, idx) => {
        const n = { _rowNum: idx + 2 };
        Object.entries(row).forEach(([key, val]) => {
          const mapped = COL_MAP[normalizeHeader(key)];
          if (mapped) n[mapped] = val;
        });
        return n;
      });

      if (!normalizedRows[0].hasOwnProperty("client_name")) {
        alert('Column "Client Name" not found. Please use the template.');
        setBulkLoading(false);
        return;
      }

      const uploadLabel = `Bulk_Upload_${new Date().toISOString().slice(0, 10)}`;
      const { data: uploadSession, error: sessionErr } = await supabase
        .from("client_advance_bulk_uploads")
        .insert([{ upload_label: uploadLabel, row_count: 0, total_amount: 0, total_interest: 0, total_paid_back: 0, total_pending_due: 0 }])
        .select().single();
      if (sessionErr) throw sessionErr;

      let added = 0;
      let totalAmount = 0, totalInterest = 0, totalPaidBack = 0, totalPendingDue = 0;
      const failedDetails = [];

      for (const row of normalizedRows) {
        try {
          if (!row.client_name) throw new Error("client_name is empty");
          const amount     = parseFloat(row.amount)    || 0;
          const interest   = parseFloat(row.interest)  || 0;
          const paid_back  = parseFloat(row.paid_back) || 0;
          const pending_due = calcPendingDue(amount, interest, paid_back);
          const dateStr    = excelDateToString(row.date);
          const status     = STATUS_OPTIONS.includes(row.status) ? row.status : "Pending";

          const { error: insertErr } = await supabase.from("client_advance_tracker").insert([{
            client_name:   String(row.client_name).trim(),
            ledger_name:   row.ledger_name ? String(row.ledger_name).trim() : null,
            date:          dateStr,
            amount, interest, paid_back, pending_due, status,
            remarks:       row.remarks ? String(row.remarks).trim() : null,
            bulk_upload_id: uploadSession.id,
          }]);
          if (insertErr) throw insertErr;

          totalAmount     += amount;
          totalInterest   += interest;
          totalPaidBack   += paid_back;
          totalPendingDue += pending_due;
          added++;
        } catch (err) {
          failedDetails.push({ client_name: row.client_name, rowNum: row._rowNum, error: err.message });
        }
      }

      await supabase.from("client_advance_bulk_uploads").update({
        row_count:         added,
        total_amount:      totalAmount,
        total_interest:    totalInterest,
        total_paid_back:   totalPaidBack,
        total_pending_due: totalPendingDue,
      }).eq("id", uploadSession.id);

      setBulkResult({ added, failed: failedDetails.length, failedDetails });
      logExport({
        action:      "INSERT",
        category:    "Advance",
        description: `Bulk Uploaded Client Advance — ${added} added, ${failedDetails.length} failed`,
        meta:        { added, failed: failedDetails.length, label: uploadLabel, total_amount: totalAmount },
      });
      fetchAll();
    } catch (err) {
      alert("❌ Failed to process Excel: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Filtered records (individual, not from bulk) ─────────────────────────────
  const individualRecords = records.filter((r) => !r.bulk_upload_id);
  const filtered = individualRecords.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = r.client_name?.toLowerCase().includes(q) || r.ledger_name?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalAdvanced = records.reduce((s, r) => s + (parseFloat(r.amount)      || 0), 0);
  const totalPending  = records.reduce((s, r) => s + (parseFloat(r.pending_due) || 0), 0);
  const openCount     = records.filter((r) => r.status !== "Closed").length;
  const closedCount   = records.filter((r) => r.status === "Closed").length;

  const livePending = calcPendingDue(form.amount, form.interest, form.paid_back);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Advanced"    value={fmt(totalAdvanced)} icon={TrendingUp}   />
        <StatCard label="Total Pending Due" value={fmt(totalPending)}  icon={AlertCircle}  />
        <StatCard label="Open Cases"        value={openCount}          icon={Clock}        />
        <StatCard label="Closed Cases"      value={closedCount}        icon={CheckCircle2} />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap flex-1">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50/40"
                placeholder="Search client or ledger…"
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2.5 text-sm border border-orange-200 rounded-xl bg-orange-50/40 text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 border border-orange-300 bg-orange-50 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 transition">
              <Download className="w-4 h-4" /> Template
            </button>
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition ${bulkLoading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}>
              {bulkLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Upload className="w-4 h-4" /> Bulk Upload</>}
              <input ref={excelFileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFileSelected} disabled={bulkLoading} className="hidden" />
            </label>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7c2d12] to-[#ea580c] text-white rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all">
              <Plus className="w-4 h-4" /> Add Client Advance
            </button>
          </div>
        </div>
      </div>

      {/* ── BULK UPLOADS SECTION ─────────────────────────────────────────────── */}
      {bulkUploads.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 mb-4 overflow-hidden">
          <button
            onClick={() => setShowBulkSection((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50/40 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-sm">Bulk Upload History</p>
                <p className="text-xs text-gray-500">{bulkUploads.length} upload{bulkUploads.length !== 1 ? "s" : ""} — click any row to view details</p>
              </div>
            </div>
            {showBulkSection
              ? <ChevronDown className="w-5 h-5 text-gray-400" />
              : <ChevronRight className="w-5 h-5 text-gray-400" />
            }
          </button>

          <AnimatePresence>
            {showBulkSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto border-t border-orange-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-orange-50 border-b border-orange-100">
                        {["Upload Label", "Date", "Rows", "Total Amount", "Total Interest", "Paid Back", "Pending Due", "Action"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-orange-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkUploads.map((u, i) => (
                        <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                          className="border-b border-orange-50 hover:bg-orange-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 font-semibold text-orange-900">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-orange-500" />
                              {u.upload_label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(u.uploaded_at)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">{u.row_count}</span>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-orange-800">{fmt(u.total_amount)}</td>
                          <td className="px-4 py-3 font-mono text-orange-600">{fmt(u.total_interest)}</td>
                          <td className="px-4 py-3 font-mono text-green-700">{fmt(u.total_paid_back)}</td>
                          <td className="px-4 py-3 font-mono font-bold text-red-600">{fmt(u.total_pending_due)}</td>
                          <td className="px-4 py-3 flex gap-2">
                            <button
                              onClick={() => setViewUpload(u)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-semibold transition"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Rows
                            </button>
                            <button
                              onClick={() => setConfirmBulkDelete(u)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {confirmBulkDelete && (
            <div className="border-t border-orange-100 bg-red-50 px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">Delete entire bulk upload?</p>
                  <p className="text-xs text-red-600">This will remove all {confirmBulkDelete.row_count} rows and the upload history entry.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setConfirmBulkDelete(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteBulkUpload(confirmBulkDelete.id)}
                  disabled={bulkDeleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition disabled:opacity-60"
                >
                  {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {bulkDeleting ? "Deleting…" : "Delete Bulk Upload"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INDIVIDUAL RECORDS TABLE ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-orange-50 flex items-center justify-between">
          <p className="font-bold text-gray-900 text-sm">Individual Records</p>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#7c2d12] to-[#ea580c]">
                {["Client Name","Ledger","Date","Amount (LA)","Interest","Paid Back","Pending Due","Status","Remarks","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-white font-semibold text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-16 text-orange-400">
                  <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /><span>Loading…</span></div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-gray-400">No records found</td></tr>
              ) : (
                filtered.map((r, i) => {
                  const pendingDue = calcPendingDue(r.amount, r.interest, r.paid_back);
                  return (
                    <motion.tr key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-orange-50 hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-orange-900">{r.client_name}</td>
                      <td className="px-4 py-3.5 text-gray-600">{r.ledger_name || "—"}</td>
                      <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3.5 font-mono text-orange-800 font-semibold">{fmt(r.amount)}</td>
                      <td className="px-4 py-3.5 font-mono text-orange-600 font-semibold">{fmt(r.interest)}</td>
                      <td className="px-4 py-3.5 font-mono text-green-700 font-semibold">{fmt(r.paid_back)}</td>
                      <td className="px-4 py-3.5 font-mono text-red-600 font-bold">{fmt(pendingDue)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          r.status === "Closed"         ? "bg-green-100 text-green-700" :
                          r.status === "Partially Paid" ? "bg-yellow-100 text-yellow-700" :
                                                          "bg-red-100 text-red-600"
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 max-w-[140px] truncate">{r.remarks || "—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD / EDIT MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#7c2d12] to-[#ea580c] px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">{editRecord ? "Edit Client Advance" : "Add Client Advance"}</h2>
                <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Client Name *</label>
                  <input type="text" className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Client name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Ledger Name</label>
                  <input type="text" className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.ledger_name} onChange={(e) => setForm((f) => ({ ...f, ledger_name: e.target.value }))} placeholder="Ledger" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Date of Loan / Advance</label>
                  <input type="date" className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Amount (LA) *</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Interest (Manual)</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.interest} onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Paid Back</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.paid_back} onChange={(e) => setForm((f) => ({ ...f, paid_back: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Pending Due (Auto)</label>
                  <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-600">{fmt(livePending)}</div>
                  <p className="text-xs text-gray-400 mt-1">= Amount + Interest − Paid Back</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Status</label>
                  <select className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-orange-800 mb-1.5 uppercase tracking-wide">Remarks</label>
                  <textarea className="w-full px-3 py-2.5 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={2} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Optional notes…" />
                </div>
              </div>
              <div className="px-6 pb-6 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-[#7c2d12] to-[#ea580c] text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow disabled:opacity-60">
                  <Save className="w-4 h-4" /> {saving ? "Saving…" : editRecord ? "Update" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-600" /></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Record?</h3>
              <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold">Cancel</button>
                <button onClick={() => handleDelete(deleteId)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Result Modal */}
      {bulkResult && (
        <BulkResultModal result={bulkResult} onClose={() => setBulkResult(null)} />
      )}

      {/* Bulk Detail Drill-down Modal */}
      {viewUpload && (
        <BulkDetailModal
          upload={viewUpload}
          onClose={() => setViewUpload(null)}
          onDataChanged={fetchAll}
        />
      )}
    </div>
  );
}