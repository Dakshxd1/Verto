import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { DEFAULT_SHORTCUT_MAP } from "../utils/shortcutDefaults";

const STORAGE_KEY = "verto_app_settings";

const DEFAULTS = {
  // Appearance
  colorMode: "light",
  nightLight: "normal",
  contrast: "normal",
  fontSize: "medium",
  fontFamily: "inter",
  compactMode: "normal",

  // Dashboard
  dashboardPeriod: "month",
  landingPage: "dashboard",
  currencyFormat: "indian",

  // Notifications
  soundNotifications: true,
  soundPaymentReceived: true,
  soundInvoiceAdded: true,
  soundOsPayout: true,
  soundSalary: true,
  desktopNotifications: false,
  dailySummary: false,

  // Productivity
  autoRefresh: "off",
  stickyFilters: true,
  quickSearch: true,

  // Finance
  numberDisplay: "indian",
  negativeDisplay: "parens",
  profitColor: "green",

  // Keyboard Shortcuts (NEW)
  shortcutsEnabled: true,
  shortcutAddInvoice: true,
  shortcutPaymentReceived: true,
  shortcutOsPayout: true,
  shortcutSalaryPayment: true,
  shortcutExpense: true,
  shortcutCreditNote: true,
  shortcutBounceBack: true,
  shortcutAdvanceLoan: true,
  shortcutStatutory: true,
  shortcutCommandPalette: true,

  // Export Settings (NEW)
  defaultExportType: "excel",
  includeCompanyLogo: true,
  includeFilters: true,

  // Advanced
  performanceMode: false,
  startupLiveScreen: true,
  starBackground: true,
};

const SettingsContext = createContext(null);

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

const FONT_URLS = {
  inter: null,
  poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
  roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  opensans: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap",
  system: null,
};

