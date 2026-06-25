import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  X, Send, Search, MessageSquare, Trash2, ChevronLeft,
  Users, Clock, CheckCheck, Loader2, AlertCircle
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
    " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const avatar = (name, email) => {
  const n = name || email || "?";
  return n[0].toUpperCase();
};

const avatarColor = (str) => {
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash += str.charCodeAt(i);
  return colors[hash % colors.length];
};

// ── Main Component ─────────────────────────────────────────────────────────────
const EmployeeChat = ({ onClose, onUnreadChange }) => {
  const [view, setView] = useState("inbox"); // "inbox" | "compose"
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Compose
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [message, setMessage] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // Read message popup
  const [openedMessage, setOpenedMessage] = useState(null);
  const [readIds, setReadIds] = useState(new Set()); // track locally-read messages

  const searchTimeout = useRef(null);
  const messageRef = useRef(null);

  // ── Fetch inbox ────────────────────────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc("get_my_inbox");
      if (err) throw err;
      setInbox(data || []);
      // Update unread count — only count messages NOT in readIds
      const unreadCount = (data || []).filter((m) => !readIds.has(m.id)).length;
      onUnreadChange?.(unreadCount);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange, readIds]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("employee_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "employee_messages" },
        () => { fetchInbox(); }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchInbox]);

  // ── Search users ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data, error: err } = await supabase.rpc("search_messaging_users", {
          p_query: searchQuery.trim(),
        });
        if (err) throw err;
        // Filter out already selected
        const selectedIds = selectedRecipients.map((r) => r.auth_id);
        setSearchResults((data || []).filter((u) => !selectedIds.includes(u.auth_id)));
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery, selectedRecipients]);

  // ── Add/remove recipient ───────────────────────────────────────────────────
  const addRecipient = (user) => {
    setSelectedRecipients((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeRecipient = (authId) => {
    setSelectedRecipients((prev) => prev.filter((r) => r.auth_id !== authId));
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || selectedRecipients.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const ids = selectedRecipients.map((r) => r.auth_id);
      const { error: err } = await supabase.rpc("send_message", {
        p_recipient_ids: ids,
        p_message: message.trim(),
      });
      if (err) throw err;
      setSendSuccess(true);
      setMessage("");
      setSelectedRecipients([]);
      setTimeout(() => {
        setSendSuccess(false);
        setView("inbox");
        fetchInbox();
      }, 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Open message — mark as read but keep in inbox ──────────────────────────
  const openMessage = async (msg) => {
    setOpenedMessage(msg);
    // Mark as read in DB (sets read_at + delete_after midnight) but DON'T remove from UI yet
    try {
      await supabase.rpc("read_and_delete_message", { p_message_id: msg.id });
      // Track it as read locally — shows dimmed in inbox but still visible
      setReadIds((prev) => new Set([...prev, msg.id]));
      // Update unread count — only count messages NOT in readIds
      const unreadCount = inbox.filter((m) => m.id !== msg.id && !readIds.has(m.id)).length;
      onUnreadChange?.(unreadCount);
    } catch (e) {
      console.error("Read error:", e);
    }
  };

  const closeMessage = () => setOpenedMessage(null);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-4 sm:pr-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 40, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full sm:w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
        style={{
          height: "min(600px, 92vh)",
          boxShadow: "0 32px 80px -12px rgba(59,130,246,0.2), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Messages</h2>
              <p className="text-[10px] text-gray-400">
                {(() => {
                  const unread = inbox.filter((m) => !readIds.has(m.id)).length;
                  const total = inbox.length;
                  if (total === 0) return "No messages";
                  if (unread === 0) return `${total} messages — all read`;
                  return `${unread} unread · ${total} total`;
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === "inbox" ? (
              <button
                onClick={() => setView("compose")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/25"
              >
                <Send className="w-3 h-3" /> Send
              </button>
            ) : (
              <button
                onClick={() => { setView("inbox"); setSelectedRecipients([]); setMessage(""); setError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-semibold transition-all"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white/80 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── INBOX VIEW ── */}
            {view === "inbox" && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="h-full flex flex-col"
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <p className="text-xs">Loading messages…</p>
                  </div>
                ) : inbox.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-300">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                      <MessageSquare className="w-6 h-6 opacity-40" />
                    </div>
                    <p className="text-xs font-medium text-gray-400">No messages yet</p>
                    <p className="text-[11px] text-gray-300">Send a message to a colleague</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 overflow-y-auto">
                    {inbox.map((msg, i) => {
                      const isRead = readIds.has(msg.id);
                      return (
                        <motion.button
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => openMessage(msg)}
                          className={`w-full flex items-start gap-3 px-5 py-4 transition-colors text-left group ${
                            isRead ? "bg-gray-50/80 hover:bg-gray-100/80" : "hover:bg-blue-50/50"
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(msg.sender_name)} flex items-center justify-center flex-shrink-0 shadow-sm ${isRead ? "opacity-50" : ""}`}>
                            <span className="text-white text-sm font-bold">
                              {avatar(msg.sender_name, msg.sender_email)}
                            </span>
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className={`text-xs font-bold truncate ${isRead ? "text-gray-400" : "text-gray-900"}`}>
                                {msg.sender_name}
                              </p>
                              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {fmtTime(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-1">{msg.sender_dept}</p>
                            <p className={`text-xs line-clamp-2 leading-relaxed ${isRead ? "text-gray-400" : "text-gray-600"}`}>
                              {msg.message_content}
                            </p>
                          </div>
                          {/* Unread dot OR read badge */}
                          {isRead ? (
                            <span className="text-[9px] font-semibold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full flex-shrink-0 mt-1">
                              Read
                            </span>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── COMPOSE VIEW ── */}
            {view === "compose" && (
              <motion.div
                key="compose"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="p-5 space-y-4"
              >
                {/* To field */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">To</label>

                  {/* Selected recipients */}
                  {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedRecipients.map((r) => (
                        <span key={r.auth_id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
                          <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${avatarColor(r.name)} flex items-center justify-center`}>
                            <span className="text-white text-[8px] font-bold">{avatar(r.name, r.email)}</span>
                          </span>
                          {r.name}
                          <button onClick={() => removeRecipient(r.auth_id)} className="hover:text-blue-900 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-2.5 w-3.5 h-3.5 text-blue-400 animate-spin" />
                    )}
                  </div>

                  {/* Dropdown results */}
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10"
                      >
                        {searchResults.map((u) => (
                          <button
                            key={u.auth_id}
                            onClick={() => addRecipient(u)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                          >
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarColor(u.name)} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-xs font-bold">{avatar(u.name, u.email)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{u.email} · {u.department}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400 text-center"
                      >
                        No users found
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Message field */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    ref={messageRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please share updated manpower report by EOD…"
                    rows={5}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Success */}
                <AnimatePresence>
                  {sendSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700 font-semibold"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Message sent successfully!
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={sending || !message.trim() || selectedRecipients.length === 0 || sendSuccess}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Message</>
                  )}
                </button>

                {selectedRecipients.length > 1 && (
                  <p className="text-[10px] text-gray-400 text-center">
                    Sending to {selectedRecipients.length} recipients
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── OPENED MESSAGE POPUP ── */}
      <AnimatePresence>
        {openedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center p-6"
            onClick={closeMessage}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden"
              style={{ boxShadow: "0 24px 60px -8px rgba(0,0,0,0.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)" }}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(openedMessage.sender_name)} flex items-center justify-center shadow-sm`}>
                  <span className="text-white text-sm font-bold">{avatar(openedMessage.sender_name, openedMessage.sender_email)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{openedMessage.sender_name}</p>
                  <p className="text-[10px] text-gray-400">{openedMessage.sender_dept} · {fmtTime(openedMessage.created_at)}</p>
                </div>
                <button onClick={closeMessage} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Message */}
              <div className="px-5 py-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{openedMessage.message_content}</p>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <Trash2 className="w-3 h-3 text-gray-400" />
                  <span>Auto-deleted at midnight · still visible in inbox</span>
                </div>
                <button
                  onClick={closeMessage}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeChat;