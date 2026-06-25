import React, { useState, useEffect, useCallback, useRef } from "react";
import supabase from "../lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, CheckCircle2, Clock, AlertTriangle, Trash2,
  Search, ChevronDown, User, Calendar, Flag,
  ClipboardList, Loader2, RefreshCw, CheckCheck,
  Bell, StickyNote, ArrowRight,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
const priorityConfig = {
  High:   { label: "🔴 High",   color: "bg-rose-100 text-rose-700 border-rose-200" },
  Medium: { label: "🟡 Medium", color: "bg-amber-100 text-amber-700 border-amber-200" },
  Low:    { label: "🟢 Low",    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
};

const isOverdue = (due, status) =>
  due && status === "Pending" && new Date(due) < new Date();

// ── Priority Badge ─────────────────────────────────────────────────────────
const PriorityBadge = ({ p }) => {
  const c = priorityConfig[p] || priorityConfig.Medium;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${c.color}`}>
      {c.label}
    </span>
  );
};

// ── Create Task Form ───────────────────────────────────────────────────────
const CreateTaskForm = ({ onCreated, onCancel, userEmail }) => {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef(null);
  const [showSugg, setShowSugg] = useState(false);

  // Search assignable users
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.rpc("search_assignable_users", { p_query: query });
      setSuggestions(data || []);
      setSearching(false);
      setShowSugg(true);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const addAssignee = (u) => {
    if (!assignees.find(a => a.user_id === u.user_id)) {
      setAssignees(prev => [...prev, u]);
    }
    setQuery("");
    setSuggestions([]);
    setShowSugg(false);
  };

  const removeAssignee = (id) => setAssignees(prev => prev.filter(a => a.user_id !== id));

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Task title is required"); return; }
    if (assignees.length === 0) { setError("Add at least one assignee"); return; }
    setSaving(true);
    setError("");
    const { error: rpcErr } = await supabase.rpc("create_todos_multi", {
      p_assignee_ids:     assignees.map(a => a.user_id),
      p_task_title:       title.trim(),
      p_task_description: desc.trim() || null,
      p_priority:         priority,
      p_due_date:         dueDate || null,
    });
    setSaving(false);
    if (rpcErr) { setError(rpcErr.message); return; }
    onCreated();
  };

  return (
    <div className="p-4 border-b border-gray-100 bg-gradient-to-b from-blue-50/40 to-white">
      <p className="text-xs font-black text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5 text-blue-500" /> New Task
      </p>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={e => { setTitle(e.target.value); setError(""); }}
        placeholder="Task title…"
        autoFocus
        className="w-full border-2 border-gray-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                   rounded-xl px-3 py-2 text-sm font-medium text-gray-800 outline-none transition-all
                   placeholder:text-gray-300 mb-2"
      />

      {/* Description */}
      <textarea
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Description (optional)…"
        rows={2}
        className="w-full border-2 border-gray-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                   rounded-xl px-3 py-2 text-xs text-gray-700 outline-none resize-none transition-all
                   placeholder:text-gray-300 mb-2"
      />

      {/* Assignee Search */}
      <div className="relative mb-2" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setError(""); }}
            onFocus={() => query && setShowSugg(true)}
            placeholder="Search people to assign…"
            className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl
                       pl-8 pr-3 py-2 text-xs font-medium text-gray-700 outline-none transition-all
                       placeholder:text-gray-300"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 animate-spin" />}
        </div>

        <AnimatePresence>
          {showSugg && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100
                         rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {suggestions.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => addAssignee(u)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50
                             transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600
                                  flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">
                      {(u.full_name || u.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{u.full_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email} · {u.department}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                    ${u.role === 'admin' ? 'bg-violet-100 text-violet-700' :
                      u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.role}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Assignees */}
      {assignees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {assignees.map(a => (
            <span key={a.user_id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200
                         rounded-lg text-[11px] font-semibold text-blue-700">
              {a.full_name || a.email.split("@")[0]}
              <button onClick={() => removeAssignee(a.user_id)}
                className="text-blue-400 hover:text-blue-700 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Priority + Due Date row */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full appearance-none border-2 border-gray-100 focus:border-blue-400
                       rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none
                       transition-all bg-white pr-7"
          >
            <option value="High">🔴 High</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🟢 Low</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="flex-1 border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2
                     text-xs font-medium text-gray-700 outline-none transition-all"
        />
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-semibold flex items-center gap-1 mb-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl border-2 border-gray-100 text-xs font-bold text-gray-500
                     hover:bg-gray-50 transition-all">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                     bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
                     text-white text-xs font-bold disabled:opacity-60 transition-all shadow-md shadow-blue-500/25"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          {saving ? "Creating…" : "Create Task"}
        </button>
      </div>
    </div>
  );
};

// ── Task Card ──────────────────────────────────────────────────────────────
const TaskCard = ({ task, onComplete, onDelete, currentUserEmail }) => {
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const overdue = isOverdue(task.due_date, task.status);
  const isCompleted = task.status === "Completed";
  const isMine = task.assigned_to_email === currentUserEmail;
  const isSelf = task.is_self_task;

  const handleComplete = async () => {
    setCompleting(true);
    await supabase.rpc("complete_todo", { p_todo_id: task.id });
    setCompleting(false);
    onComplete();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.rpc("delete_todo", { p_todo_id: task.id });
    setDeleting(false);
    onDelete();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-2xl border p-3 transition-all
        ${isCompleted
          ? "bg-gray-50/60 border-gray-100 opacity-60"
          : overdue
          ? "bg-rose-50/40 border-rose-100"
          : "bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm"
        }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Complete Button */}
        {!isCompleted && isMine && (
          <button
            onClick={handleComplete}
            disabled={completing}
            title="Mark complete"
            className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-200
                       hover:border-emerald-400 hover:bg-emerald-50 transition-all flex items-center justify-center"
          >
            {completing
              ? <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
              : <CheckCircle2 className="w-3 h-3 text-transparent hover:text-emerald-500" />
            }
          </button>
        )}
        {isCompleted && (
          <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 border-2 border-emerald-300
                          flex items-center justify-center">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
          </div>
        )}
        {!isMine && !isCompleted && <div className="w-5 h-5 flex-shrink-0" />}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={`text-xs font-bold leading-tight mb-1
            ${isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}>
            {task.task_title}
          </p>

          {/* Description */}
          {task.task_description && (
            <p className="text-[11px] text-gray-400 leading-relaxed mb-1.5 line-clamp-2">
              {task.task_description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge p={task.priority} />

            {task.due_date && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold
                ${overdue ? "text-rose-600" : "text-gray-400"}`}>
                <Calendar className="w-3 h-3" />
                {overdue && "⚠ "}{fmtDate(task.due_date)}
              </span>
            )}

            {isSelf
              ? <span className="text-[10px] text-blue-500 font-semibold">Self</span>
              : isMine
              ? <span className="text-[10px] text-slate-400">by {task.assigned_by_name}</span>
              : <span className="text-[10px] text-indigo-500 font-semibold">→ {task.assigned_to_name}</span>
            }
          </div>
        </div>

        {/* Delete button — only creator or self */}
        {(task.assigned_by_email === currentUserEmail || isSelf) && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-shrink-0 p-1 rounded-lg text-gray-200 hover:text-rose-400 hover:bg-rose-50
                       transition-all border border-transparent hover:border-rose-100"
          >
            {deleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />
            }
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────
const TodoPanel = ({ isOpen, onClose, userEmail }) => {
  const [tasks, setTasks] = useState([]);
  const [counters, setCounters] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("pending"); // pending | completed | by_me
  const panelRef = useRef(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const [{ data: todos }, { data: counts }] = await Promise.all([
      supabase.rpc("get_my_todos"),
      supabase.rpc("get_todo_counters"),
    ]);
    setTasks(todos || []);
    setCounters(counts?.[0] || {});
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadTasks();
  }, [isOpen, loadTasks]);

  // Real-time: listen for new tasks assigned TO me
  useEffect(() => {
    if (!isOpen || !userEmail) return;
    const channel = supabase
      .channel("todos-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "employee_todos",
        filter: `assigned_to_email=eq.${userEmail}`,
      }, () => loadTasks())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isOpen, userEmail, loadTasks]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  const filteredTasks = tasks.filter(t => {
    if (filter === "pending")   return t.status === "Pending" && t.assigned_to_email === userEmail;
    if (filter === "completed") return t.status === "Completed";
    if (filter === "by_me")     return t.assigned_by_email === userEmail && t.assigned_to_email !== userEmail;
    return true;
  });

  const tabs = [
    { id: "pending",   label: "Pending",   count: counters.pending_count },
    { id: "completed", label: "Done",       count: counters.completed_today },
    { id: "by_me",     label: "Assigned",   count: counters.assigned_by_me },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[68px] right-[72px] w-[380px] max-h-[600px] bg-white rounded-2xl
                       shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden"
            style={{ boxShadow: "0 24px 60px -12px rgba(59,130,246,0.18), 0 0 0 1px rgba(0,0,0,0.04)" }}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/60
                            flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl
                                flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">My Tasks</p>
                  <p className="text-[10px] text-gray-400">
                    {counters.overdue_count > 0
                      ? `⚠ ${counters.overdue_count} overdue`
                      : `${counters.pending_count || 0} pending`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadTasks}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                             hover:text-blue-500 hover:bg-blue-50 transition-all"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setShowCreate(v => !v); }}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                    ${showCreate
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"}`}
                  title="New task"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400
                             hover:text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Create Form */}
            <AnimatePresence>
              {showCreate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <CreateTaskForm
                    userEmail={userEmail}
                    onCreated={() => { setShowCreate(false); loadTasks(); }}
                    onCancel={() => setShowCreate(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-3 pt-1 flex-shrink-0 bg-white">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold
                              transition-all -mb-px
                    ${filter === tab.id ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full
                      ${filter === tab.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                      {tab.count}
                    </span>
                  )}
                  {filter === tab.id && (
                    <motion.div
                      layoutId="todoTabBar"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/30">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-xs font-medium">Loading…</span>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-semibold">
                    {filter === "pending"   ? "No pending tasks 🎉" :
                     filter === "completed" ? "Nothing completed today" :
                     "No tasks assigned by you"}
                  </p>
                  {filter === "pending" && (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-3 flex items-center gap-1 text-xs text-blue-500 font-semibold hover:text-blue-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create a task
                    </button>
                  )}
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserEmail={userEmail}
                      onComplete={loadTasks}
                      onDelete={loadTasks}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer counters */}
            {counters.overdue_count > 0 && (
              <div className="px-3 py-2 bg-rose-50 border-t border-rose-100 flex-shrink-0">
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {counters.overdue_count} task{counters.overdue_count > 1 ? "s" : ""} overdue
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Exported Badge Button (for App.jsx header) ─────────────────────────────
export const TodoBadgeButton = ({ userEmail, onClick, unreadCount }) => (
    <button
      onClick={onClick}
      title="My Tasks"
      className={`relative flex items-center justify-center w-9 h-9 rounded-xl
                 border transition-all duration-200
                 ${unreadCount > 0
                   ? "text-rose-500 bg-rose-50 border-rose-200 hover:bg-rose-100"
                   : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100"
                 }`}
    >
      <ClipboardList className="w-[18px] h-[18px]" />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1
                     bg-rose-500 text-white text-[9px] font-black
                     rounded-full flex items-center justify-center
                     shadow-sm shadow-rose-500/40 leading-none"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </motion.span>
      )}
    </button>
  );

export default TodoPanel;