const FONT_STACKS = {
  inter: "'Inter', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  roboto: "'Roboto', system-ui, sans-serif",
  opensans: "'Open Sans', system-ui, sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const FONT_SIZE_SCALE = {
  small: "13px",
  medium: "14px",
  large: "16px",
  xl: "18px",
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  const applySettings = useCallback((s) => {
    const root = document.documentElement;
    const body = document.body;

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = s.colorMode === "dark" || (s.colorMode === "system" && prefersDark);

    root.classList.toggle("dark", isDark);
    root.setAttribute("data-color-mode", s.colorMode);

    root.setAttribute("data-night-light", s.nightLight);
    const filterMap = {
      normal: "none",
      warm: "sepia(20%) brightness(98%)",
      "extra-warm": "sepia(40%) brightness(96%) saturate(85%)",
    };
    body.style.filter = filterMap[s.nightLight] || "none";

    root.setAttribute("data-contrast", s.contrast);
    root.classList.toggle("high-contrast", s.contrast !== "normal");
    root.classList.toggle("ultra-contrast", s.contrast === "ultra");

    root.style.fontSize = FONT_SIZE_SCALE[s.fontSize] || "14px";

    const fontUrl = FONT_URLS[s.fontFamily];
    if (fontUrl) {
      const existingLink = document.getElementById("verto-font-link");
      if (existingLink) existingLink.href = fontUrl;
      else {
        const link = document.createElement("link");
        link.id = "verto-font-link";
        link.rel = "stylesheet";
        link.href = fontUrl;
        document.head.appendChild(link);
      }
    }
    root.style.setProperty("--font-app", FONT_STACKS[s.fontFamily] || FONT_STACKS.inter);
    body.style.fontFamily = FONT_STACKS[s.fontFamily] || FONT_STACKS.inter;

    root.setAttribute("data-compact", s.compactMode);
    root.classList.toggle("compact", s.compactMode === "compact");
    root.classList.toggle("ultra-compact", s.compactMode === "ultra-compact");

    root.classList.toggle("perf-mode", s.performanceMode);

    root.setAttribute("data-stars", String(s.starBackground));

    root.setAttribute("data-number-format", s.numberDisplay);
    root.setAttribute("data-currency-format", s.currencyFormat);

    root.setAttribute("data-negative", s.negativeDisplay);

    if (isDark) {
      root.style.setProperty("--bg-primary", "#0f172a");
      root.style.setProperty("--bg-secondary", "#1e293b");
      root.style.setProperty("--bg-card", "#1e293b");
      root.style.setProperty("--border-color", "rgba(255,255,255,0.08)");
      root.style.setProperty("--text-primary", "#f1f5f9");
      root.style.setProperty("--text-secondary", "#94a3b8");
      root.style.setProperty("--text-muted", "#64748b");
      root.style.setProperty("--shadow-color", "rgba(0,0,0,0.4)");
    } else {
      root.style.setProperty("--bg-primary", "#f8faff");
      root.style.setProperty("--bg-secondary", "#ffffff");
      root.style.setProperty("--bg-card", "#ffffff");
      root.style.setProperty("--border-color", "rgba(226,232,240,0.8)");
      root.style.setProperty("--text-primary", "#0f172a");
      root.style.setProperty("--text-secondary", "#475569");
      root.style.setProperty("--text-muted", "#94a3b8");
      root.style.setProperty("--shadow-color", "rgba(59,130,246,0.08)");
    }

    if (s.contrast === "high" || s.contrast === "ultra") {
      root.style.setProperty("--text-primary", isDark ? "#ffffff" : "#000000");
      root.style.setProperty("--border-color", isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)");
    }
  }, []);

  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings, applySettings]);

  useEffect(() => {
    if (settings.colorMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applySettings(settings);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [settings, applySettings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULTS });
  }, []);

  // ── Keyboard shortcuts: per-user, synced via Supabase ─────────────────
  const [shortcuts, setShortcuts] = useState({ ...DEFAULT_SHORTCUT_MAP });
  const [shortcutsLoaded, setShortcutsLoaded] = useState(false);
  const [shortcutEmail, setShortcutEmail] = useState(null);

  // Get email reliably from Supabase session (works on reload, not localStorage-dependent)
  const loadShortcutsForEmail = useCallback(async (email) => {
    if (!email) {
      setShortcuts({ ...DEFAULT_SHORTCUT_MAP });
      setShortcutsLoaded(true);
      return;
    }
    try {
      const { data } = await supabase
        .from("user_shortcuts")
        .select("shortcuts")
        .eq("email", email)
        .maybeSingle();

      if (data?.shortcuts) {
        setShortcuts({ ...DEFAULT_SHORTCUT_MAP, ...data.shortcuts });
      } else {
        setShortcuts({ ...DEFAULT_SHORTCUT_MAP });
      }
    } catch {
      setShortcuts({ ...DEFAULT_SHORTCUT_MAP });
    }
    setShortcutsLoaded(true);
  }, []);

  // On mount: get session from Supabase directly (reliable on page reload)
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      const email = session?.user?.email || null;
      setShortcutEmail(email);
      loadShortcutsForEmail(email);
    });

    // Also listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      setShortcutEmail(email);
      loadShortcutsForEmail(email);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [loadShortcutsForEmail]);

  // Persist the full current map to Supabase (upsert)
  const persistShortcuts = useCallback(async (map) => {
    const email = shortcutEmail;
    if (!email) return;
    await supabase
      .from("user_shortcuts")
      .upsert({ email, shortcuts: map }, { onConflict: "email" });
  }, [shortcutEmail]);

  // Rebind a single action to a new combo
  const updateShortcut = useCallback((actionId, combo) => {
    setShortcuts((prev) => {
      const next = { ...prev, [actionId]: combo };
      persistShortcuts(next);
      return next;
    });
  }, [persistShortcuts]);

  // Restore all shortcuts to defaults
  const resetShortcuts = useCallback(() => {
    const next = { ...DEFAULT_SHORTCUT_MAP };
    setShortcuts(next);
    persistShortcuts(next);
  }, [persistShortcuts]);

  // Export current shortcuts as a JSON string
  const exportShortcuts = useCallback(() => {
    return JSON.stringify(shortcuts, null, 2);
  }, [shortcuts]);

  // Import shortcuts from a parsed JSON object — only known action ids are kept
  const importShortcuts = useCallback((obj) => {
    const next = { ...DEFAULT_SHORTCUT_MAP };
    Object.keys(DEFAULT_SHORTCUT_MAP).forEach((id) => {
      if (typeof obj?.[id] === "string" && obj[id].trim()) {
        next[id] = obj[id].trim().toLowerCase();
      }
    });
    setShortcuts(next);
    persistShortcuts(next);
    return next;
  }, [persistShortcuts]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        resetSettings,
        shortcuts,
        shortcutsLoaded,
        updateShortcut,
        resetShortcuts,
        exportShortcuts,
        importShortcuts,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function useNumberFormatter() {
  const { settings } = useSettings();
  return useCallback((value, options = {}) => {
    const n = Number(value || 0);
    const { prefix = "₹", compact = false } = options;
    const fmt = compact ? settings.currencyFormat : settings.numberDisplay;

    if (fmt === "k" || fmt === "million") {
      if (Math.abs(n) >= 1e7) return `${prefix}${(n / 1e7).toFixed(1)}Cr`;
      if (Math.abs(n) >= 1e5) return `${prefix}${(n / 1e5).toFixed(1)}L`;
      if (Math.abs(n) >= 1e3) return `${prefix}${(n / 1e3).toFixed(1)}K`;
    }
    if (fmt === "lakh") {
      if (Math.abs(n) >= 1e7) return `${prefix}${(n / 1e7).toFixed(2)} Cr`;
      if (Math.abs(n) >= 1e5) return `${prefix}${(n / 1e5).toFixed(2)} Lakh`;
    }
    if (fmt === "raw") return `${prefix}${n.toLocaleString("en-US")}`;

    const isNeg = n < 0;
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    const display = `${prefix}${formatted}`;

    if (!isNeg) return display;
    const negFmt = settings.negativeDisplay;
    if (negFmt === "parens") return `(${display})`;
    if (negFmt === "red") return display;
    return `-${display}`;
  }, [settings.numberDisplay, settings.currencyFormat, settings.negativeDisplay]);
}