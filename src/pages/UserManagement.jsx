import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  UserPlus,
  Mail,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  Users,
  Crown,
  Briefcase,
  User,
  RefreshCw,
  Pencil,
  X,
  Save,
  Shield,
  Trash2,
} from "lucide-react";

// ── Role config ──────────────────────────────────────────────────────────────
const ROLES = [
  {
    value: "intern",
    label: "Intern",
    icon: Shield,
    accent: "#d97706",
    pill: "bg-amber-50 text-amber-700 border border-amber-200",
    drop: "hover:bg-amber-50",
    selected: "bg-amber-50 text-amber-800",
  },
  {
    value: "employee",
    label: "Employee",
    icon: User,
    accent: "#64748b",
    pill: "bg-slate-100 text-slate-700 border border-slate-200",
    drop: "hover:bg-slate-50",
    selected: "bg-slate-100 text-slate-800",
  },
  {
    value: "manager",
    label: "Manager",
    icon: Briefcase,
    accent: "#4f46e5",
    pill: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    drop: "hover:bg-indigo-50",
    selected: "bg-indigo-50 text-indigo-800",
  },
  {
    value: "admin",
    label: "Admin",
    icon: Crown,
    accent: "#0ea5e9",
    pill: "bg-sky-50 text-sky-700 border border-sky-200",
    drop: "hover:bg-sky-50",
    selected: "bg-sky-50 text-sky-800",
  },
];

const rc = (role) => ROLES.find((r) => r.value === role) || ROLES[0];

// ── RoleDropdown — uses createPortal to escape modal overflow clipping ────────
const MENU_WIDTH = 160;
const MENU_HEIGHT = 135;

const RoleDropdown = ({ value, onChange, small = false }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const cfg = rc(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const clickedBtn = btnRef.current && btnRef.current.contains(e.target);
      const clickedMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!clickedBtn && !clickedMenu) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < MENU_HEIGHT + 12;
      setCoords({
        top: openUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
        left: Math.max(
          8,
          Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
        ),
      });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 font-semibold rounded-lg border transition-all
          ${small ? "px-2.5 py-1 text-xs" : "px-3.5 py-2.5 text-sm"}
          ${cfg.pill}`}
      >
        <cfg.icon className={small ? "w-3 h-3" : "w-4 h-4"} />
        {cfg.label}
        <ChevronDown
          className={`${
            small ? "w-3 h-3" : "w-3.5 h-3.5"
          } transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: MENU_WIDTH,
              zIndex: 999999,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.13, ease: "easeOut" }}
              className="bg-white rounded-xl border border-gray-100 py-1 overflow-hidden"
              style={{ boxShadow: "0 16px 48px -8px rgba(0,0,0,0.18)" }}
            >
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    onChange(r.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors
                  ${
                    value === r.value ? r.selected : `text-gray-700 ${r.drop}`
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <r.icon className="w-3.5 h-3.5" />
                    <span className="font-medium">{r.label}</span>
                  </div>
                  {value === r.value && <Check className="w-3 h-3" />}
                </button>
              ))}
            </motion.div>
          </div>,
          document.body
        )}
    </>
  );
};

