import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import supabase from "../lib/supabaseClient";

// ─── Cost heads ───────────────────────────────────────────────
const COST_HEADS = [
  { key: "os",       label: "OS",       desc: "Outsourcing" },
  { key: "temp",     label: "Temp",     desc: "Temporary Staffing" },
  { key: "rec",      label: "Rec",      desc: "Recruitment" },
  { key: "projects", label: "Projects", desc: "Project-Based" },
  { key: "bd",       label: "BD",       desc: "Business Dev" },
  { key: "accts",    label: "Accts",    desc: "Accounts" },
  { key: "admin",    label: "Admin",    desc: "Administration" },
  { key: "hr",       label: "HR",       desc: "Human Resources" },
  { key: "others",   label: "Others",   desc: "Others" },
];

const EMPTY_COST_HEAD = {
  os: 0, temp: 0, rec: 0, projects: 0, bd: 0,
  accts: 0, admin: 0, hr: 0, others: 0,
};

const EMPTY_FORM = {
  entity: "",
  department: "",
  emp_code: "",
  name: "",
  father_name: "",
  designation: "",
  location: "",
  email: "",
  dob: "",
  doj: "",
  last_working_day: "",
  status: "Active",
  ctc: "",
  pf: "",
  esi: "",
  bonus: "",
  variable: "",
  other_component: "",
  reimbursement: "",
  cost_head_breakup: { ...EMPTY_COST_HEAD },
  client_focus: [{ clientName: "", percentage: "" }],
};

