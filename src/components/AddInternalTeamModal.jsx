import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/Auditlog.js";
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
  History,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import supabase from "../lib/supabaseClient";

// ─── Cost heads — 4 keys only (must match DB jsonb keys exactly) ─────────────
const COST_HEADS = [
  { key: "ops", label: "Ops", desc: "Operations" },
  { key: "temp", label: "Temp", desc: "Temporary Staffing" },
  { key: "rec", label: "Rec", desc: "Recruitment" },
  { key: "projects", label: "Projects", desc: "Project-Based" },
];

const EMPTY_COST_HEAD = { ops: 0, temp: 0, rec: 0, projects: 0 };
const EMPTY_COST_SHIFT = {
  effective_month: "",
  effective_year: "",
  cost_head_breakup: { ...EMPTY_COST_HEAD },
  ctc: "",
  variable: "",
  pf: "",
  esi: "",
  bonus: "",
  reimbursement: "",
  other_component: "",
  client_focus: [{ clientName: "", percentage: "" }],
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
  gross_value: "",
  cost_head_breakup: { ...EMPTY_COST_HEAD },
  client_focus: [{ clientName: "", percentage: "" }],
  show_cost_shift: false,
  cost_shift: { ...EMPTY_COST_SHIFT },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normaliseCostHead = (raw) => ({
  ops: Number(raw?.ops || raw?.OS || 0),
  temp: Number(raw?.temp || 0),
  rec: Number(raw?.rec || 0),
  projects: Number(raw?.projects || 0),
});

// ─── Download Template ────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const TEMPLATE_COLUMNS = [
    "emp_code",
    "name",
    "father_name",
    "entity",
    "department",
    "designation",
    "location",
    "email",
    "dob",
    "doj",
    "last_working_day",
    "status",
    "ctc",
    "pf",
    "esi",
    "bonus",
    "variable",
    "other_component",
    "reimbursement",
    "gross_value",
    "ops",
    "temp",
    "rec",
    "projects",
  ];
  const sampleRow = {
    emp_code: "EMP001",
    name: "John Doe",
    father_name: "James Doe",
    entity: "Verto India Pvt Ltd",
    department: "OS",
    designation: "Manager",
    location: "Mumbai",
    email: "john@example.com",
    dob: "1990-01-15",
    doj: "2023-04-01",
    last_working_day: "",
    status: "Active",
    ctc: 50000,
    pf: 1800,
    esi: 0,
    bonus: 5000,
    variable: 10000,
    other_component: 0,
    reimbursement: 2000,
    gross_value: 68800,
    ops: 100,
    temp: 0,
    rec: 0,
    projects: 0,
  };
  const ws = XLSX.utils.json_to_sheet([sampleRow], {
    header: TEMPLATE_COLUMNS,
  });
  ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Internal Team");
  XLSX.writeFile(wb, "internal_team_template.xlsx");
  logExport({
    action: EXPORT_ACTIONS.TEMPLATE,
    category: "Internal Cost",
    description: "Downloaded Internal Team Upload Template",
    meta: { file: "internal_team_template.xlsx" },
  });
};

