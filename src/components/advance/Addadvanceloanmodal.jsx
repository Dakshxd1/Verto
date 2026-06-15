import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save } from "lucide-react";
import supabase from "../../lib/supabaseClient";
import { usePerms } from "../../context/PermissionsContext";

const TYPE_OPTIONS = ["Employee Advance", "Client Advance"];
const STATUS_OPTIONS = ["Pending", "Partially Paid", "Closed"];

export default function AddAdvanceLoanModal({ isOpen, onClose }) {
  const { isIntern } = usePerms?.() || {};
  const [type, setType] = useState("Employee Advance");
  const [form, setForm] = useState({
    name: "",
    department_or_ledger: "",
    date: "",
    amount: "",
    interest: "",
    paid_back: "",
    status: "Pending",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  // ── Employee dropdown state ──────────────────────────────────────────────
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeRef = useRef(null);

  // ── Client dropdown state ────────────────────────────────────────────────
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientRef = useRef(null);

  // ── Fetch employees & clients on mount ───────────────────────────────────
  useEffect(() => {
    fetchEmployees();
    fetchClients();
  }, []);

  async function fetchEmployees() {
    const { data } = await supabase
      .from("internal_team")
      .select("name, department")
      .order("name");
    if (data) setEmployees(data);
  }

  async function fetchClients() {
    const { data } = await supabase
      .from("clients_master")
      .select("id, client_name")
      .order("client_name");
    if (data) setClients(data);
  }

  // ── Outside-click close for both dropdowns ───────────────────────────────
  useEffect(() => {
    function handleOutsideClick(e) {
      if (employeeRef.current && !employeeRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false);
      }
      if (clientRef.current && !clientRef.current.contains(e.target)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredEmployees = employeeSearch.trim() === ""
    ? employees
    : employees.filter((e) =>
        e.name?.toLowerCase().includes(employeeSearch.toLowerCase())
      );

  const filteredClients = clients.filter((c) =>
    c.client_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ── Live pending calculation ─────────────────────────────────────────────
  const livePending = Math.max(
    0,
    (parseFloat(form.amount) || 0) +
    (parseFloat(form.interest) || 0) -
    (parseFloat(form.paid_back) || 0)
  );

  const fmt = (n) =>
    `₹${parseFloat(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
    })}`;

  // ── Reset helper ─────────────────────────────────────────────────────────
  function resetAll() {
    setForm({
      name: "",
      department_or_ledger: "",
      date: "",
      amount: "",
      interest: "",
      paid_back: "",
      status: "Pending",
      remarks: "",
    });
    setEmployeeSearch("");
    setClientSearch("");
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (isIntern) return;
    if (!form.name || !form.amount) return;
    setSaving(true);

    const table =
      type === "Employee Advance"
        ? "employee_advance_tracker"
        : "client_advance_tracker";

    const payload =
      type === "Employee Advance"
        ? {
            employee_name: form.name,
            department: form.department_or_ledger,
            date_of_advance: form.date,
            advance_amount: form.amount,
            interest: parseFloat(form.interest) || 0,
            paid_back: form.paid_back,
            pending_due: livePending,
            status: form.status,
            remarks: form.remarks,
          }
        : {
            client_name: form.name,
            ledger_name: form.department_or_ledger,
            date: form.date,
            amount: form.amount,
            interest: parseFloat(form.interest) || 0,
            paid_back: form.paid_back,
            pending_due: livePending,
            status: form.status,
            remarks: form.remarks,
          };

    await supabase.from(table).insert([payload]);
    setSaving(false);
    onClose();
    resetAll();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-800 to-blue-500 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">
                Add Advance / Loan
              </h2>
              <button
                onClick={() => { onClose(); resetAll(); }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    resetAll();
                  }}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ── EMPLOYEE searchable dropdown ── */}
                {type === "Employee Advance" && (
                  <>
                    <div className="relative" ref={employeeRef}>
                      <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                        Employee Name *
                      </label>
                      <input
                        type="text"
                        value={employeeSearch}
                        onChange={(e) => {
                          setEmployeeSearch(e.target.value);
                          setForm((f) => ({ ...f, name: e.target.value, department_or_ledger: "" }));
                          setShowEmployeeDropdown(true);
                        }}
                        onFocus={() => setShowEmployeeDropdown(true)}
                        onClick={() => setShowEmployeeDropdown(true)}
                        placeholder="Search employee…"
                        className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showEmployeeDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-blue-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {filteredEmployees.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">
                              No employee found
                            </div>
                          ) : (
                            filteredEmployees.map((emp) => (
                              <button
                                type="button"
                                key={emp.name}
                                onClick={() => {
                                  setForm((f) => ({
                                    ...f,
                                    name: emp.name,
                                    department_or_ledger: emp.department || "",
                                  }));
                                  setEmployeeSearch(emp.name);
                                  setShowEmployeeDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                              >
                                <div className="font-medium text-blue-900">
                                  {emp.name}
                                </div>
                                {emp.department && (
                                  <div className="text-xs text-gray-500">
                                    {emp.department}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Department — autofilled */}
                    <div>
                      <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                        Department
                      </label>
                      <input
                        className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                        value={form.department_or_ledger}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            department_or_ledger: e.target.value,
                          }))
                        }
                        placeholder="Auto-filled from employee"
                      />
                    </div>
                  </>
                )}

                {/* ── CLIENT searchable dropdown ── */}
                {type === "Client Advance" && (
                  <>
                    <div className="relative" ref={clientRef}>
                      <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setForm((f) => ({ ...f, name: e.target.value }));
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Search client…"
                        className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showClientDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-blue-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                          {filteredClients.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">
                              No client found
                            </div>
                          ) : (
                            filteredClients.map((c) => (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => {
                                  setForm((f) => ({
                                    ...f,
                                    name: c.client_name,
                                  }));
                                  setClientSearch(c.client_name);
                                  setShowClientDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                              >
                                <div className="font-medium text-blue-900">
                                  {c.client_name}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ledger Name */}
                    <div>
                      <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                        Ledger Name
                      </label>
                      <input
                        className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.department_or_ledger}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            department_or_ledger: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                    Amount *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>

                {/* Interest */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                    Interest
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.interest}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        interest: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </div>

                {/* Paid Back */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                    Paid Back
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.paid_back}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, paid_back: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>

                {/* Pending Due — AUTO */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                    Pending Due (Auto)
                  </label>
                  <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm font-bold text-red-600">
                    {fmt(livePending)}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1.5 uppercase tracking-wide">
                  Remarks
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                onClick={() => { onClose(); resetAll(); }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || isIntern}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60 ${
                  isIntern ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-700 to-blue-500 text-white"
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : isIntern ? "View Only" : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}