// ── UserRow ───────────────────────────────────────────────────────────────────
const UserRow = ({ user, idx, onRoleUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [newRole, setNewRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const handleSave = async () => {
    if (newRole === user.role) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in.");

      const res = await fetch(
        "https://exykcukcvjdkrlbmxzdx.supabase.co/functions/v1/update-user-role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id: user.id, role: newRole }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      onRoleUpdated(user.id, newRole);
      setEditing(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setSaving(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in.");

      const res = await fetch(
        "https://exykcukcvjdkrlbmxzdx.supabase.co/functions/v1/delete-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id: user.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      onRoleUpdated(user.id, null); // signals parent to remove row
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

  const initial = (user.email || "?")[0].toUpperCase();
  const cfg = rc(editing ? newRole : user.role);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="group border-b border-gray-50 last:border-0 hover:bg-[#f7f9ff] transition-colors"
    >
      <td className="pl-5 pr-2 py-3.5 w-10">
        <span className="text-[11px] text-gray-400 font-mono tabular-nums">
          {String(idx + 1).padStart(2, "0")}
        </span>
      </td>

      <td className="px-2 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${cfg.accent}cc, ${cfg.accent})`,
            }}
          >
            {initial}
          </div>
          <span className="text-sm text-gray-800 font-medium truncate">
            {user.email}
          </span>
        </div>
      </td>

      <td className="px-2 py-3.5 w-40">
        {editing ? (
          <RoleDropdown value={newRole} onChange={setNewRole} small />
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.pill}`}
          >
            <cfg.icon className="w-3 h-3" />
            {cfg.label}
          </span>
        )}
        {err && <p className="text-[10px] text-rose-500 mt-1">{err}</p>}
      </td>

      <td className="px-2 py-3.5 w-24 text-right">
        <span className="text-[11px] text-gray-400 font-medium tabular-nums">
          {joined}
        </span>
      </td>

      <td className="pl-2 pr-5 py-3.5 w-20 text-right">
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                title="Save"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setNewRole(user.role);
                  setErr(null);
                }}
                title="Cancel"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => setEditing(true)}
                title="Edit role"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                title="Delete user"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const UserManagement = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false });
      if (!error && data) setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRoleUpdated = (id, newRole) => {
    if (newRole === null) {
      setUsers((prev) => prev.filter((u) => u.id !== id)); // remove deleted user
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
      );
    }
  };

  const handleCreateUser = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setResult({ success: false, error: "Please enter an email address." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in.");

      const res = await fetch(
        "https://exykcukcvjdkrlbmxzdx.supabase.co/functions/v1/create-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: trimmed, role }),
        }
      );
      const data = await res.json();
      console.log("CREATE USER RESPONSE:", data);

      alert("Generated Password: " + data.password);
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      setResult({
        success: true,
        email: data.email,
        role: data.role,
        password: data.password,
      });
      setEmail("");
      setRole("employee");
      fetchUsers();
    } catch (e) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen p-6 sm:p-10"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background:
          "linear-gradient(135deg, #f0f4ff 0%, #fafafa 60%, #f0f9ff 100%)",
      }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              User Management
            </h1>
            <p className="text-xs text-gray-500">
              Invite team members · Assign and edit roles
            </p>
          </div>
        </div>

        {/* ── Create User Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div
            className="px-5 py-4 border-b border-indigo-50 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, #f5f7ff 0%, #eef2ff 100%)",
            }}
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <UserPlus className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Invite New Member
              </h2>
              <p className="text-[10px] text-indigo-400 font-medium">
                User will receive a setup email
              </p>
            </div>
          </div>

          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setResult(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-400"
                />
              </div>

              <RoleDropdown value={role} onChange={setRole} />

              <button
                onClick={handleCreateUser}
                disabled={loading || !email.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all whitespace-nowrap shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #0ea5e9)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Add User
                  </>
                )}
              </button>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm font-medium
                    ${
                      result.success
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border border-rose-200 text-rose-700"
                    }`}
                >
                  {result.success ? (
                    <div className="space-y-1">
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div>
                            <strong>{result.email}</strong> added as{" "}
                            <strong>{result.role}</strong>
                          </div>
                          {result.password && (
                            <div className="text-xs font-semibold mt-1">
                              Password: {result.password}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{result.error}</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Users Table Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Team Members
                </h2>
                <p className="text-[10px] text-gray-400">
                  {usersLoading
                    ? "Loading…"
                    : `${users.length} member${users.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <button
              onClick={fetchUsers}
              title="Refresh"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${usersLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="bg-gray-50 border-b border-gray-100">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-40" />
                <col className="w-24" />
                <col className="w-20" />
              </colgroup>
              <thead>
                <tr>
                  {["#", "Member", "Role", "Joined", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest
                        ${
                          i === 0
                            ? "pl-5 pr-2 text-left"
                            : i === 3
                            ? "px-2 text-right"
                            : i === 4
                            ? "pl-2 pr-5 text-right"
                            : "px-2 text-left"
                        }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-40" />
                <col className="w-24" />
                <col className="w-20" />
              </colgroup>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                        <p className="text-xs text-gray-400">
                          Loading members…
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">
                          No members yet
                        </p>
                        <p className="text-xs text-gray-400">
                          Invite the first user above ↑
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u, i) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      idx={i}
                      onRoleUpdated={handleRoleUpdated}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {users.length > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ROLES.map((r) => {
                  const count = users.filter((u) => u.role === r.value).length;
                  return (
                    <span
                      key={r.value}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold ${r.pill}`}
                    >
                      <r.icon className="w-2.5 h-2.5" />
                      {count} {r.label}
                      {count !== 1 ? "s" : ""}
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400">
                Hover a row to edit role
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