const AddInternalTeamModal = ({ isOpen, onClose, editingEmployee, onSaved }) => {
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [errors, setErrors]               = useState({});
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [emailOptions, setEmailOptions]   = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // ── Fetch emails ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setLoadingEmails(true);
    supabase
      .from("user_roles")
      .select("email, role")
      .order("email", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setEmailOptions(data);
        setLoadingEmails(false);
      });
  }, [isOpen]);

  // ── Pre-fill or reset ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (editingEmployee) {
      setFormData({
        entity:          editingEmployee.entity          || "",
        department:      editingEmployee.department      || "",
        emp_code:        editingEmployee.emp_code        || "",
        name:            editingEmployee.name            || "",
        father_name:     editingEmployee.father_name     || "",
        designation:     editingEmployee.designation     || "",
        location:        editingEmployee.location        || "",
        email:           editingEmployee.email           || "",
        dob:             editingEmployee.dob             || "",
        doj:             editingEmployee.doj             || "",
        last_working_day: editingEmployee.last_working_day || "",
        status:          editingEmployee.status          || "Active",
        ctc:             String(editingEmployee.ctc          || ""),
        pf:              String(editingEmployee.pf           || ""),
        esi:             String(editingEmployee.esi          || ""),
        bonus:           String(editingEmployee.bonus        || ""),
        variable:        String(editingEmployee.variable     || ""),
        other_component: String(editingEmployee.other_component || ""),
        reimbursement:   String(editingEmployee.reimbursement   || ""),
        cost_head_breakup: editingEmployee.cost_head_breakup || { ...EMPTY_COST_HEAD },
        client_focus: editingEmployee.client_focus?.length
          ? editingEmployee.client_focus
          : [{ clientName: "", percentage: "" }],
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
    setSaveError("");
    setShowDeleteConfirm(false);
  }, [editingEmployee, isOpen]);

  // ── Helpers ───────────────────────────────────────────────
  const set = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setCostHead = (key, value) => {
    const num = Math.min(100, Math.max(0, parseInt(value) || 0));
    setFormData((prev) => ({
      ...prev,
      cost_head_breakup: { ...prev.cost_head_breakup, [key]: num },
    }));
    if (errors.cost_head_breakup)
      setErrors((prev) => ({ ...prev, cost_head_breakup: "" }));
  };

  const setClientFocus = (index, field, value) => {
    const updated = formData.client_focus.map((c, i) =>
      i === index
        ? { ...c, [field]: field === "percentage" ? parseInt(value) || "" : value }
        : c
    );
    setFormData((prev) => ({ ...prev, client_focus: updated }));
    if (errors.client_focus) setErrors((prev) => ({ ...prev, client_focus: "" }));
  };

  const addClient = () =>
    setFormData((prev) => ({
      ...prev,
      client_focus: [...prev.client_focus, { clientName: "", percentage: "" }],
    }));

  const removeClient = (i) =>
    setFormData((prev) => ({
      ...prev,
      client_focus: prev.client_focus.filter((_, idx) => idx !== i),
    }));

  // ── Totals ────────────────────────────────────────────────
  const costTotal = Object.values(formData.cost_head_breakup).reduce(
    (s, v) => s + (parseInt(v) || 0), 0
  );
  const filledClients = formData.client_focus.filter((c) => c.clientName.trim());
  const clientTotal   = formData.client_focus.reduce(
    (s, c) => s + (parseInt(c.percentage) || 0), 0
  );

  // ── Validation ────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.entity)      e.entity      = "Entity is required";
    if (!formData.department)  e.department  = "Department is required";
    if (!formData.emp_code)    e.emp_code    = "Employee Code is required";
    if (!formData.name)        e.name        = "Name is required";
    if (!formData.designation) e.designation = "Designation is required";
    if (!formData.doj)         e.doj         = "Date of Joining is required";
    if (!formData.ctc)         e.ctc         = "CTC is required";
    if (costTotal !== 100)
      e.cost_head_breakup = `Total must be 100% (currently ${costTotal}%)`;
    if (filledClients.length > 0 && clientTotal !== 100)
      e.client_focus = `Client % must total 100% (currently ${clientTotal}%)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError("");

    const payload = {
      entity:           formData.entity,
      department:       formData.department,
      emp_code:         formData.emp_code.trim(),
      name:             formData.name.trim(),
      father_name:      formData.father_name.trim()  || null,
      designation:      formData.designation.trim(),
      location:         formData.location.trim()     || null,
      email:            formData.email               || null,
      dob:              formData.dob                 || null,
      doj:              formData.doj,
      last_working_day: formData.last_working_day    || null,
      status:           formData.status,
      ctc:              parseFloat(formData.ctc)             || 0,
      pf:               parseFloat(formData.pf)              || 0,
      esi:              parseFloat(formData.esi)             || 0,
      bonus:            parseFloat(formData.bonus)           || 0,
      variable:         parseFloat(formData.variable)        || 0,
      other_component:  parseFloat(formData.other_component) || 0,
      reimbursement:    parseFloat(formData.reimbursement)   || 0,
      cost_head_breakup: formData.cost_head_breakup,
      client_focus: formData.client_focus.filter((c) => c.clientName.trim()),
    };

    try {
      const { data: existingEmp } = await supabase
        .from("internal_team")
        .select("id")
        .eq("emp_code", formData.emp_code.trim())
        .neq("id", editingEmployee?.id || "")
        .maybeSingle();

      if (existingEmp) {
        setSaveError("Employee code already exists.");
        setSaving(false);
        return;
      }

      let error;
      if (editingEmployee?.id) {
        ({ error } = await supabase
          .from("internal_team")
          .update(payload)
          .eq("id", editingEmployee.id));
      } else {
        ({ error } = await supabase.from("internal_team").insert([payload]));
      }
      if (error) throw error;
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editingEmployee?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("internal_team")
        .delete()
        .eq("id", editingEmployee.id);
      if (error) throw error;
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err.message || "Failed to delete.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Shared input class — always black text
  const inputCls = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder-gray-400 ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
    }`;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999]">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Delete Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center z-[100000]"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Employee?</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will permanently delete{" "}
                <strong className="text-gray-900">{editingEmployee?.name}</strong>.{" "}
                This cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-60 flex items-center justify-center space-x-2 transition-colors"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>{deleting ? "Deleting…" : "Yes, Delete"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center sticky top-0 z-10 rounded-t-2xl flex-shrink-0">
            <h3 className="text-base font-bold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              {editingEmployee ? "Edit Team Member" : "Add Internal Team Member"}
            </h3>
            <div className="flex items-center space-x-2">
              {editingEmployee && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">

            {/* ── Section 1: Basic Information ── */}
            <Section icon={<Briefcase className="w-4 h-4" />} title="Basic Information">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Entity" required error={errors.entity}>
                  <select
                    value={formData.entity}
                    onChange={(e) => set("entity", e.target.value)}
                    className={inputCls("entity")}
                  >
                    <option value="" className="text-gray-400">Select Entity</option>
                    <option className="text-gray-900">Verto India Pvt Ltd</option>
                    <option className="text-gray-900">Verto Global LLC</option>
                    <option className="text-gray-900">Verto UK Ltd</option>
                  </select>
                </Field>
                <Field label="Department" required error={errors.department}>
                  <select
                    value={formData.department}
                    onChange={(e) => set("department", e.target.value)}
                    className={inputCls("department")}
                  >
                    <option value="" className="text-gray-400">Select Department</option>
                    {["Common","Ops","Temp","Rec","BD","Accts","HR","Admin","IT","Projects","Others"].map((d) => (
                      <option key={d} className="text-gray-900">{d}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Emp Code" required error={errors.emp_code}>
                  <input
                    type="text"
                    value={formData.emp_code}
                    onChange={(e) => set("emp_code", e.target.value)}
                    className={inputCls("emp_code")}
                    placeholder="EMP001"
                  />
                </Field>
                <Field label="Full Name" required error={errors.name}>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={inputCls("name")}
                    placeholder="Full Name"
                  />
                </Field>
                <Field label="Father's Name">
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => set("father_name", e.target.value)}
                    className={inputCls("")}
                    placeholder="Father's Name"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Designation" required error={errors.designation}>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => set("designation", e.target.value)}
                    className={inputCls("designation")}
                    placeholder="Job Title"
                  />
                </Field>
                <Field label="Location">
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => set("location", e.target.value)}
                    className={inputCls("")}
                    placeholder="City"
                  />
                </Field>

                {/* Email Dropdown */}
                <Field label="Login Email (from User Roles)">
                  <div className="relative">
                    <select
                      value={formData.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={inputCls("email")}
                      disabled={loadingEmails}
                    >
                      <option value="" className="text-gray-400">
                        {loadingEmails ? "Loading emails…" : "— Select Login Email —"}
                      </option>
                      {emailOptions.map((u) => (
                        <option key={u.email} value={u.email} className="text-gray-900">
                          {u.email} ({u.role})
                        </option>
                      ))}
                    </select>
                    {loadingEmails && (
                      <Loader2 className="absolute right-8 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Links this employee to their app login. Add users in User Management first.
                  </p>
                </Field>
              </div>
            </Section>

            {/* ── Section 2: Employment Details ── */}
            <Section icon={<Calendar className="w-4 h-4" />} title="Employment Details">
              <div className="grid grid-cols-4 gap-4">
                <Field label="Date of Birth">
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => set("dob", e.target.value)}
                    className={inputCls("")}
                  />
                </Field>
                <Field label="Date of Joining" required error={errors.doj}>
                  <input
                    type="date"
                    value={formData.doj}
                    onChange={(e) => set("doj", e.target.value)}
                    className={inputCls("doj")}
                  />
                </Field>
                <Field label="Last Working Day">
                  <input
                    type="date"
                    value={formData.last_working_day}
                    onChange={(e) => set("last_working_day", e.target.value)}
                    className={inputCls("")}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={formData.status}
                    onChange={(e) => set("status", e.target.value)}
                    className={inputCls("")}
                  >
                    <option className="text-gray-900" value="Active">Active</option>
                    <option className="text-gray-900" value="Not Active">Not Active</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* ── Section 3: Compensation ── */}
            <Section
              icon={<DollarSign className="w-4 h-4" />}
              title="Compensation Details (Annual, INR)"
            >
              <div className="grid grid-cols-4 gap-4">
                <Field label="CTC (Annual)" required error={errors.ctc}>
                  <MoneyInput value={formData.ctc}             onChange={(v) => set("ctc", v)}             error={errors.ctc} />
                </Field>
                <Field label="PF">
                  <MoneyInput value={formData.pf}              onChange={(v) => set("pf", v)} />
                </Field>
                <Field label="ESI">
                  <MoneyInput value={formData.esi}             onChange={(v) => set("esi", v)} />
                </Field>
                <Field label="Bonus">
                  <MoneyInput value={formData.bonus}           onChange={(v) => set("bonus", v)} />
                </Field>
                <Field label="Variable Pay">
                  <MoneyInput value={formData.variable}        onChange={(v) => set("variable", v)} />
                </Field>
                <Field label="Other Component">
                  <MoneyInput value={formData.other_component} onChange={(v) => set("other_component", v)} />
                </Field>
                <Field label="Reimbursement (Monthly)">
                  <MoneyInput value={formData.reimbursement}   onChange={(v) => set("reimbursement", v)} />
                </Field>
              </div>
            </Section>

            {/* ── Section 4: Cost Head Break Up ── */}
            <Section
              title="Cost Head Break Up"
              badge={
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  costTotal === 100 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                }`}>
                  {costTotal === 100 ? (
                    <span className="flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>100% ✓</span>
                    </span>
                  ) : (
                    `${costTotal}% / 100%`
                  )}
                </span>
              }
            >
              <p className="text-xs text-gray-600 -mt-2 mb-3">
                Split this employee's salary cost across departments. Must total exactly 100%.
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {COST_HEADS.map(({ key, label, desc }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      {label}
                      <span className="block text-gray-500 font-normal text-[10px]">{desc}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.cost_head_breakup[key]}
                        onChange={(e) => setCostHead(key, e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 pr-7 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono transition-colors ${
                          formData.cost_head_breakup[key] > 0
                            ? "border-blue-300 bg-blue-50 text-blue-800"
                            : "border-gray-300 bg-white text-gray-900"
                        }`}
                      />
                      <span className="absolute right-2 top-2 text-gray-500 text-xs font-semibold">%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Visual bar */}
              {costTotal > 0 && (
                <div className="mt-3 h-2 rounded-full overflow-hidden bg-gray-100 flex">
                  {COST_HEADS.filter((h) => formData.cost_head_breakup[h.key] > 0).map(({ key, label }, i) => (
                    <div
                      key={key}
                      title={`${label}: ${formData.cost_head_breakup[key]}%`}
                      style={{ width: `${formData.cost_head_breakup[key]}%` }}
                      className={`h-full transition-all ${["bg-blue-500","bg-indigo-500","bg-violet-500","bg-purple-500","bg-pink-500","bg-rose-500","bg-orange-500","bg-amber-500","bg-teal-500"][i % 9]}`}
                    />
                  ))}
                </div>
              )}

              {errors.cost_head_breakup && (
                <p className="text-sm text-red-700 font-medium flex items-center mt-1">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {errors.cost_head_breakup}
                </p>
              )}
            </Section>

            {/* ── Section 5: Client Focus ── */}
            <Section
              title="Client Name(s) & % Focus"
              subtitle="Optional — allocate this employee's time/cost across clients. Must total 100% if filled."
              badge={
                filledClients.length > 0 && (
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    clientTotal === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {clientTotal}%
                  </span>
                )
              }
              action={
                <button
                  type="button"
                  onClick={addClient}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Client</span>
                </button>
              }
            >
              <div className="space-y-2">
                {formData.client_focus.map((client, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={client.clientName}
                      onChange={(e) => setClientFocus(index, "clientName", e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 bg-white"
                      placeholder={`Client ${index + 1} name`}
                    />
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={client.percentage}
                        onChange={(e) => setClientFocus(index, "percentage", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono bg-white"
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-2 text-gray-500 text-xs font-semibold">%</span>
                    </div>
                    {formData.client_focus.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeClient(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.client_focus && (
                <p className="text-sm text-amber-800 font-medium flex items-center mt-1">
                  <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                  {errors.client_focus}
                </p>
              )}
            </Section>

            {/* Save Error */}
            {saveError && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || costTotal !== 100}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center space-x-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {saving ? "Saving…" : editingEmployee ? "Update Member" : "Save Member"}
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>,
    document.body
  );
};

// ─── Sub-components ───────────────────────────────────────────
const Section = ({ icon, title, subtitle, badge, action, children }) => (
  <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-gray-900 flex items-center space-x-2 text-sm">
          {icon && <span className="text-blue-600">{icon}</span>}
          <span>{title}</span>
          {badge && <span className="ml-2">{badge}</span>}
        </h4>
        {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-800 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-red-600 font-medium mt-1 flex items-center">
        <AlertCircle className="w-3 h-3 mr-1" />
        {error}
      </p>
    )}
  </div>
);

const MoneyInput = ({ value, onChange, error }) => (
  <div className="relative">
    <span className="absolute left-3 top-2 text-gray-500 text-sm font-semibold">₹</span>
    <input
      type="number"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-colors ${
        error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
      }`}
      placeholder="0"
    />
  </div>
);

export default AddInternalTeamModal;