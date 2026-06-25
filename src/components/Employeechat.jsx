import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  X, Send, Search, MessageSquare, Trash2, ChevronLeft,
  Clock, CheckCheck, Loader2, AlertCircle, Sparkles, Mail
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

// ── Spring presets — tuned once, reused everywhere for cohesion ─────────────
const springPanel = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 };
const springSoft = { type: "spring", stiffness: 320, damping: 28 };
const springSnap = { type: "spring", stiffness: 500, damping: 30 };
const springBounce = { type: "spring", stiffness: 420, damping: 16, mass: 0.7 };

// ── Floating ambient particles for the header — tiny drifting data-points ──
const HeaderParticles = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        id: i,
        size: 2 + Math.random() * 3,
        left: Math.random() * 100,
        top: 10 + Math.random() * 80,
        duration: 5 + Math.random() * 5,
        delay: Math.random() * 4,
      })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{ width: p.size, height: p.size, left: `${p.left}%`, top: `${p.top}%` }}
          animate={{
            y: [0, -14, 0],
            opacity: [0.15, 0.55, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// ── Confetti burst — fires once on successful send ──────────────────────────
const ConfettiBurst = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        angle: (i / 16) * 360 + Math.random() * 18,
        distance: 50 + Math.random() * 55,
        size: 4 + Math.random() * 4,
        color: ["#34d399", "#fbbf24", "#818cf8", "#f472b6", "#60a5fa"][i % 5],
        rotate: Math.random() * 360,
      })),
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {pieces.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = Math.cos(rad) * p.distance;
        const y = Math.sin(rad) * p.distance;
        return (
          <motion.span
            key={p.id}
            className="absolute rounded-sm"
            style={{ width: p.size, height: p.size, background: p.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x, y, opacity: 0, rotate: p.rotate, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
};

// ── Tilt-on-hover wrapper for inbox rows — subtle 3D follow ─────────────────
const TiltRow = ({ children, className, onClick }) => {
  const ref = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRX = useSpring(rotateX, { stiffness: 300, damping: 22 });
  const springRY = useSpring(rotateY, { stiffness: 300, damping: 22 });

  const handleMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 4);
    rotateX.set(-py * 4);
  };
  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      style={{ rotateX: springRX, rotateY: springRY, transformPerspective: 600 }}
      className={className}
    >
      {children}
    </motion.button>
  );
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
  const [launching, setLaunching] = useState(false);

  // Read message popup
  const [openedMessage, setOpenedMessage] = useState(null);

  const searchTimeout = useRef(null);
  const messageRef = useRef(null);
  const prevUnreadRef = useRef(0);
  const [badgeBump, setBadgeBump] = useState(false);

  // ── Fetch inbox ────────────────────────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc("get_my_inbox");
      if (err) throw err;
      // Always sort newest-first client-side — don't rely on the RPC's
      // own ordering, so a new message always lands at the top of the list.
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setInbox(sorted);
      const unreadCount = sorted.filter((m) => !m.is_read).length;
      if (unreadCount > prevUnreadRef.current) {
        setBadgeBump(true);
        setTimeout(() => setBadgeBump(false), 600);
      }
      prevUnreadRef.current = unreadCount;
      onUnreadChange?.(unreadCount);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // ── Realtime subscription ──────────────────────────────────────────────────
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
    setLaunching(true);
    setSending(true);
    setError(null);
    try {
      const ids = selectedRecipients.map((r) => r.auth_id);
      const { error: err } = await supabase.rpc("send_message", {
        p_recipient_ids: ids,
        p_message: message.trim(),
      });
      if (err) throw err;
      setTimeout(() => {
        setSendSuccess(true);
        setMessage("");
        setSelectedRecipients([]);
        setLaunching(false);
      }, 420);
      setTimeout(() => {
        setSendSuccess(false);
        setView("inbox");
        fetchInbox();
      }, 2000);
    } catch (e) {
      setError(e.message);
      setLaunching(false);
    } finally {
      setSending(false);
    }
  };

  // ── Open message — mark as read using new RPC ──────────────────────────────
  const openMessage = async (msg) => {
    setOpenedMessage(msg);
    if (msg.is_read) return;

    try {
      await supabase.rpc("mark_message_read", { p_message_id: msg.id });
      setInbox((prev) => {
        const updated = prev.map((m) =>
          m.id === msg.id ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
        );
        const unreadCount = updated.filter((m) => !m.is_read).length;
        prevUnreadRef.current = unreadCount;
        onUnreadChange?.(unreadCount);
        return updated;
      });
    } catch (e) {
      console.error("Read error:", e);
    }
  };

  const closeMessage = () => setOpenedMessage(null);

  const unreadTotal = inbox.filter((m) => !m.is_read).length;

  // ── Render ─────────────────────────────────────────────────────────────────
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
        initial={{ opacity: 0, x: 70, scale: 0.92, rotateY: 6 }}
        animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
        exit={{ opacity: 0, x: 50, scale: 0.94, transition: { duration: 0.2 } }}
        transition={springPanel}
        className="relative z-10 w-full sm:w-[580px] bg-white rounded-t-3xl sm:rounded-[28px] flex flex-col overflow-hidden border border-gray-100"
        style={{
          height: "min(780px, 90vh)",
          maxHeight: "90vh",
          boxShadow:
            "0 50px 100px -20px rgba(30,64,175,0.28), 0 16px 40px -12px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)",
          perspective: 1000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex-shrink-0 px-6 py-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 55%, #4c1d95 100%)" }}
        >
          <HeaderParticles />
          {/* Ambient glow blobs */}
          <motion.div
            className="absolute -top-16 -right-10 w-44 h-44 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5), transparent 70%)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-10 left-12 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(244,63,94,0.25), transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <motion.div
            className="flex items-center justify-between relative"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, ...springSoft }}
          >
            <div className="flex items-center gap-3.5">
              <motion.div
                className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 relative"
                whileHover={{ rotate: -8, scale: 1.08 }}
                transition={springSnap}
              >
                <motion.div
                  animate={{ rotate: [0, -4, 4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <MessageSquare className="w-5 h-5 text-white" strokeWidth={2.25} />
                </motion.div>
                <AnimatePresence>
                  {unreadTotal > 0 && (
                    <motion.span
                      key="ping"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-indigo-900"
                    >
                      <motion.span
                        className="absolute inset-0 rounded-full bg-amber-400"
                        animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Messages</h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${unreadTotal}-${inbox.length}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                    className="text-[11px] text-indigo-200/90 font-medium"
                  >
                    {inbox.length === 0
                      ? "No messages"
                      : unreadTotal === 0
                      ? `${inbox.length} messages · all caught up`
                      : `${unreadTotal} unread · ${inbox.length} total`}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {view === "inbox" ? (
                  <motion.button
                    key="send-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05, y: -1, boxShadow: "0 8px 20px -4px rgba(0,0,0,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    transition={springSnap}
                    onClick={() => setView("compose")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold shadow-lg shadow-black/10"
                  >
                    <Send className="w-3.5 h-3.5" /> New
                  </motion.button>
                ) : (
                  <motion.button
                    key="back-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springSnap}
                    onClick={() => { setView("inbox"); setSelectedRecipients([]); setMessage(""); setError(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </motion.button>
                )}
              </AnimatePresence>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={springSnap}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/60 to-white">
          <AnimatePresence mode="wait">

            {/* ── INBOX VIEW ── */}
            {view === "inbox" && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={springSoft}
                className="h-full flex flex-col"
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-7 h-7 text-indigo-400" />
                    </motion.div>
                    <p className="text-sm">Loading messages…</p>
                  </div>
                ) : inbox.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-24 gap-3"
                  >
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl flex items-center justify-center border border-indigo-100"
                      animate={{ y: [0, -6, 0], rotate: [0, -3, 3, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Mail className="w-7 h-7 text-indigo-300" />
                    </motion.div>
                    <p className="text-sm font-semibold text-gray-500">Your inbox is empty</p>
                    <p className="text-xs text-gray-400">Messages from colleagues will land here</p>
                  </motion.div>
                ) : (
                  <div className="divide-y divide-gray-100/80 overflow-y-auto">
                    {inbox.map((msg, i) => {
                      const isRead = msg.is_read;
                      return (
                        <motion.div
                          key={msg.id}
                          layout
                          initial={{ opacity: 0, y: 14, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: Math.min(i * 0.05, 0.45), ...springSoft }}
                        >
                          <TiltRow
                            onClick={() => openMessage(msg)}
                            className="w-full relative flex items-start gap-4 px-6 py-4.5 text-left group hover:bg-indigo-50/40 transition-colors"
                          >
                            {/* Unread rail — the "stamped" signature mark */}
                            <AnimatePresence>
                              {!isRead && (
                                <motion.span
                                  initial={{ scaleY: 0 }}
                                  animate={{ scaleY: 1 }}
                                  exit={{ scaleY: 0 }}
                                  transition={springSoft}
                                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-amber-400 to-orange-500 origin-top"
                                />
                              )}
                            </AnimatePresence>

                            {/* Avatar */}
                            <motion.div
                              className={`w-10.5 h-10.5 rounded-xl bg-gradient-to-br ${avatarColor(msg.sender_name)} flex items-center justify-center flex-shrink-0 shadow-sm ${isRead ? "opacity-45 saturate-50" : ""}`}
                              whileHover={{ scale: 1.1, rotate: -4 }}
                              transition={springSnap}
                            >
                              <span className="text-white text-sm font-bold">
                                {avatar(msg.sender_name, msg.sender_email)}
                              </span>
                            </motion.div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className={`text-sm font-bold truncate ${isRead ? "text-gray-400" : "text-gray-900"}`}>
                                  {msg.sender_name}
                                </p>
                                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2 flex items-center gap-1 font-mono tabular-nums">
                                  <Clock className="w-2.5 h-2.5" />
                                  {fmtTime(msg.created_at)}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-semibold">{msg.sender_dept}</p>
                              <p className={`text-[13px] line-clamp-2 leading-relaxed ${isRead ? "text-gray-400" : "text-gray-600"}`}>
                                {msg.message_content}
                              </p>
                            </div>

                            {/* Unread pulse OR read badge */}
                            {isRead ? (
                              <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 mt-1 tracking-wide">
                                READ
                              </span>
                            ) : (
                              <span className="relative flex-shrink-0 mt-1.5 w-2.5 h-2.5">
                                <motion.span
                                  className="absolute inset-0 rounded-full bg-amber-400"
                                  animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                                />
                                <span className="relative block w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                              </span>
                            )}
                          </TiltRow>
                        </motion.div>
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
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={springSoft}
                className="p-6 space-y-5"
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
                            initial={{ opacity: 0, scale: 0.6, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 8 }}
                            transition={springBounce}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-semibold"
                          >
                            <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarColor(r.name)} flex items-center justify-center`}>
                              <span className="text-white text-[9px] font-bold">{avatar(r.name, r.email)}</span>
                            </span>
                            {r.name}
                            <button onClick={() => removeRecipient(r.auth_id)} className="hover:text-indigo-900 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 focus:bg-white transition-all"
                    />
                    {searching && (
                      <motion.div
                        className="absolute right-3.5 top-3"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-4 h-4 text-indigo-400" />
                      </motion.div>
                    )}
                  </div>

                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
                        transition={springSoft}
                        style={{ originY: 0 }}
                        className="mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-10 max-h-60 overflow-y-auto"
                      >
                        {searchResults.map((u, idx) => (
                          <motion.button
                            key={u.auth_id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            whileHover={{ backgroundColor: "rgba(238,242,255,0.8)" }}
                            onClick={() => addRecipient(u)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left border-b border-gray-50 last:border-0"
                          >
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor(u.name)} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white text-sm font-bold">{avatar(u.name, u.email)}</span>
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
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 text-center"
                      >
                        No users found
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Message field */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    ref={messageRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please share updated manpower report by EOD…"
                    rows={8}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 focus:bg-white transition-all resize-none leading-relaxed"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 text-sm text-rose-700"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {sendSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={springSnap}
                      className="relative flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5 text-sm text-emerald-700 font-semibold overflow-visible"
                    >
                      <ConfettiBurst />
                      <motion.span
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ ...springBounce, delay: 0.05 }}
                      >
                        <CheckCheck className="w-4.5 h-4.5" />
                      </motion.span>
                      Message sent successfully!
                      <motion.span
                        className="ml-auto"
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Send button — paper-plane launch micro-interaction */}
                <motion.button
                  onClick={handleSend}
                  disabled={sending || !message.trim() || selectedRecipients.length === 0 || sendSuccess}
                  whileHover={!sending && message.trim() && selectedRecipients.length > 0 ? { scale: 1.02, y: -2, boxShadow: "0 12px 28px -6px rgba(79,70,229,0.5)" } : {}}
                  whileTap={!sending && message.trim() && selectedRecipients.length > 0 ? { scale: 0.97 } : {}}
                  transition={springSnap}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {sending ? (
                    <motion.span
                      key="sending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        animate={launching ? { x: 140, y: -30, opacity: 0, rotate: 35 } : { rotate: 360 }}
                        transition={launching ? { duration: 0.4, ease: "easeIn" } : { duration: 0.8, repeat: Infinity, ease: "linear" }}
                      >
                        {launching ? <Send className="w-4.5 h-4.5" /> : <Loader2 className="w-4.5 h-4.5" />}
                      </motion.div>
                      {launching ? "" : "Sending…"}
                    </motion.span>
                  ) : (
                    <motion.span key="idle" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Send className="w-4.5 h-4.5" /> Send Message
                    </motion.span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {selectedRecipients.length > 1 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] text-gray-400 text-center"
                    >
                      Sending to {selectedRecipients.length} recipients
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── OPENED MESSAGE POPUP — envelope-opening reveal ── */}
      <AnimatePresence>
        {openedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center p-6"
            style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(5px)" }}
            onClick={closeMessage}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 36, rotateX: -25 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20, transition: { duration: 0.15 } }}
              transition={springBounce}
              style={{ transformPerspective: 800 }}
              className="bg-white rounded-3xl w-full max-w-md border border-gray-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 32px 70px -12px rgba(0,0,0,0.25)",
                    "0 32px 90px -12px rgba(16,185,129,0.18)",
                    "0 32px 70px -12px rgba(0,0,0,0.25)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: 1 }}
              >
                {/* Header */}
                <div
                  className="px-6 py-5 flex items-center gap-3.5 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)" }}
                >
                  <motion.div
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent 70%)" }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...springBounce, delay: 0.1 }}
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(openedMessage.sender_name)} flex items-center justify-center shadow-md ring-2 ring-white/40 relative`}
                  >
                    <span className="text-white text-base font-bold">{avatar(openedMessage.sender_name, openedMessage.sender_email)}</span>
                  </motion.div>
                  <motion.div
                    className="flex-1 min-w-0 relative"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.16 }}
                  >
                    <p className="text-sm font-bold text-white">{openedMessage.sender_name}</p>
                    <p className="text-[11px] text-emerald-100">{openedMessage.sender_dept} · {fmtTime(openedMessage.created_at)}</p>
                  </motion.div>
                  <motion.button
                    onClick={closeMessage}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={springSnap}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors relative"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Message */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, ...springSoft }}
                  className="px-6 py-6 max-h-[50vh] overflow-y-auto"
                >
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{openedMessage.message_content}</p>
                </motion.div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>Auto-deleted at midnight · still visible in inbox</span>
                  </div>
                  <motion.button
                    onClick={closeMessage}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springSnap}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors flex-shrink-0"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeChat;