import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  X, Send, Search, MessageSquare, ChevronLeft, CheckCheck,
  Loader2, Mail, Clock, User, MoreVertical, Phone, Paperclip,
  Smile, ArrowLeft, Inbox
} from "lucide-react";

// ── Date Helpers ────────────────────────────────────────────────────────────
const fmtTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const fmtDate = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

const sameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

// ── Avatar Helpers ────────────────────────────────────────────────────────
const avatarLetter = (name, email) => {
  const n = name || email || "?";
  return n[0].toUpperCase();
};

const avatarGradient = (str) => {
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-cyan-600",
    "from-lime-500 to-green-600",
    "from-fuchsia-500 to-purple-600",
  ];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash += str.charCodeAt(i);
  return colors[hash % colors.length];
};

// ── Spring Presets ──────────────────────────────────────────────────────────
const spring = { type: "spring", stiffness: 380, damping: 32 };
const springSoft = { type: "spring", stiffness: 300, damping: 28 };

// ── Main Component ──────────────────────────────────────────────────────────
const EmployeeChat = ({ onClose, onUnreadChange }) => {
  // ── Screens: "list" | "conversation" | "compose"
  const [screen, setScreen] = useState("list");
  const [activeConversation, setActiveConversation] = useState(null);

  // ── Data
  const [inbox, setInbox] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [threadMessages, setThreadMessages] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // ── Compose
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [composeMessage, setComposeMessage] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // ── Conversation input
  const [replyMessage, setReplyMessage] = useState("");
  const replyRef = useRef(null);

  // ── Refs
  const searchTimeout = useRef(null);
  const threadEndRef = useRef(null);
  const prevUnreadRef = useRef(0);

  // ── Fetch Inbox & Group ─────────────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    setLoadingInbox(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc("get_my_inbox");
      if (err) throw err;
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setInbox(sorted);

      // Group by sender
      const grouped = {};
      sorted.forEach((msg) => {
        const key = msg.sender_id || msg.sender_email;
        if (!grouped[key]) {
          grouped[key] = { ...msg, unread_count: 0, message_count: 0 };
        }
        grouped[key].message_count += 1;
        if (!msg.is_read) grouped[key].unread_count += 1;
        // Keep the latest message for preview
        if (new Date(msg.created_at) > new Date(grouped[key].created_at)) {
          grouped[key] = { ...msg, unread_count: grouped[key].unread_count, message_count: grouped[key].message_count };
        }
      });

      const convList = Object.values(grouped).sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (b.unread_count > 0 && a.unread_count === 0) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setConversations(convList);

      const unreadTotal = sorted.filter((m) => !m.is_read).length;
      if (unreadTotal !== prevUnreadRef.current) {
        onUnreadChange?.(unreadTotal);
        prevUnreadRef.current = unreadTotal;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingInbox(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("employee_messages_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employee_messages" },
        () => { fetchInbox(); }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchInbox]);

  // ── Search Users ──────────────────────────────────────────────────────────
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
        const selectedIds = selectedRecipients.map((r) => r.auth_id);
        setSearchResults((data || []).filter((u) => !selectedIds.includes(u.auth_id)));
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery, selectedRecipients]);

  const addRecipient = (user) => {
    setSelectedRecipients((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeRecipient = (authId) => {
    setSelectedRecipients((prev) => prev.filter((r) => r.auth_id !== authId));
  };

  // ── Open Conversation ───────────────────────────────────────────────────────
  const openConversation = async (conv) => {
    const otherId = conv.sender_id || conv.sender_email;
    setActiveConversation({
      id: otherId,
      name: conv.sender_name,
      email: conv.sender_email,
      dept: conv.sender_dept,
    });
    setScreen("conversation");
    setLoadingThread(true);
    setError(null);

    try {
      // Load thread
      const { data: threadData, error: threadErr } = await supabase.rpc("get_conversation", {
        p_other_user_id: otherId,
      });
      if (threadErr) throw threadErr;
      setThreadMessages(threadData || []);

      // Mark conversation read
      if (conv.unread_count > 0) {
        await supabase.rpc("mark_conversation_read", { p_other_user_id: otherId });
        // Optimistically update
        setInbox((prev) =>
          prev.map((m) =>
            (m.sender_id || m.sender_email) === otherId && !m.is_read
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m
          )
        );
        setConversations((prev) =>
          prev.map((c) =>
            (c.sender_id || c.sender_email) === otherId
              ? { ...c, unread_count: 0 }
              : c
          )
        );
        const newUnread = inbox.filter((m) => !m.is_read).length - conv.unread_count;
        prevUnreadRef.current = Math.max(0, newUnread);
        onUnreadChange?.(Math.max(0, newUnread));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingThread(false);
    }
  };

  // ── Send Reply ─────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!replyMessage.trim() || !activeConversation) return;
    setSending(true);
    setError(null);
    const tempMsg = replyMessage.trim();
    try {
      const { error: err } = await supabase.rpc("send_message", {
        p_recipient_ids: [activeConversation.id],
        p_message: tempMsg,
      });
      if (err) throw err;

      // Optimistically append
      const now = new Date().toISOString();
      setThreadMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          message_content: tempMsg,
          created_at: now,
          is_mine: true,
          is_read: false,
          sender_name: "You",
        },
      ]);
      setReplyMessage("");
      fetchInbox();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Send New Message (Compose) ───────────────────────────────────────────
  const handleSendNew = async () => {
    if (!composeMessage.trim() || selectedRecipients.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const ids = selectedRecipients.map((r) => r.auth_id);
      const { error: err } = await supabase.rpc("send_message", {
        p_recipient_ids: ids,
        p_message: composeMessage.trim(),
      });
      if (err) throw err;
      setSendSuccess(true);
      setComposeMessage("");
      setSelectedRecipients([]);
      setTimeout(() => {
        setSendSuccess(false);
        setScreen("list");
        fetchInbox();
      }, 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    if (screen === "conversation" && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadMessages, screen]);

  // ── Keyboard: Enter sends, Shift+Enter newline ───────────────────────────
  const handleReplyKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleComposeKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendNew();
    }
  };

  const unreadTotal = inbox.filter((m) => !m.is_read).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 sm:pr-8">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 60, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.2 } }}
        transition={spring}
        className="relative z-10 w-full sm:w-[520px] bg-white rounded-t-3xl sm:rounded-[24px] flex flex-col overflow-hidden border border-gray-100"
        style={{
          height: "min(760px, 88vh)",
          maxHeight: "88vh",
          boxShadow: "0 40px 80px -20px rgba(30,64,175,0.22), 0 16px 40px -12px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ HEADER ═══ */}
        <div
          className="flex-shrink-0 px-5 py-4 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 55%, #4c1d95 100%)" }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              {screen !== "list" && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    setScreen("list");
                    setActiveConversation(null);
                    setError(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
              )}

              {screen === "conversation" && activeConversation ? (
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(activeConversation.name)} flex items-center justify-center shadow-sm`}>
                    <span className="text-white text-sm font-bold">{avatarLetter(activeConversation.name, activeConversation.email)}</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white leading-tight">{activeConversation.name}</h2>
                    <p className="text-[10px] text-indigo-200/80">{activeConversation.dept}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                    <MessageSquare className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Messages</h2>
                    <p className="text-[11px] text-indigo-200/80">
                      {unreadTotal > 0 ? `${unreadTotal} unread` : `${conversations.length} chats`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {screen === "list" && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setScreen("compose"); setError(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-700 rounded-lg text-xs font-bold shadow-sm"
                >
                  <Send className="w-3 h-3" /> New
                </motion.button>
              )}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="flex-1 overflow-hidden bg-slate-50/50 relative">
          <AnimatePresence mode="wait">

            {/* ─── LIST VIEW ─── */}
            {screen === "list" && (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={springSoft}
                className="h-full flex flex-col"
              >
                {/* Search bar */}
                <div className="px-4 py-3 bg-white border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      className="w-full pl-9 pr-3 py-2 bg-gray-100 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 transition-all"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        if (!q) { fetchInbox(); return; }
                        setConversations((prev) =>
                          prev.filter((c) =>
                            (c.sender_name || "").toLowerCase().includes(q) ||
                            (c.sender_dept || "").toLowerCase().includes(q)
                          )
                        );
                      }}
                    />
                  </div>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto">
                  {loadingInbox ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                      <p className="text-sm">Loading conversations…</p>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                        <Inbox className="w-6 h-6 text-indigo-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-500">No conversations yet</p>
                      <p className="text-xs text-gray-400">Start a new chat to message colleagues</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100/60">
                      {conversations.map((conv, i) => {
                        const hasUnread = conv.unread_count > 0;
                        return (
                          <motion.button
                            key={conv.sender_id || conv.sender_email}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.04, 0.4), ...springSoft }}
                            onClick={() => openConversation(conv)}
                            className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-indigo-50/40 ${hasUnread ? "bg-white" : "bg-white/60"}`}
                          >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGradient(conv.sender_name)} flex items-center justify-center shadow-sm`}>
                                <span className="text-white text-sm font-bold">{avatarLetter(conv.sender_name, conv.sender_email)}</span>
                              </div>
                              {hasUnread && (
                                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className={`text-sm font-semibold truncate ${hasUnread ? "text-gray-900" : "text-gray-500"}`}>
                                  {conv.sender_name}
                                </p>
                                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                  {fmtTime(conv.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className={`text-[13px] truncate ${hasUnread ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                                  {conv.message_content}
                                </p>
                                {hasUnread && (
                                  <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">{conv.sender_dept}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── CONVERSATION VIEW ─── */}
            {screen === "conversation" && activeConversation && (
              <motion.div
                key="conversation"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={springSoft}
                className="h-full flex flex-col"
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                  {loadingThread ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  ) : threadMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
                      <Mail className="w-8 h-8 text-gray-300" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    <>
                      {threadMessages.map((msg, idx) => {
                        const showDate = idx === 0 || !sameDay(msg.created_at, threadMessages[idx - 1].created_at);
                        const isMine = msg.is_mine;
                        return (
                          <React.Fragment key={msg.id || idx}>
                            {showDate && (
                              <div className="flex items-center justify-center my-4">
                                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                  {fmtDate(msg.created_at)}
                                </span>
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: 0.02, ...springSoft }}
                              className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
                            >
                              <div
                                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                  isMine
                                    ? "bg-indigo-600 text-white rounded-br-md"
                                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm"
                                }`}
                              >
                                <p>{msg.message_content}</p>
                                <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? "text-indigo-200" : "text-gray-400"}`}>
                                  <span className="text-[10px]">{fmtTime(msg.created_at)}</span>
                                  {isMine && (
                                    <CheckCheck className={`w-3 h-3 ${msg.is_read ? "text-emerald-300" : ""}`} />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={threadEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-100">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.div>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={replyRef}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        onKeyDown={handleReplyKeyDown}
                        placeholder="Type a message…"
                        rows={1}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 focus:bg-white transition-all resize-none max-h-32"
                        style={{ minHeight: "40px" }}
                      />
                    </div>
                    <motion.button
                      onClick={handleSendReply}
                      disabled={sending || !replyMessage.trim()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </motion.button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 text-center">Press Enter to send · Shift+Enter for new line</p>
                </div>
              </motion.div>
            )}

            {/* ─── COMPOSE VIEW ─── */}
            {screen === "compose" && (
              <motion.div
                key="compose"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={springSoft}
                className="h-full overflow-y-auto p-5 space-y-5"
              >
                {/* To field */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">To</label>
                  {selectedRecipients.length > 0 && (
                    <motion.div layout className="flex flex-wrap gap-2 mb-3">
                      <AnimatePresence>
                        {selectedRecipients.map((r) => (
                          <motion.span
                            key={r.auth_id}
                            layout
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-semibold"
                          >
                            <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${avatarGradient(r.name)} flex items-center justify-center`}>
                              <span className="text-white text-[8px] font-bold">{avatarLetter(r.name, r.email)}</span>
                            </span>
                            {r.name}
                            <button onClick={() => removeRecipient(r.auth_id)} className="hover:text-indigo-900">
                              <X className="w-3 h-3" />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 focus:bg-white transition-all"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
                    )}
                  </div>

                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto"
                      >
                        {searchResults.map((u, idx) => (
                          <motion.button
                            key={u.auth_id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            onClick={() => addRecipient(u)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 transition-colors text-left border-b border-gray-50 last:border-0"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradient(u.name)} flex items-center justify-center`}>
                              <span className="text-white text-xs font-bold">{avatarLetter(u.name, u.email)}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                              <p className="text-[11px] text-gray-400 truncate">{u.email} · {u.department}</p>
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <div className="mt-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 text-center">
                        No users found
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    onKeyDown={handleComposeKeyDown}
                    placeholder="Write your message…"
                    rows={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 focus:bg-white transition-all resize-none leading-relaxed"
                  />
                </div>

                {sendSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-semibold"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Message sent successfully!
                  </motion.div>
                )}

                <motion.button
                  onClick={handleSendNew}
                  disabled={sending || !composeMessage.trim() || selectedRecipients.length === 0 || sendSuccess}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Sending…" : "Send Message"}
                </motion.button>

                {selectedRecipients.length > 1 && (
                  <p className="text-[11px] text-gray-400 text-center">Sending to {selectedRecipients.length} recipients</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default EmployeeChat;