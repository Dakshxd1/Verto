import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../lib/supabaseClient";
import {
  Monitor,
  Smartphone,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  Clock,
  Shield,
  Crown,
  Briefcase,
  User,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseDevice = (userAgent) => {
  if (!userAgent) return { label: "Unknown Device", sublabel: "", icon: Monitor };
  const ua = userAgent;
  const ual = ua.toLowerCase();
  const isMobile = /android|iphone|ipad/i.test(ua);

  // Browser + version
  let browser = "Browser", browserVer = "";
  const edgeM = ua.match(/Edg\/([\d]+)/);
  const chromeM = ua.match(/Chrome\/([\d]+)/);
  const firefoxM = ua.match(/Firefox\/([\d]+)/);
  const safariM = ua.match(/Version\/([\d]+).*Safari/);
  const operaM = ua.match(/OPR\/([\d]+)/);
  if (operaM)                     { browser = "Opera";   browserVer = operaM[1]; }
  else if (edgeM)                 { browser = "Edge";    browserVer = edgeM[1]; }
  else if (firefoxM)              { browser = "Firefox"; browserVer = firefoxM[1]; }
  else if (safariM && !chromeM)   { browser = "Safari";  browserVer = safariM[1]; }
  else if (chromeM)               { browser = "Chrome";  browserVer = chromeM[1]; }

  // OS + version
  let os = "", osVer = "";
  const winM = ua.match(/Windows NT ([\d.]+)/);
  if (winM) {
    const v = { "10.0": "11/10", "6.3": "8.1", "6.2": "8", "6.1": "7" };
    os = "Windows"; osVer = v[winM[1]] || winM[1];
  } else if (/Mac OS X ([\d_]+)/i.test(ua)) {
    const macM = ua.match(/Mac OS X ([\d_]+)/i);
    const ver = macM[1].replace(/_/g, ".");
    const parts = ver.split(".");
    const names = { "15": "Sequoia", "14": "Sonoma", "13": "Ventura", "12": "Monterey", "11": "Big Sur" };
    const tenNames = { "10.15": "Catalina", "10.14": "Mojave", "10.13": "High Sierra" };
    os = "macOS";
    osVer = names[parts[0]] || (parts[0] === "10" ? tenNames[parts[0]+"."+parts[1]] || ver : ver);
  } else if (/iPhone/i.test(ua)) {
    const iosM = ua.match(/OS ([\d_]+) like/i);
    os = "iPhone"; osVer = iosM ? "iOS " + iosM[1].replace(/_/g, ".") : "";
  } else if (/iPad/i.test(ua)) {
    const iosM = ua.match(/OS ([\d_]+) like/i);
    os = "iPad"; osVer = iosM ? "iOS " + iosM[1].replace(/_/g, ".") : "";
  } else if (/Android/i.test(ua)) {
    const andM = ua.match(/Android ([\d.]+)/i);
    os = "Android"; osVer = andM ? andM[1] : "";
  } else if (/Linux/i.test(ual)) { os = "Linux"; }

  return {
    label:    browserVer ? `${browser} ${browserVer}` : browser,
    sublabel: osVer ? `${os} ${osVer}` : os,
    icon:     isMobile ? Smartphone : Monitor,
  };
};

// DB returns "timestamp without time zone" values as UTC strings with no
// timezone suffix. JS Date() would otherwise parse these as LOCAL time,
// causing a +5:30 (IST) offset error. Appending "Z" forces correct UTC parsing.
const toUtcDate = (dateStr) => {
    if (!dateStr) return null;
    // already has timezone info (Z or +hh:mm) — leave as-is
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(dateStr)) return new Date(dateStr);
    return new Date(dateStr + "Z");
  };
  
  const timeAgo = (dateStr) => {
    if (!dateStr) return "Never";
    const d = toUtcDate(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 15) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };
  
  const isOnline = (lastSeenStr) => {
    if (!lastSeenStr) return false;
    const d = toUtcDate(lastSeenStr);
    const diff = (Date.now() - d.getTime()) / 1000;
    return diff < 30; // active in last 30s = online
  };

