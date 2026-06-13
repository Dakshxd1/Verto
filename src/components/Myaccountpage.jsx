import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
//  DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
const T = {
  bg:          "#0B1120",
  surface:     "#0F172A",
  card:        "#131D2F",
  border:      "#1E293B",
  borderHi:    "#334155",
  accent:      "#3B82F6",
  accentSoft:  "rgba(59,130,246,0.15)",
  accentGlow:  "rgba(59,130,246,0.35)",
  green:       "#10B981",
  greenSoft:   "rgba(16,185,129,0.12)",
  greenGlow:   "rgba(16,185,129,0.25)",
  amber:       "#F59E0B",
  amberSoft:   "rgba(245,158,11,0.10)",
  red:         "#EF4444",
  redSoft:     "rgba(239,68,68,0.10)",
  textPrimary:   "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted:     "#475569",
  chartColors: ["#3B82F6","#10B981","#F59E0B","#8B5CF6","#F43F5E","#0EA5E9"],
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadein { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 ${T.accentGlow}; }
    70%  { box-shadow: 0 0 0 12px rgba(59,130,246,0); }
    100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
  }
  .mac-page { animation: fadein 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .mac-statrow { transition: background 0.2s ease; }
  .mac-statrow:hover { background: rgba(59,130,246,0.05); }
  .mac-fieldcard {
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    position: relative;
    overflow: hidden;
  }
  .mac-fieldcard::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    padding: 1px; background: linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 40%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    pointer-events: none; opacity: 0; transition: opacity 0.3s;
  }
  .mac-fieldcard:hover::before { opacity: 1; }
  .mac-fieldcard:hover {
    border-color: ${T.borderHi} !important;
    background: #162236 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  }
  .mac-badge {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .mac-badge:hover { transform: translateY(-1px); }
`;

function StyleTag() {
  return <style dangerouslySetInnerHTML={{ __html: STYLE }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const val = (v, fallback = "—") =>
  v !== null && v !== undefined && v !== "" ? v : fallback;

const fmtDate = (v) => {
  if (!v) return null;
  try {
    return new Date(v).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return v; }
};

const fmtMoney = (v) => {
  const n = parseFloat(v);
  if (!v || isNaN(n)) return null;
  return "₹\u202f" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const deptMap = {
  OS: "Operations", REC: "Recruitment", TEMP: "Temporary",
  PROJ: "Projects", OTH: "Others", ACCTS: "Accounts",
  BD: "Business Development", Common: "Common",
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ATOMS
// ═══════════════════════════════════════════════════════════════════════════════
function Mono({ children, style }) {
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", ...style }}>
      {children}
    </span>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase", color: T.textMuted, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function Divider({ my = 20 }) {
  return (
    <div style={{
      height: 1, margin: `${my}px 0`,
      background: `linear-gradient(90deg, transparent 0%, ${T.border} 20%, ${T.border} 80%, transparent 100%)`,
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AVATAR
// ═══════════════════════════════════════════════════════════════════════════════
function Avatar({ name, email, size = 88 }) {
  const initials = (name || email || "?")
    .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      position: "relative", width: size, height: size, flexShrink: 0,
    }}>
      {/* glow ring */}
      <div style={{
        position: "absolute", inset: -3, borderRadius: "50%",
        background: `conic-gradient(from 180deg, ${T.accent}, ${T.green}, ${T.accent})`,
        opacity: 0.25, filter: "blur(4px)",
      }} />
      {/* solid ring */}
      <div style={{
        position: "absolute", inset: -2, borderRadius: "50%",
        padding: 2,
        background: `linear-gradient(135deg, ${T.accent} 0%, ${T.green} 100%)`,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: `linear-gradient(140deg, #1d4ed8 0%, #0ea5e9 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.32, fontWeight: 700, color: "#fff",
          letterSpacing: "0.04em",
          animation: "pulse-ring 3s ease-out infinite",
        }}>
          {initials}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BADGE
// ═══════════════════════════════════════════════════════════════════════════════
function Badge({ text, color = T.accent, bg }) {
  const isActive = text?.toLowerCase() === "active";
  const finalColor = isActive ? T.green : color;
  const finalBg = isActive ? T.greenSoft : (bg || color + "18");
  return (
    <span className="mac-badge" style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: finalColor, background: finalBg,
      border: `1px solid ${finalColor}30`, whiteSpace: "nowrap",
      cursor: "default",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: finalColor,
        flexShrink: 0, boxShadow: `0 0 6px ${finalColor}`,
      }} />
      {text}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FIELD CARD
// ═══════════════════════════════════════════════════════════════════════════════
function FieldCard({ label, value, mono, delay = 0 }) {
  const display = value ?? "—";
  const isEmpty = display === "—";
  return (
    <div className="mac-fieldcard" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "14px 16px",
      gridColumn: "1 / -1",
      animation: `fadein 0.4s ease ${delay}ms both`,
    }}>
      <Label>{label}</Label>
      {mono ? (
        <Mono style={{
          fontSize: 13, color: isEmpty ? T.textMuted : T.textPrimary,
          fontWeight: 500, lineHeight: 1.5,
        }}>
          {display}
        </Mono>
      ) : (
        <div style={{
          fontSize: 13, color: isEmpty ? T.textMuted : T.textPrimary,
          fontWeight: 500, lineHeight: 1.5,
          fontStyle: isEmpty ? "italic" : "normal",
        }}>
          {display}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function Section({ title, accent, children, icon }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 3, height: 18, borderRadius: 3,
          background: accent || T.accent,
          boxShadow: `0 0 10px ${accent || T.accent}40`,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: T.textSecondary,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {icon && <span style={{ fontSize: 14, opacity: 0.8 }}>{icon}</span>}
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPENSATION STAT
// ═══════════════════════════════════════════════════════════════════════════════
function CompStat({ label, value, highlight, last, delay = 0 }) {
  const display = fmtMoney(value);
  const hasValue = !!display;
  return (
    <div className="mac-statrow" style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 16px",
      borderBottom: last ? "none" : `1px solid ${T.border}`,
      borderRadius: last ? "0 0 12px 12px" : 0,
      animation: `fadein 0.35s ease ${delay}ms both`,
    }}>
      <span style={{
        fontSize: 13, color: highlight ? T.textPrimary : T.textSecondary,
        fontWeight: highlight ? 600 : 400,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        color: highlight ? T.green : (hasValue ? T.textPrimary : T.textMuted),
        fontWeight: highlight ? 700 : 500,
        letterSpacing: highlight ? "0.02em" : "0",
      }}>
        {display || "—"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COST HEAD BAR
// ═══════════════════════════════════════════════════════════════════════════════
function CostBar({ data }) {
  if (!data || typeof data !== "object") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: 120, gap: 10,
      }}>
        <span style={{ fontSize: 28, opacity: 0.4 }}>📊</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>No allocation data available</span>
      </div>
    );
  }
  const entries = Object.entries(data).filter(([, v]) => parseFloat(v) > 0);
  if (!entries.length) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: 120, gap: 10,
      }}>
        <span style={{ fontSize: 28, opacity: 0.4 }}>0️⃣</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>All allocations are zero</span>
      </div>
    );
  }
  const total = entries.reduce((s, [, v]) => s + parseFloat(v), 0);
  const labelMap = {
    ops: "Operations", rec: "Recruitment", temp: "Temporary", projects: "Projects",
  };

  return (
    <div>
      {/* Segmented bar */}
      <div style={{
        display: "flex", borderRadius: 8, overflow: "hidden", height: 10, gap: 3,
        marginBottom: 20, boxShadow: `0 2px 12px rgba(0,0,0,0.3)`,
      }}>
        {entries.map(([k, v], i) => (
          <div key={k} style={{
            flex: parseFloat(v) / total,
            background: T.chartColors[i % T.chartColors.length],
            borderRadius: 8, minWidth: 4,
            transition: "flex 0.6s cubic-bezier(0.16,1,0.3,1)",
          }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
        {entries.map(([k, v], i) => (
          <div key={k} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: 3,
                background: T.chartColors[i % T.chartColors.length],
                display: "inline-block", flexShrink: 0,
                boxShadow: `0 0 8px ${T.chartColors[i % T.chartColors.length]}50`,
              }} />
              <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>
                {labelMap[k] || k.charAt(0).toUpperCase() + k.slice(1)}
              </span>
            </div>
            <Mono style={{ fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>
              {v}%
            </Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOADING & ERROR
// ═══════════════════════════════════════════════════════════════════════════════
function Loading() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "60vh", gap: 18,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: `3px solid ${T.border}`,
        borderTop: `3px solid ${T.accent}`,
        borderRight: `3px solid ${T.accentSoft}`,
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{ color: T.textMuted, fontSize: 13, fontWeight: 500 }}>
        Loading your profile…
      </span>
    </div>
  );
}

function ErrorView({ msg }) {
  return (
    <div style={{
      margin: 24, padding: "18px 22px",
      background: T.redSoft, border: `1px solid ${T.red}30`,
      borderRadius: 12, color: T.red, fontSize: 13, lineHeight: 1.6,
    }}>
      <strong style={{ fontWeight: 700 }}>Could not load profile.</strong>
      <div style={{ marginTop: 4, opacity: 0.85 }}>{msg}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MyAccountPage({ supabase }) {
  const [profile, setProfile] = useState(null);
  const [email,   setEmail]   = useState("");
  const [role,    setRole]    = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated.");
        setEmail(user.email);

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("email", user.email)
          .maybeSingle();
        setRole(roleRow?.role || "");

        const { data, error: rpcErr } = await supabase.rpc("get_my_profile");
        if (rpcErr) throw rpcErr;
        setProfile(data?.[0] || null);
      } catch (e) {
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  if (loading) return (
    <>
      <StyleTag />
      <div style={{ background: T.bg, minHeight: "100vh" }}>
        <Loading />
      </div>
    </>
  );

  if (error) return (
    <>
      <StyleTag />
      <div style={{ background: T.bg, minHeight: "100vh" }}>
        <ErrorView msg={error} />
      </div>
    </>
  );

  const p = profile;
  const doj = p?.doj ? fmtDate(p.doj) : null;
  const tenure = p?.doj ? (() => {
    const ms = Date.now() - new Date(p.doj).getTime();
    const yrs = Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25));
    const mos = Math.floor((ms % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    return yrs > 0 ? `${yrs}y ${mos}m` : `${mos}m`;
  })() : null;

  const sidebarStats = [
    { label: "Employee Code", value: p?.emp_code ? `#${p.emp_code}` : null, mono: true },
    { label: "Entity",        value: p?.entity },
    { label: "Department",    value: deptMap[p?.department] || p?.department },
    { label: "Location",      value: p?.location },
  ];

  return (
    <>
      <StyleTag />
      <div className="mac-page" style={{
        background: T.bg, minHeight: "100vh",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: T.textPrimary,
      }}>
        <div style={{
          maxWidth: 1120, margin: "0 auto",
          padding: "28px 24px 60px",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 24,
          alignItems: "start",
        }}>
          {/* ═══════════════════════════════════════════════════════════
              LEFT SIDEBAR
          ═══════════════════════════════════════════════════════════*/}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>

            {/* Identity Card */}
            <div style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: 28,
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", gap: 18,
              position: "relative", overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            }}>
              {/* ambient top glow */}
              <div style={{
                position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
                width: 240, height: 140,
                background: `radial-gradient(ellipse, ${T.accentSoft} 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />

              <Avatar name={p?.name} email={email} size={88} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: T.textPrimary,
                  lineHeight: 1.3, marginBottom: 4, letterSpacing: "-0.01em",
                }}>
                  {p?.name || email}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 14, fontWeight: 500 }}>
                  {val(p?.designation)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                  <Badge text={p?.status || "Active"} />
                  {role && (
                    <Badge
                      text={role.charAt(0).toUpperCase() + role.slice(1)}
                      color={T.accent}
                      bg={T.accentSoft}
                    />
                  )}
                </div>
              </div>

              <Divider my={4} />

              {/* Quick Stats */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
                {sidebarStats.map(({ label, value: v, mono }) => (
                  <div key={label} className="mac-statrow" style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    gap: 8, padding: "8px 10px", borderRadius: 8,
                  }}>
                    <span style={{
                      fontSize: 12, color: T.textMuted, fontWeight: 500, whiteSpace: "nowrap",
                    }}>
                      {label}
                    </span>
                    {mono ? (
                      <Mono style={{ fontSize: 12, color: v ? T.textSecondary : T.textMuted }}>
                        {v || "—"}
                      </Mono>
                    ) : (
                      <span style={{
                        fontSize: 12, color: v ? T.textSecondary : T.textMuted,
                        textAlign: "right", fontWeight: 500,
                        fontStyle: v ? "normal" : "italic",
                      }}>
                        {v || "—"}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <Divider my={4} />

              {/* Email pill */}
              <div style={{
                width: "100%", padding: "12px 14px",
                background: `linear-gradient(135deg, ${T.accentSoft} 0%, rgba(59,130,246,0.06) 100%)`,
                borderRadius: 10,
                border: `1px solid ${T.accentGlow}`,
                fontSize: 12, color: T.accent, fontWeight: 600,
                wordBreak: "break-all", lineHeight: 1.5,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 14, opacity: 0.8 }}>✉</span>
                {email}
              </div>
            </div>

            {/* Tenure Card */}
            {doj && (
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "20px 22px",
                position: "relative", overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              }}>
                <div style={{
                  position: "absolute", top: -30, right: -30, width: 100, height: 100,
                  background: `radial-gradient(circle, ${T.greenGlow} 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
                <Label>Time at Company</Label>
                <div style={{
                  fontSize: 32, fontWeight: 800, color: T.textPrimary,
                  letterSpacing: "-0.03em", marginBottom: 4, lineHeight: 1,
                }}>
                  {tenure}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>
                  Since {doj}
                </div>
              </div>
            )}

            {/* Unlinked Warning */}
            {!p && (
              <div style={{
                background: `linear-gradient(135deg, ${T.amberSoft} 0%, rgba(245,158,11,0.04) 100%)`,
                border: `1px solid ${T.amber}25`,
                borderRadius: 12, padding: "18px 20px",
                fontSize: 13, color: T.amber, lineHeight: 1.7,
                boxShadow: "0 4px 24px rgba(245,158,11,0.08)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                  fontWeight: 700, fontSize: 13,
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  Profile not linked
                </div>
                <div style={{ opacity: 0.85 }}>
                  Your login email isn't matched to an employee record yet. Contact your admin to complete setup.
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              RIGHT CONTENT
          ═══════════════════════════════════════════════════════════*/}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Personal + Employment Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Personal */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 16, padding: 22,
                boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              }}>
                <Section title="Personal" accent="#3B82F6" icon="👤">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Full Name",     value: p?.name },
                      { label: "Father's Name", value: p?.father_name },
                      { label: "Date of Birth", value: fmtDate(p?.dob) === "—" ? null : fmtDate(p?.dob) },
                      { label: "Email",         value: p?.email || email },
                      { label: "Location",      value: p?.location },
                    ].map(({ label, value: v }, i) => (
                      <FieldCard key={label} label={label} value={v || null} delay={i * 40} />
                    ))}
                  </div>
                </Section>
              </div>

              {/* Employment */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 16, padding: 22,
                boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              }}>
                <Section title="Employment" accent="#10B981" icon="💼">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Designation",      value: p?.designation },
                      { label: "Department",       value: deptMap[p?.department] || p?.department },
                      { label: "Entity",           value: p?.entity },
                      { label: "Date of Joining",  value: doj },
                      { label: "Status",           value: p?.status },
                      { label: "Last Working Day", value: p?.last_working_day ? fmtDate(p.last_working_day) : null },
                    ].map(({ label, value: v }, i) => (
                      <FieldCard key={label} label={label} value={v || null} delay={i * 40} />
                    ))}
                  </div>
                </Section>
              </div>
            </div>

            {/* Compensation */}
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 16, padding: 22,
              boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            }}>
              <Section title="Compensation" accent="#F59E0B" icon="💰">
                <div style={{
                  border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden",
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  background: T.card,
                }}>
                  {/* Left */}
                  <div style={{ borderRight: `1px solid ${T.border}` }}>
                    <CompStat label="Cost to Company (CTC)" value={p?.ctc}         highlight delay={0} />
                    <CompStat label="Gross Value"           value={p?.gross_value} highlight delay={50} />
                    <CompStat label="Provident Fund (PF)"   value={p?.pf}                    delay={100} />
                    <CompStat label="ESI"                   value={p?.esi}                   delay={150} last />
                  </div>
                  {/* Right */}
                  <div>
                    <CompStat label="Bonus"              value={p?.bonus}           delay={0} />
                    <CompStat label="Variable Component" value={p?.variable}        delay={50} />
                    <CompStat label="Other Component"    value={p?.other_component} delay={100} />
                    <CompStat label="Reimbursement"      value={p?.reimbursement}   delay={150} last />
                  </div>
                </div>
              </Section>
            </div>

            {/* Cost Head + Client Focus Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Cost Head */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 16, padding: 22,
                boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              }}>
                <Section title="Cost Head Allocation" accent="#8B5CF6" icon="📊">
                  <CostBar data={p?.cost_head_breakup} />
                </Section>
              </div>

              {/* Client Focus */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 16, padding: 22,
                boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              }}>
                <Section title="Client Focus" accent="#0EA5E9" icon="🎯">
                  {(() => {
                    const d = p?.client_focus;
                    const items = Array.isArray(d)
                      ? d
                      : (d && typeof d === "object"
                          ? Object.entries(d).map(([k, v]) => `${k}: ${v}`)
                          : []);
                    if (!items.length) {
                      return (
                        <div style={{
                          display: "flex", flexDirection: "column", alignItems: "center",
                          justifyContent: "center", height: 120, gap: 10,
                        }}>
                          <span style={{ fontSize: 32, opacity: 0.3 }}>🎯</span>
                          <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>
                            No client assignments yet
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {items.map((item, i) => (
                          <span key={i} style={{
                            padding: "6px 14px", borderRadius: 99,
                            background: "rgba(14,165,233,0.08)",
                            border: "1px solid rgba(14,165,233,0.2)",
                            color: "#38BDF8", fontSize: 12, fontWeight: 600,
                            cursor: "default",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(14,165,233,0.15)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(14,165,233,0.08)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </Section>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px",
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}>
              <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>🔒</span>
                Read-only view · Data sourced from internal HR records
              </span>
              {p?.updated_at && (
                <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>
                  Last updated {fmtDate(p.updated_at)}
                </span>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}