const AddInternalTeamModal = ({
  isOpen,
  onClose,
  editingEmployee,
  onSaved,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailOptions, setEmailOptions] = useState([]);
  const [entityOptions, setEntityOptions] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [costHistory, setCostHistory] = useState([]);
  const [emailSearch, setEmailSearch] = useState("");
  const [emailDropOpen, setEmailDropOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftSuccess, setShiftSuccess] = useState(false);
  const [grossManuallyEdited, setGrossManuallyEdited] = useState(false);

  // Bulk Upload states
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkParsed, setBulkParsed] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkStep, setBulkStep] = useState("idle");
  const [showBulkSection, setShowBulkSection] = useState(false);
  const bulkFileRef = useRef(null);

  // ── Auto gross ───────────────────────────────────────────────────────────────
  const calculatedGrossValue = (
    parseFloat(formData.ctc || 0) +
    parseFloat(formData.pf || 0) +
    parseFloat(formData.esi || 0) +
    parseFloat(formData.bonus || 0) +
    parseFloat(formData.other_component || 0) +
    parseFloat(formData.reimbursement || 0)
  ).toFixed(2);

  // ── Fetch emails ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Fetch email options from user_roles
    setLoadingEmails(true);
    supabase
      .from("user_roles")
      .select("email, role")
      .order("email")
      .then(({ data, error }) => {
        if (!error && data) setEmailOptions(data);
        setLoadingEmails(false);
      });

    // Fetch entity options from entity_master
    supabase
      .from("entity_master")
      .select("entity_name")
      .order("entity_name")
      .then(({ data, error }) => {
        if (!error && data) {
          setEntityOptions(data.map((e) => e.entity_name));
        }
      });
  }, [isOpen]);

  // ── Fetch cost history ────────────────────────────────────────────────────────
  const fetchCostHistory = async (empId) => {
    if (!empId) {
      setCostHistory([]);
      return;
    }
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("internal_team_cost_history")
      .select("*")
      .eq("employee_id", empId)
      .order("effective_year", { ascending: false })
      .order("effective_month", { ascending: false });
    if (!error && data) setCostHistory(data);
    setHistoryLoading(false);
  };

  // ── Pre-fill / reset ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (editingEmployee) {
      setFormData({
        entity: editingEmployee.entity || "",
        department: editingEmployee.department || "",
        emp_code: editingEmployee.emp_code || "",
        name: editingEmployee.name || "",
        father_name: editingEmployee.father_name || "",
        designation: editingEmployee.designation || "",
        location: editingEmployee.location || "",
        email: editingEmployee.email || "",
        dob: editingEmployee.dob || "",
        doj: editingEmployee.doj || "",
        last_working_day: editingEmployee.last_working_day || "",
        status: editingEmployee.status || "Active",
        ctc: String(editingEmployee.ctc || ""),
        pf: String(editingEmployee.pf || ""),
        esi: String(editingEmployee.esi || ""),
        bonus: String(editingEmployee.bonus || ""),
        variable: String(editingEmployee.variable || ""),
        other_component: String(editingEmployee.other_component || ""),
        reimbursement: String(editingEmployee.reimbursement || ""),
        gross_value: String(editingEmployee.gross_value || ""),
        cost_head_breakup: normaliseCostHead(editingEmployee.cost_head_breakup),
        client_focus: editingEmployee.client_focus?.length
          ? editingEmployee.client_focus
          : [{ clientName: "", percentage: "" }],
        show_cost_shift: false,
        cost_shift: { ...EMPTY_COST_SHIFT },
      });
      fetchCostHistory(editingEmployee.id);
    } else {
      setFormData(EMPTY_FORM);
      setCostHistory([]);
    }
    setErrors({});
    setSaveError("");
    setShiftSuccess(false);
    setShowDeleteConfirm(false);
    setGrossManuallyEdited(false);
    // Reset bulk upload
    setBulkFile(null);
    setBulkParsed(null);
    setBulkResult(null);
    setBulkStep("idle");
    setShowBulkSection(false);
  }, [editingEmployee, isOpen]);

  // ── Auto gross update ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!grossManuallyEdited) {
      setFormData((prev) => ({ ...prev, gross_value: calculatedGrossValue }));
    }
  }, [
    formData.ctc,
    formData.pf,
    formData.esi,
    formData.bonus,
    formData.other_component,
    formData.reimbursement,
    grossManuallyEdited,
  ]);

  // ── Setters ───────────────────────────────────────────────────────────────────
  const set = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  };

  const setCostHead = (key, value) => {
    const num = Math.min(100, Math.max(0, parseInt(value) || 0));
    setFormData((p) => ({
      ...p,
      cost_head_breakup: { ...p.cost_head_breakup, [key]: num },
    }));
    if (errors.cost_head_breakup)
      setErrors((p) => ({ ...p, cost_head_breakup: "" }));
  };

  const setShiftCostHead = (key, value) => {
    const num = Math.min(100, Math.max(0, parseInt(value) || 0));
    setFormData((p) => ({
      ...p,
      cost_shift: {
        ...p.cost_shift,
        cost_head_breakup: { ...p.cost_shift.cost_head_breakup, [key]: num },
      },
    }));
    if (errors.shift_breakup) setErrors((p) => ({ ...p, shift_breakup: "" }));
  };

  const setShiftField = (field, value) => {
    setFormData((p) => ({
      ...p,
      cost_shift: { ...p.cost_shift, [field]: value },
    }));
    if (errors[`shift_${field}`])
      setErrors((p) => ({ ...p, [`shift_${field}`]: "" }));
  };

  const setClientFocus = (index, field, value) => {
    const updated = formData.client_focus.map((c, i) =>
      i === index
        ? {
            ...c,
            [field]: field === "percentage" ? parseInt(value) || "" : value,
          }
        : c
    );
    setFormData((p) => ({ ...p, client_focus: updated }));
    if (errors.client_focus) setErrors((p) => ({ ...p, client_focus: "" }));
  };

  const setShiftClientFocus = (index, field, value) => {
    const current = formData.cost_shift.client_focus || [];
    const updated = current.map((c, i) =>
      i === index
        ? {
            ...c,
            [field]: field === "percentage" ? parseInt(value) || "" : value,
          }
        : c
    );
    setFormData((p) => ({
      ...p,
      cost_shift: { ...p.cost_shift, client_focus: updated },
    }));
  };

  const addClient = () =>
    setFormData((p) => ({
      ...p,
      client_focus: [...p.client_focus, { clientName: "", percentage: "" }],
    }));
  const removeClient = (i) =>
    setFormData((p) => ({
      ...p,
      client_focus: p.client_focus.filter((_, idx) => idx !== i),
    }));

  const addShiftClient = () =>
    setFormData((p) => ({
      ...p,
      cost_shift: {
        ...p.cost_shift,
        client_focus: [
          ...(p.cost_shift.client_focus || []),
          { clientName: "", percentage: "" },
        ],
      },
    }));

  const removeShiftClient = (i) =>
    setFormData((p) => ({
      ...p,
      cost_shift: {
        ...p.cost_shift,
        client_focus: (p.cost_shift.client_focus || []).filter(
          (_, idx) => idx !== i
        ),
      },
    }));

  // ── Totals ────────────────────────────────────────────────────────────────────
  const costTotal = Object.values(formData.cost_head_breakup).reduce(
    (s, v) => s + (parseInt(v) || 0),
    0
  );
  const shiftTotal = Object.values(
    formData.cost_shift.cost_head_breakup
  ).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const filledClients = formData.client_focus.filter((c) =>
    c.clientName.trim()
  );
  const clientTotal = formData.client_focus.reduce(
    (s, c) => s + (parseInt(c.percentage) || 0),
    0
  );

  // ── Validate ──────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.entity) e.entity = "Entity is required";
    if (!formData.department) e.department = "Department is required";
    if (!formData.emp_code) e.emp_code = "Employee Code is required";
    if (!formData.name) e.name = "Name is required";
    if (!formData.designation) e.designation = "Designation is required";
    if (!formData.doj) e.doj = "Date of Joining is required";
    if (!formData.ctc) e.ctc = "CTC is required";
    if (costTotal !== 100)
      e.cost_head_breakup = `Total must be 100% (currently ${costTotal}%)`;
    if (filledClients.length > 0 && clientTotal !== 100)
      e.client_focus = `Client % must total 100% (currently ${clientTotal}%)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError("");

    const payload = {
      entity: formData.entity,
      department: formData.department,
      emp_code: formData.emp_code.trim(),
      name: formData.name.trim(),
      father_name: formData.father_name.trim() || null,
      designation: formData.designation.trim(),
      location: formData.location.trim() || null,
      email: formData.email || null,
      dob: formData.dob || null,
      doj: formData.doj,
      last_working_day: formData.last_working_day || null,
      status: formData.status,
      ctc: parseFloat(formData.ctc) || 0,
      pf: parseFloat(formData.pf) || 0,
      esi: parseFloat(formData.esi) || 0,
      bonus: parseFloat(formData.bonus) || 0,
      variable: parseFloat(formData.variable) || 0,
      other_component: parseFloat(formData.other_component) || 0,
      reimbursement: parseFloat(formData.reimbursement) || 0,
      gross_value: parseFloat(formData.gross_value || 0),
      cost_head_breakup: {
        ops: parseInt(formData.cost_head_breakup.ops) || 0,
        temp: parseInt(formData.cost_head_breakup.temp) || 0,
        rec: parseInt(formData.cost_head_breakup.rec) || 0,
        projects: parseInt(formData.cost_head_breakup.projects) || 0,
      },
      client_focus: formData.client_focus.filter((c) => c.clientName.trim()),
    };

    try {
      const { data: existing } = await supabase
        .from("internal_team")
        .select("id")
        .eq("emp_code", payload.emp_code)
        .neq(
          "id",
          editingEmployee?.id || "00000000-0000-0000-0000-000000000000"
        )
        .maybeSingle();

      if (existing) {
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
      setSaveError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Save Cost Shift ───────────────────────────────────────────────────────────
  const handleSaveCostShift = async () => {
    const e = {};
    if (!formData.cost_shift.effective_month) e.shift_month = "Required";
    if (!formData.cost_shift.effective_year) e.shift_year = "Required";
    if (shiftTotal !== 100)
      e.shift_breakup = `Must total 100% (currently ${shiftTotal}%)`;
    if (Object.keys(e).length) {
      setErrors((p) => ({ ...p, ...e }));
      return;
    }
    if (!editingEmployee?.id) {
      setSaveError("Save the employee first.");
      return;
    }

    setShiftSaving(true);
    setShiftSuccess(false);
    const { error } = await supabase.from("internal_team_cost_history").upsert(
      {
        employee_id: editingEmployee.id,
        effective_month: parseInt(formData.cost_shift.effective_month),
        effective_year: parseInt(formData.cost_shift.effective_year),
        cost_head_breakup: {
          ops: parseInt(formData.cost_shift.cost_head_breakup.ops) || 0,
          temp: parseInt(formData.cost_shift.cost_head_breakup.temp) || 0,
          rec: parseInt(formData.cost_shift.cost_head_breakup.rec) || 0,
          projects:
            parseInt(formData.cost_shift.cost_head_breakup.projects) || 0,
        },
        ctc: parseFloat(formData.cost_shift.ctc) || null,
        variable: parseFloat(formData.cost_shift.variable) || null,
        pf: parseFloat(formData.cost_shift.pf) || null,
        esi: parseFloat(formData.cost_shift.esi) || null,
        bonus: parseFloat(formData.cost_shift.bonus) || null,
        reimbursement: parseFloat(formData.cost_shift.reimbursement) || null,
        other_component:
          parseFloat(formData.cost_shift.other_component) || null,
        client_focus: (formData.cost_shift.client_focus || []).filter((c) =>
          c.clientName?.trim()
        ),
      },
      { onConflict: "employee_id,effective_month,effective_year" }
    );
    if (error) {
      setSaveError(error.message);
    } else {
      setFormData((p) => ({
        ...p,
        show_cost_shift: false,
        cost_shift: { ...EMPTY_COST_SHIFT },
      }));
      setErrors((p) => {
        const n = { ...p };
        delete n.shift_month;
        delete n.shift_year;
        delete n.shift_breakup;
        return n;
      });
      setShiftSuccess(true);
      await fetchCostHistory(editingEmployee.id);
      setTimeout(() => setShiftSuccess(false), 3000);
    }
    setShiftSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
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

  // ─── Bulk Upload helpers ──────────────────────────────────────────────────────
  const REQUIRED_BULK = [
    "emp_code",
    "name",
    "entity",
    "department",
    "designation",
    "ctc",
    "doj",
  ];

  const DEPT_OPTIONS = [
    "Common",
    "OS",
    "Temp",
    "Rec",
    "BD",
    "Accts",
    "HR",
    "Admin",
    "IT",
    "Projects",
    "Others",
  ];

  // Change 1: Add DEPT_ALIAS_MAP + normalizeDept()
  const DEPT_ALIAS_MAP = {
    // OS / Operations
    os: "OS",
    ops: "OS",
    operation: "OS",
    operations: "OS",
    // Temp
    temp: "Temp",
    temporary: "Temp",
    "temporary staffing": "Temp",
    // Rec / Recruitment
    rec: "Rec",
    recruitment: "Rec",
    recruit: "Rec",
    // BD / Business Development
    bd: "BD",
    "business development": "BD",
    "business dev": "BD",
    bizdev: "BD",
    // Accts / Accounts
    accts: "Accts",
    accounts: "Accts",
    account: "Accts",
    finance: "Accts",
    // HR
    hr: "HR",
    "human resources": "HR",
    // Admin
    admin: "Admin",
    administration: "Admin",
    // IT
    it: "IT",
    "information technology": "IT",
    // Projects
    projects: "Projects",
    project: "Projects",
    // Common
    common: "Common",
    general: "Common",
    // Others
    others: "Others",
    other: "Others",
    misc: "Others",
    miscellaneous: "Others",
  };

  const normalizeDept = (raw) => {
    if (!raw) return "";
    const lower = String(raw).trim().toLowerCase();
    // First check alias map
    if (DEPT_ALIAS_MAP[lower]) return DEPT_ALIAS_MAP[lower];
    // Then check if it already matches canonical (case-insensitive)
    const canonical = DEPT_OPTIONS.find((d) => d.toLowerCase() === lower);
    if (canonical) return canonical;
    // Return original trimmed (will fail validation and show error)
    return String(raw).trim();
  };

  const parseExcelDate = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    if (!s || s.toLowerCase() === "nulls" || s.toLowerCase() === "null")
      return null;

    if (/^\d+$/.test(s)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + Number(s) * 86400000);
      return date.toISOString().split("T")[0];
    }

    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      let [, d, mo, y] = m;
      if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
      return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return null;
  };

  const parseRows = (rawRows) => {
    const valid = [];
    const errors = [];
    rawRows.forEach((raw, idx) => {
      const rowNum = idx + 2;
      const rowErrors = [];
      const str = (k) => String(raw[k] || "").trim();

      // Change 3: Add deptNorm and entityNorm variables
      const deptNorm = normalizeDept(str("department"));
      const entityNorm = str("entity");


      const num = (k) => {
        const v = parseFloat(str(k));
        return isNaN(v) ? 0 : v;
      };
      const intV = (k) => {
        const v = parseInt(str(k));
        return isNaN(v) ? 0 : v;
      };

      REQUIRED_BULK.forEach((f) => {
        if (!str(f)) rowErrors.push(`"${f}" is required`);
      });
      if (str("doj") && !parseExcelDate(raw.doj))
        rowErrors.push(`Invalid "doj" date: "${str("doj")}"`);

      // Change 4: Use normalized values for validation
      if (
        str("entity") &&
        entityOptions.length > 0 &&
        !entityOptions.some(
          (e) =>
            e.trim().toLowerCase() ===
            entityNorm.trim().toLowerCase()
        )
      ) {
        rowErrors.push(
          `Invalid entity: "${str(
            "entity"
          )}" — expected one of: ${entityOptions.join(", ")}`
        );
      }
      if (str("department") && !DEPT_OPTIONS.includes(deptNorm))
        rowErrors.push(
          `Invalid department: "${str(
            "department"
          )}" — expected one of: ${DEPT_OPTIONS.join(", ")}`
        );

      const ops = intV("ops");
      const temp = intV("temp");
      const rec = intV("rec");
      const projects = intV("projects");
      const costSum = ops + temp + rec + projects;
      if (costSum !== 100)
        rowErrors.push(`Cost heads sum to ${costSum}% — must equal 100`);

      const row = {
        emp_code: str("emp_code"),
        name: str("name"),
        father_name: str("father_name") || null,
        // Change 5: Use normalized values in the row object
        entity:
          entityOptions.find(
            (e) =>
              e.trim().toLowerCase() ===
              entityNorm.trim().toLowerCase()
          ) || entityNorm,
        department: deptNorm,
        designation: str("designation"),
        location: str("location") || null,
        email: str("email") || null,
        dob: parseExcelDate(raw.dob),
        doj: parseExcelDate(raw.doj),
        last_working_day: parseExcelDate(raw.last_working_day),
        status: str("status") || "Active",
        ctc: num("ctc"),
        pf: num("pf"),
        esi: num("esi"),
        bonus: num("bonus"),
        variable: num("variable"),
        other_component: num("other_component"),
        reimbursement: num("reimbursement"),
        gross_value:
          num("gross_value") ||
          num("ctc") +
            num("pf") +
            num("esi") +
            num("bonus") +
            num("other_component") +
            num("reimbursement"),
        cost_head_breakup: { ops, temp, rec, projects },
        client_focus: [],
      };

      if (rowErrors.length > 0)
        errors.push({
          rowNum,
          emp_code: str("emp_code") || `Row ${rowNum}`,
          errors: rowErrors,
        });
      else valid.push(row);
    });
    return { valid, errors };
  };

  const handleBulkFile = (file) => {
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const filtered = rawRows.filter(
        (r) =>
          String(r.emp_code || "").toLowerCase() !== "unique. existing = update"
      );
      setBulkParsed(parseRows(filtered));
      setBulkStep("preview");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkUpload = async () => {
    if (!bulkParsed?.valid?.length) return;
    setBulkUploading(true);
    try {
      const empCodes = bulkParsed.valid.map((r) => r.emp_code);

      const { data: existing } = await supabase
        .from("internal_team")
        .select("emp_code")
        .in("emp_code", empCodes);
      const existingSet = new Set((existing || []).map((r) => r.emp_code));

      const { error } = await supabase
        .from("internal_team")
        .upsert(bulkParsed.valid, { onConflict: "emp_code" });

      if (error) throw error;

      const updated = bulkParsed.valid.filter((r) =>
        existingSet.has(r.emp_code)
      ).length;
      const inserted = bulkParsed.valid.length - updated;
      setBulkResult({ inserted, updated, skipped: bulkParsed.errors.length });
      setBulkStep("done");
      onSaved?.();
    } catch (err) {
      setSaveError(err.message || "Bulk upload failed.");
    } finally {
      setBulkUploading(false);
    }
  };

  const resetBulk = () => {
    setBulkFile(null);
    setBulkParsed(null);
    setBulkResult(null);
    setBulkStep("idle");
  };

  if (!isOpen) return null;

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

      {/* Delete Confirm */}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete Employee?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Permanently delete <strong>{editingEmployee?.name}</strong>.
                Cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-60 flex items-center justify-center space-x-2"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
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
              {editingEmployee
                ? "Edit Team Member"
                : "Add Internal Team Member"}
            </h3>
            <div className="flex items-center space-x-2">
              {editingEmployee && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
            {/* ── Section 1: Basic Information ── */}
            <Section
              icon={<Briefcase className="w-4 h-4" />}
              title="Basic Information"
            >
              <div className="grid grid-cols-2 gap-4">
                <Field label="Entity" required error={errors.entity}>
                  <select
                    value={formData.entity}
                    onChange={(e) => set("entity", e.target.value)}
                    className={inputCls("entity")}
                  >
                    <option value="">Select Entity</option>
                    {entityOptions.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Department" required error={errors.department}>
                  <select
                    value={formData.department}
                    onChange={(e) => set("department", e.target.value)}
                    className={inputCls("department")}
                  >
                    <option value="">Select Department</option>
                    {[
                      { code: "Common", label: "Common" },
                      { code: "OS", label: "Operations" },
                      { code: "Temp", label: "Temporary Staffing" },
                      { code: "Rec", label: "Recruitment" },
                      { code: "BD", label: "Business Development" },
                      { code: "Accts", label: "Accounts" },
                      { code: "HR", label: "Human Resources" },
                      { code: "Admin", label: "Administration" },
                      { code: "IT", label: "Information Technology" },
                      { code: "Projects", label: "Projects" },
                      { code: "Others", label: "Others" },
                    ].map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.label}
                      </option>
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
                <Field label="Login Email (from User Roles)">
                  <div
                    className="relative"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setEmailDropOpen(false);
                      }
                    }}
                  >
                    <input
                      type="text"
                      value={emailSearch || formData.email}
                      onChange={(e) => {
                        setEmailSearch(e.target.value);
                        set("email", e.target.value);
                        setEmailDropOpen(true);
                      }}
                      onFocus={() => setEmailDropOpen(true)}
                      placeholder={
                        loadingEmails ? "Loading…" : "Type or search email…"
                      }
                      disabled={loadingEmails}
                      className={inputCls("email") + " pr-8"}
                      autoComplete="off"
                    />
                    {loadingEmails && (
                      <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                    )}
                    {emailDropOpen && !loadingEmails && (
                      <div className="absolute z-30 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {emailOptions
                          .filter((u) =>
                            u.email
                              .toLowerCase()
                              .includes(
                                (
                                  emailSearch ||
                                  formData.email ||
                                  ""
                                ).toLowerCase()
                              )
                          )
                          .sort((a, b) => {
                            const kw = (
                              emailSearch ||
                              formData.email ||
                              ""
                            ).toLowerCase();
                            return a.email.toLowerCase().startsWith(kw)
                              ? -1
                              : b.email.toLowerCase().startsWith(kw)
                              ? 1
                              : a.email.localeCompare(b.email);
                          })
                          .map((u) => (
                            <button
                              key={u.email}
                              type="button"
                              tabIndex={0}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                set("email", u.email);
                                setEmailSearch("");
                                setEmailDropOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                            >
                              <p className="font-medium text-gray-900">
                                {u.email}
                              </p>
                              <p className="text-xs text-gray-400">{u.role}</p>
                            </button>
                          ))}
                        {emailOptions.filter((u) =>
                          u.email
                            .toLowerCase()
                            .includes(
                              (
                                emailSearch ||
                                formData.email ||
                                ""
                              ).toLowerCase()
                            )
                        ).length === 0 && (
                          <p className="px-4 py-3 text-xs text-gray-400">
                            No match — value typed will be saved as-is
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Field>
              </div>
            </Section>

            {/* ── Section 2: Employment Details ── */}
            <Section
              icon={<Calendar className="w-4 h-4" />}
              title="Employment Details"
            >
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
                    <option value="Active">Active</option>
                    <option value="Not Active">Not Active</option>
                  </select>
                </Field>
              </div>
            </Section>

            {/* ── Section 3: Compensation ── */}
            <Section
              icon={<DollarSign className="w-4 h-4" />}
              title="Compensation Details (Monthly, INR)"
            >
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    field: "ctc",
                    label: "Fixed Salary (Monthly)",
                    required: true,
                  },
                  { field: "pf", label: "PF" },
                  { field: "esi", label: "ESI" },
                  { field: "bonus", label: "Bonus" },
                  { field: "variable", label: "Variable Pay" },
                  { field: "other_component", label: "Other Component" },
                  { field: "reimbursement", label: "Reimbursement" },
                ].map(({ field, label, required }) => (
                  <Field
                    key={field}
                    label={label}
                    required={required}
                    error={errors[field]}
                  >
                    <MoneyInput
                      value={formData[field]}
                      onChange={(v) => set(field, v)}
                      error={errors[field]}
                    />
                  </Field>
                ))}
                <Field label="Gross Value">
                  <MoneyInput
                    value={formData.gross_value || ""}
                    onChange={(v) => {
                      setGrossManuallyEdited(true);
                      set("gross_value", v);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setGrossManuallyEdited(false);
                      setFormData((p) => ({
                        ...p,
                        gross_value: calculatedGrossValue,
                      }));
                    }}
                    className="mt-1 text-[11px] text-blue-600 hover:text-blue-800 underline"
                  >
                    Reset Auto Calculation
                  </button>
                </Field>
              </div>
            </Section>

            {/* ── Section 4: Cost Head Break Up ── */}
            <Section
              title="Cost Head Break Up"
              subtitle={
                formData.doj
                  ? `Default allocation — effective from DOJ (${formData.doj})`
                  : "Default allocation — effective from Date of Joining"
              }
              badge={
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                    costTotal === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
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
                Split salary cost across departments. Must total exactly 100%.
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  {
                    label: "Rec Only",
                    v: { ops: 0, temp: 0, rec: 100, projects: 0 },
                  },
                  {
                    label: "Ops Only",
                    v: { ops: 100, temp: 0, rec: 0, projects: 0 },
                  },
                  {
                    label: "Temp Only",
                    v: { ops: 0, temp: 100, rec: 0, projects: 0 },
                  },
                  {
                    label: "Projects Only",
                    v: { ops: 0, temp: 0, rec: 0, projects: 100 },
                  },
                  {
                    label: "Rec+Ops 50/50",
                    v: { ops: 50, temp: 0, rec: 50, projects: 0 },
                  },
                  {
                    label: "Split 25 each",
                    v: { ops: 25, temp: 25, rec: 25, projects: 25 },
                  },
                  {
                    label: "Reset",
                    v: { ops: 0, temp: 0, rec: 0, projects: 0 },
                  },
                ].map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({ ...p, cost_head_breakup: b.v }))
                    }
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {COST_HEADS.map(({ key, label, desc }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-800 mb-1">
                      {label}
                      <span className="block text-gray-500 font-normal text-[10px]">
                        {desc}
                      </span>
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
                            : "border-gray-300 bg-white"
                        }`}
                      />
                      <span className="absolute right-2 top-2 text-gray-500 text-xs font-semibold">
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {costTotal > 0 && (
                <div className="mt-3 h-2 rounded-full overflow-hidden bg-gray-100 flex">
                  {COST_HEADS.filter(
                    (h) => formData.cost_head_breakup[h.key] > 0
                  ).map(({ key, label }, i) => (
                    <div
                      key={key}
                      title={`${label}: ${formData.cost_head_breakup[key]}%`}
                      style={{ width: `${formData.cost_head_breakup[key]}%` }}
                      className={`h-full transition-all ${
                        [
                          "bg-blue-500",
                          "bg-indigo-500",
                          "bg-violet-500",
                          "bg-purple-500",
                        ][i % 4]
                      }`}
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

            {/* ── Section 5: Cost Head Shift History ── */}
            <Section
              icon={<History className="w-4 h-4" />}
              title="Cost Head Shift History"
              subtitle="Record a cost allocation change effective from a specific month & year."
              action={
                editingEmployee?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.show_cost_shift) {
                        const now = new Date();
                        setFormData((p) => ({
                          ...p,
                          show_cost_shift: true,
                          cost_shift: {
                            effective_month: String(now.getMonth() + 1),
                            effective_year: String(now.getFullYear()),
                            ctc: String(editingEmployee?.ctc || p.ctc || ""),
                            variable: String(
                              editingEmployee?.variable || p.variable || ""
                            ),
                            pf: String(editingEmployee?.pf || p.pf || ""),
                            esi: String(editingEmployee?.esi || p.esi || ""),
                            bonus: String(
                              editingEmployee?.bonus || p.bonus || ""
                            ),
                            reimbursement: String(
                              editingEmployee?.reimbursement ||
                                p.reimbursement ||
                                ""
                            ),
                            other_component: String(
                              editingEmployee?.other_component ||
                                p.other_component ||
                                ""
                            ),
                            cost_head_breakup: {
                              ops:
                                editingEmployee?.cost_head_breakup?.ops ??
                                p.cost_head_breakup.ops,
                              temp:
                                editingEmployee?.cost_head_breakup?.temp ??
                                p.cost_head_breakup.temp,
                              rec:
                                editingEmployee?.cost_head_breakup?.rec ??
                                p.cost_head_breakup.rec,
                              projects:
                                editingEmployee?.cost_head_breakup?.projects ??
                                p.cost_head_breakup.projects,
                            },
                            client_focus: editingEmployee?.client_focus?.length
                              ? editingEmployee.client_focus
                              : p.client_focus?.filter((c) =>
                                  c.clientName?.trim()
                                ) || [{ clientName: "", percentage: "" }],
                          },
                        }));
                      } else {
                        set("show_cost_shift", false);
                      }
                    }}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      formData.show_cost_shift
                        ? "bg-gray-200 text-gray-700"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {formData.show_cost_shift ? "Cancel" : "Add Shift"}
                    </span>
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 italic">
                    Save employee first
                  </span>
                )
              }
            >
              <AnimatePresence>
                {shiftSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Cost shift saved!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {formData.show_cost_shift && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-4 mb-4">
                      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                        New Cost Shift Entry
                      </p>
                      <div className="grid grid-cols-2 gap-4 max-w-xs">
                        <Field
                          label="Effective Month"
                          required
                          error={errors.shift_month}
                        >
                          <select
                            value={formData.cost_shift.effective_month}
                            onChange={(e) => {
                              setFormData((p) => ({
                                ...p,
                                cost_shift: {
                                  ...p.cost_shift,
                                  effective_month: e.target.value,
                                },
                              }));
                              if (errors.shift_month)
                                setErrors((p) => ({
                                  ...p,
                                  shift_month: "",
                                }));
                            }}
                            className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              errors.shift_month
                                ? "border-red-400 bg-red-50"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            <option value="">Month</option>
                            {MONTH_NAMES.map((m, i) => (
                              <option key={m} value={i + 1}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          label="Effective Year"
                          required
                          error={errors.shift_year}
                        >
                          <select
                            value={formData.cost_shift.effective_year}
                            onChange={(e) => {
                              setFormData((p) => ({
                                ...p,
                                cost_shift: {
                                  ...p.cost_shift,
                                  effective_year: e.target.value,
                                },
                              }));
                              if (errors.shift_year)
                                setErrors((p) => ({
                                  ...p,
                                  shift_year: "",
                                }));
                            }}
                            className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              errors.shift_year
                                ? "border-red-400 bg-red-50"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            <option value="">Year</option>
                            {Array.from(
                              { length: 10 },
                              (_, i) => new Date().getFullYear() - 2 + i
                            ).map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-indigo-700 mb-2">
                          Salary Components (auto-filled — edit only what
                          changed)
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { field: "ctc", label: "Fixed Salary" },
                            { field: "pf", label: "PF" },
                            { field: "esi", label: "ESI" },
                            { field: "variable", label: "Variable" },
                            { field: "bonus", label: "Bonus" },
                            {
                              field: "reimbursement",
                              label: "Reimbursement",
                            },
                            {
                              field: "other_component",
                              label: "Other Component",
                            },
                          ].map(({ field, label }) => (
                            <div key={field}>
                              <label className="block text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                {label}
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-2 text-gray-400 text-xs">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.cost_shift[field]}
                                  onChange={(e) =>
                                    setShiftField(field, e.target.value)
                                  }
                                  className="w-full border border-indigo-200 bg-white rounded-lg pl-5 pr-2 py-1.5 text-xs font-mono font-bold text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-indigo-700">
                            Client Focus (auto-filled — edit only what changed)
                          </p>
                          <button
                            type="button"
                            onClick={addShiftClient}
                            className="flex items-center space-x-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-[10px] font-medium"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Client</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(formData.cost_shift.client_focus || []).map(
                            (client, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="text"
                                  value={client.clientName}
                                  onChange={(e) =>
                                    setShiftClientFocus(
                                      index,
                                      "clientName",
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 border border-indigo-200 rounded-lg px-2 py-1 text-xs text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                  placeholder={`Client ${index + 1} name`}
                                />
                                <div className="relative w-20">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={client.percentage}
                                    onChange={(e) =>
                                      setShiftClientFocus(
                                        index,
                                        "percentage",
                                        e.target.value
                                      )
                                    }
                                    className="w-full border border-indigo-200 rounded-lg px-2 py-1 pr-6 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center bg-white"
                                    placeholder="0"
                                  />
                                  <span className="absolute right-1.5 top-1 text-gray-500 text-[10px] font-semibold">
                                    %
                                  </span>
                                </div>
                                {(formData.cost_shift.client_focus || [])
                                  .length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeShiftClient(index)}
                                    className="p-0.5 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600">
                          New cost allocation. Must total 100%.
                        </p>
                        <span
                          className={`text-sm font-bold px-3 py-1 rounded-full ${
                            shiftTotal === 100
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {shiftTotal === 100 ? (
                            <span className="flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>100% ✓</span>
                            </span>
                          ) : (
                            `${shiftTotal}% / 100%`
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {COST_HEADS.map(({ key, label, desc }) => (
                          <div key={key}>
                            <label className="block text-xs font-semibold text-gray-800 mb-1">
                              {label}
                              <span className="block text-gray-500 font-normal text-[10px]">
                                {desc}
                              </span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={
                                  formData.cost_shift.cost_head_breakup[key]
                                }
                                onChange={(e) =>
                                  setShiftCostHead(key, e.target.value)
                                }
                                className={`w-full border rounded-lg px-3 py-2 pr-7 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-mono ${
                                  formData.cost_shift.cost_head_breakup[key] > 0
                                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                                    : "border-gray-300 bg-white text-gray-900"
                                }`}
                              />
                              <span className="absolute right-2 top-2 text-gray-500 text-xs font-semibold">
                                %
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {errors.shift_breakup && (
                        <p className="text-sm text-red-700 font-medium flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                          {errors.shift_breakup}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveCostShift}
                        disabled={shiftSaving}
                        className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {shiftSaving && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        <span>
                          {shiftSaving ? "Saving…" : "Save Cost Shift"}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {historyLoading ? (
                <div className="flex items-center space-x-2 text-sm text-gray-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading history…</span>
                </div>
              ) : costHistory.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-1">
                  {editingEmployee?.id
                    ? "No cost shifts yet."
                    : "Save employee first."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider">
                        <th className="px-3 py-2 text-left border-b border-gray-200">
                          Period
                        </th>
                        <th className="px-3 py-2 text-right border-b border-gray-200">
                          CTC
                        </th>
                        {COST_HEADS.map((h) => (
                          <th
                            key={h.key}
                            className="px-2 py-2 text-center border-b border-gray-200"
                          >
                            {h.label}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center border-b border-gray-200">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {costHistory.map((row, idx) => {
                        const norm = normaliseCostHead(row.cost_head_breakup);
                        const total = COST_HEADS.reduce(
                          (s, h) => s + (norm[h.key] || 0),
                          0
                        );
                        return (
                          <tr
                            key={row.id}
                            className={
                              idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                            }
                          >
                            <td className="px-3 py-2 font-semibold text-gray-900">
                              {MONTH_NAMES[row.effective_month - 1]}{" "}
                              {row.effective_year}
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">
                              {row.ctc
                                ? `₹${Number(row.ctc).toLocaleString("en-IN")}`
                                : "—"}
                            </td>
                            {COST_HEADS.map((h) => {
                              const v = norm[h.key] || 0;
                              return (
                                <td
                                  key={h.key}
                                  className={`px-2 py-2 text-center font-mono font-bold ${
                                    v > 0 ? "text-indigo-700" : "text-gray-300"
                                  }`}
                                >
                                  {v > 0 ? `${v}%` : "—"}
                                </td>
                              );
                            })}
                            <td
                              className={`px-3 py-2 text-center font-mono font-bold ${
                                total === 100
                                  ? "text-emerald-700"
                                  : "text-red-500"
                              }`}
                            >
                              {total}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* ── Section 6: Client Focus ── */}
            <Section
              title="Client Name(s) & % Focus"
              subtitle="Optional — allocate time/cost across clients. Must total 100% if filled."
              badge={
                filledClients.length > 0 && (
                  <span
                    className={`text-sm font-bold px-3 py-1 rounded-full ${
                      clientTotal === 100
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {clientTotal}%
                  </span>
                )
              }
              action={
                <button
                  type="button"
                  onClick={addClient}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
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
                      onChange={(e) =>
                        setClientFocus(index, "clientName", e.target.value)
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder={`Client ${index + 1} name`}
                    />
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={client.percentage}
                        onChange={(e) =>
                          setClientFocus(index, "percentage", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center bg-white"
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-2 text-gray-500 text-xs font-semibold">
                        %
                      </span>
                    </div>
                    {formData.client_focus.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeClient(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
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

            {/* ── Bulk Upload Section ── */}
            <Section
              icon={<Upload className="w-4 h-4" />}
              title="Bulk Upload Employees"
              subtitle="Upload multiple employees at once via Excel. Existing emp_codes will be updated."
              action={
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkSection((v) => !v);
                      resetBulk();
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      showBulkSection
                        ? "bg-gray-200 text-gray-700"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{showBulkSection ? "Close" : "Bulk Upload"}</span>
                  </button>
                </div>
              }
            >
              <AnimatePresence>
                {showBulkSection && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    {bulkStep === "idle" && (
                      <div
                        onClick={() => bulkFileRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50/40 rounded-xl p-8 text-center cursor-pointer transition-all"
                      >
                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">
                          Click to choose Excel file
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          .xlsx or .xls — uses the template format
                        </p>
                        <input
                          ref={bulkFileRef}
                          type="file"
                          accept=".xlsx,.xls"
                          className="hidden"
                          onChange={(e) => handleBulkFile(e.target.files?.[0])}
                        />
                      </div>
                    )}

                    {bulkStep === "preview" && bulkParsed && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[200px]">
                              {bulkFile?.name}
                            </p>
                          </div>
                          <button
                            onClick={resetBulk}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Change
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              label: "Total",
                              value:
                                bulkParsed.valid.length +
                                bulkParsed.errors.length,
                              color: "bg-blue-50 border-blue-200 text-blue-800",
                            },
                            {
                              label: "Valid",
                              value: bulkParsed.valid.length,
                              color:
                                "bg-emerald-50 border-emerald-200 text-emerald-800",
                            },
                            {
                              label: "Errors",
                              value: bulkParsed.errors.length,
                              color:
                                bulkParsed.errors.length > 0
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : "bg-gray-50 border-gray-200 text-gray-400",
                            },
                          ].map((c) => (
                            <div
                              key={c.label}
                              className={`border rounded-xl p-2 text-center ${c.color}`}
                            >
                              <p className="text-xl font-bold font-mono">
                                {c.value}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-wide">
                                {c.label}
                              </p>
                            </div>
                          ))}
                        </div>

                        {bulkParsed.errors.length > 0 && (
                          <div className="border border-red-200 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto bg-red-50">
                            <p className="text-xs font-bold text-red-700 mb-1">
                              Rows that will be skipped:
                            </p>
                            {bulkParsed.errors.map((e, i) => (
                              <div
                                key={i}
                                className="text-xs bg-white border border-red-100 rounded-lg p-2"
                              >
                                <p className="font-bold text-gray-800">
                                  Row {e.rowNum} — {e.emp_code}
                                </p>
                                {e.errors.map((msg, j) => (
                                  <p key={j} className="text-red-700">
                                    • {msg}
                                  </p>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={resetBulk}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-xs font-medium hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkUpload}
                            disabled={
                              bulkUploading || bulkParsed.valid.length === 0
                            }
                            className="flex items-center space-x-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                          >
                            {bulkUploading && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                            <span>
                              {bulkUploading
                                ? "Uploading…"
                                : `Upload ${bulkParsed.valid.length} Employees`}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {bulkStep === "done" && bulkResult && (
                      <div className="text-center py-4 space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                        <p className="text-sm font-bold text-gray-900">
                          Upload Complete!
                        </p>
                        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                          {[
                            {
                              label: "Inserted",
                              value: bulkResult.inserted,
                              color:
                                "bg-emerald-50 border-emerald-200 text-emerald-800",
                            },
                            {
                              label: "Updated",
                              value: bulkResult.updated,
                              color: "bg-blue-50 border-blue-200 text-blue-800",
                            },
                            {
                              label: "Skipped",
                              value: bulkResult.skipped,
                              color: "bg-gray-50 border-gray-200 text-gray-500",
                            },
                          ].map((c) => (
                            <div
                              key={c.label}
                              className={`border rounded-xl p-2 text-center ${c.color}`}
                            >
                              <p className="text-xl font-bold font-mono">
                                {c.value}
                              </p>
                              <p className="text-[10px] font-semibold uppercase tracking-wide">
                                {c.label}
                              </p>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            resetBulk();
                            setShowBulkSection(false);
                          }}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-800 font-medium hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || costTotal !== 100}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {saving
                    ? "Saving…"
                    : editingEmployee
                    ? "Update Member"
                    : "Save Member"}
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

// ─── Sub-components ──────────────────────────────────────────────────────────
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
    <span className="absolute left-3 top-2 text-gray-500 text-sm font-semibold">
      ₹
    </span>
    <input
      type="number"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
        error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
      }`}
      placeholder="0"
    />
  </div>
);

export default AddInternalTeamModal;