const roleCfg = {
  admin:    { icon: Crown,    pill: "bg-sky-50 text-sky-700 border border-sky-200",         label: "Admin"    },
  manager:  { icon: Briefcase,pill: "bg-indigo-50 text-indigo-700 border border-indigo-200",label: "Manager"  },
  employee: { icon: User,     pill: "bg-slate-100 text-slate-600 border border-slate-200",  label: "Employee" },
};

const rc = (role) => roleCfg[role] || roleCfg.employee;

// ── Main Component ────────────────────────────────────────────────────────────

const SessionMonitor = () => {
  const [sessions, setSessions]     = useState([]);
  const [allUsers, setAllUsers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [kicking, setKicking]       = useState(null); // email being force-logged-out
  const [kickResult, setKickResult] = useState(null); // { email, success }
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tick, setTick]             = useState(0);    // drives timeAgo updates

  // Login History state
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEmail, setHistoryEmail] = useState(null); // null = all users

  // Update "x ago" every 10s without re-fetching
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: sessionData }, { data: userData }] = await Promise.all([
      supabase
        .from("user_active_sessions")
        .select("email, logged_in_at, last_seen_at, user_agent, ip_address"),
      supabase
        .from("user_roles")
        .select("email, role, is_active")
        .order("role")
        .order("email"),
    ]);

    setSessions(sessionData || []);
    setAllUsers(userData || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async (email = null) => {
    const { data } = await supabase.rpc("get_login_history", {
      p_email: email,
      p_limit: 50,
    });
    setHistory(data || []);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const id = setInterval(fetchData, 15_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handleForceLogout = async (email) => {
    setKicking(email);
    setKickResult(null);
    const { data, error } = await supabase.rpc("force_logout_user", {
      p_email: email,
    });
    if (error || !data?.success) {
      setKickResult({ email, success: false, error: error?.message || data?.error });
    } else {
      setKickResult({ email, success: true });
      // Optimistically remove from sessions list
      setSessions((prev) => prev.filter((s) => s.email !== email));
    }
    setKicking(null);
    setTimeout(() => setKickResult(null), 4000);
  };

  // Merge: every user + their session if exists
  const rows = allUsers.map((u) => {
    const session = sessions.find((s) => s.email === u.email) || null;
    return { ...u, session };
  });

  const onlineCount  = sessions.filter((s) => isOnline(s.last_seen_at)).length;
  const sessionCount = sessions.length;

  return (
    <div className="space-y-4">

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Currently Online",
            value: onlineCount,
            icon: Wifi,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-100",
            dot: "bg-emerald-400",
          },
          {
            label: "Active Sessions",
            value: sessionCount,
            icon: Monitor,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-100",
            dot: null,
          },
          {
            label: "Total Users",
            value: allUsers.length,
            icon: Shield,
            color: "text-slate-600",
            bg: "bg-slate-50 border-slate-100",
            dot: null,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-3.5 flex items-center gap-3 ${stat.bg}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/70 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-xl font-bold ${stat.color} leading-none flex items-center gap-1.5`}>
                {stat.value}
                {stat.dot && (
                  <span className={`w-2 h-2 rounded-full ${stat.dot} animate-pulse`} />
                )}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Login History Toggle Button ── */}
      <button
        onClick={() => {
          setShowHistory((v) => !v);
          if (!showHistory) fetchHistory(historyEmail);
        }}
        className="text-xs font-semibold text-blue-600 hover:underline mt-2"
      >
        {showHistory ? "Hide" : "Show"} Login History
      </button>

      {/* ── Kick result toast ── */}
      <AnimatePresence>
        {kickResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border
              ${kickResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
          >
            {kickResult.success
              ? <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> <span><strong>{kickResult.email}</strong> has been logged out.</span></>
              : <><AlertTriangle className="w-4 h-4 flex-shrink-0" /> <span>Failed to log out {kickResult.email}: {kickResult.error}</span></>
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Table header bar */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Session Activity
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-[10px] text-gray-400">
                Updated {timeAgo(lastRefresh.toISOString())}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="bg-gray-50 border-b border-gray-100">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-8" />
              <col />
              <col className="w-20" />
              <col className="w-20" />
              <col className="w-36" />
              <col className="w-24" />
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr>
                {["#", "User", "Role", "Status", "Device", "Last Seen", ""].map((h, i) => (
                  <th
                    key={i}
                    className={`py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest
                      ${i === 0 ? "pl-5 text-left" : i === 6 ? "pr-4 text-right" : "px-2 text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Rows */}
        <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-8" />
              <col />
              <col className="w-20" />
              <col className="w-20" />
              <col className="w-36" />
              <col className="w-24" />
              <col className="w-20" />
            </colgroup>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <RefreshCw className="w-5 h-5 text-blue-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Loading sessions…</p>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const online   = row.session ? isOnline(row.session.last_seen_at) : false;
                  const hasSession = !!row.session;
                  const device   = row.session ? parseDevice(row.session.user_agent) : null;
                  const cfg      = rc(row.role);
                  const RoleIcon = cfg.icon;
                  const DeviceIcon = device?.icon || Monitor;

                  return (
                    <motion.tr
                      key={row.email}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`border-b border-gray-50 last:border-0 transition-colors
                        ${online ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-gray-50/80"}`}
                    >
                      {/* # */}
                      <td className="pl-5 py-3.5 w-8">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-2 py-3.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
                            ${online
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {row.email[0].toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-800 font-medium truncate">
                            {row.email}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-2 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.pill}`}>
                          <RoleIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-2 py-3.5">
                        {hasSession ? (
                          online ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Away
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
                            <WifiOff className="w-3 h-3" />
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Device */}
                      <td className="px-2 py-3.5">
                        {device ? (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <DeviceIcon className="w-3 h-3 flex-shrink-0 text-gray-400" />
                            <div className="min-w-0">
                              <div className="text-[10px] text-gray-700 font-medium truncate">{device.label}</div>
                              {device.sublabel && (
                                <div className="text-[9px] text-gray-400 truncate">{device.sublabel}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>

                      {/* Last seen */}
                      <td className="px-2 py-3.5">
                        {row.session ? (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <Clock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            {/* tick forces re-render every 10s */}
                            <span key={tick}>{timeAgo(row.session.last_seen_at)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300">Never logged in</span>
                        )}
                      </td>

                      {/* Force logout */}
                      <td className="pr-4 py-3.5 text-right">
                        {hasSession && (
                          <button
                            onClick={() => handleForceLogout(row.email)}
                            disabled={kicking === row.email}
                            title={`Force logout ${row.email}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
                              text-rose-500 bg-rose-50 border border-rose-100
                              hover:bg-rose-100 hover:text-rose-700
                              disabled:opacity-40 disabled:cursor-not-allowed
                              transition-all"
                          >
                            {kicking === row.email ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <LogOut className="w-3 h-3" />
                            )}
                            Logout
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              <span className="font-semibold text-emerald-600">{onlineCount} online</span>
              {" · "}
              <span className="font-semibold text-amber-500">
                {sessionCount - onlineCount > 0 ? `${sessionCount - onlineCount} away` : ""}
              </span>
              {sessionCount - onlineCount > 0 && " · "}
              {allUsers.length - sessionCount} never logged in
            </p>
            <p className="text-[10px] text-gray-400">Auto-refreshes every 15s</p>
          </div>
        )}
      </div>

      {/* ── Login History Table ── */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-gray-100 mt-4 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Login History (last 50)</h3>
            <RefreshCw
              className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-gray-600"
              onClick={() => fetchHistory(historyEmail)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase">
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-2 py-2 text-left">Logged In</th>
                  <th className="px-2 py-2 text-left">IP</th>
                  <th className="px-2 py-2 text-left">Device</th>
                  <th className="px-2 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const dev = parseDevice(h.user_agent);
                  return (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-700">{h.email}</td>
                      <td className="px-2 py-2 text-gray-500">{new Date(h.logged_in_at).toLocaleString()}</td>
                      <td className="px-2 py-2 text-gray-500">{h.ip_address || "—"}</td>
                      <td className="px-2 py-2 text-gray-500">{dev.label}{dev.sublabel ? ` · ${dev.sublabel}` : ""}</td>
                      <td className="px-2 py-2">
                        {h.kicked_at ? (
                          <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            {h.kicked_reason === "admin_kick" ? "Kicked by admin" : "Replaced by new login"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            Active / Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionMonitor;