import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "verto_app_settings";

const DEFAULTS = {
  // Appearance
  colorMode: "light",           // light | dark | system
  nightLight: "normal",         // normal | warm | extra-warm
  contrast: "normal",           // normal | high | ultra
  fontSize: "medium",           // small | medium | large | xl
  fontFamily: "inter",          // inter | poppins | roboto | opensans | system
  compactMode: "normal",        // normal | compact | ultra-compact

  // Dashboard
  dashboardPeriod: "month",     // month | 3m | 6m | 12m
  landingPage: "dashboard",     // dashboard | pl | banking | invoices | internal-cost
  currencyFormat: "indian",     // indian | k | lakh

  // Notifications
  soundNotifications: true,
  soundPaymentReceived: true,
  soundInvoiceAdded: true,
  soundOsPayout: true,
  soundSalary: true,
  desktopNotifications: false,
  dailySummary: false,

  // Productivity
  autoRefresh: "off",           // off | 30s | 1m | 5m
  stickyFilters: true,
  quickSearch: true,

  // Finance
  numberDisplay: "indian",      // indian | million | raw
  negativeDisplay: "parens",    // parens | dash | red
  profitColor: "green",         // green (profit=green/loss=red) | inverse

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

// ── Font URLs ──────────────────────────────────────────────────────────────
const FONT_URLS = {
  inter:    null, // already loaded
  poppins:  "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
  roboto:   "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  opensans: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap",
  system:   null,
};

const FONT_STACKS = {
  inter:    "'Inter', system-ui, sans-serif",
  poppins:  "'Poppins', system-ui, sans-serif",
  roboto:   "'Roboto', system-ui, sans-serif",
  opensans: "'Open Sans', system-ui, sans-serif",
  system:   "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const FONT_SIZE_SCALE = {
  small:   "13px",
  medium:  "14px",
  large:   "16px",
  xl:      "18px",
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  // Apply all settings to <html> element
  const applySettings = useCallback((s) => {
    const root = document.documentElement;
    const body = document.body;

    // ── Color Mode ────────────────────────────────────────────────────────
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark =
      s.colorMode === "dark" ||
      (s.colorMode === "system" && prefersDark);

    root.classList.toggle("dark", isDark);
    root.setAttribute("data-color-mode", s.colorMode);

    // ── Night Light ───────────────────────────────────────────────────────
    root.setAttribute("data-night-light", s.nightLight);
    const filterMap = {
      normal:     "none",
      warm:       "sepia(20%) brightness(98%)",
      "extra-warm": "sepia(40%) brightness(96%) saturate(85%)",
    };
    body.style.filter = filterMap[s.nightLight] || "none";

    // ── Contrast ──────────────────────────────────────────────────────────
    root.setAttribute("data-contrast", s.contrast);
    root.classList.toggle("high-contrast", s.contrast !== "normal");
    root.classList.toggle("ultra-contrast", s.contrast === "ultra");

    // ── Font Size ─────────────────────────────────────────────────────────
    root.style.fontSize = FONT_SIZE_SCALE[s.fontSize] || "14px";

    // ── Font Family ───────────────────────────────────────────────────────
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

    // ── Compact Mode ──────────────────────────────────────────────────────
    root.setAttribute("data-compact", s.compactMode);
    root.classList.toggle("compact", s.compactMode === "compact");
    root.classList.toggle("ultra-compact", s.compactMode === "ultra-compact");

    // ── Performance Mode ──────────────────────────────────────────────────
    root.classList.toggle("perf-mode", s.performanceMode);

    // ── Star Background ───────────────────────────────────────────────────
    root.setAttribute("data-stars", String(s.starBackground));

    // ── Number / Currency format ─────────────────────────────────────────
    root.setAttribute("data-number-format", s.numberDisplay);
    root.setAttribute("data-currency-format", s.currencyFormat);

    // ── Negative display ─────────────────────────────────────────────────
    root.setAttribute("data-negative", s.negativeDisplay);

    // ── Dark mode CSS vars ────────────────────────────────────────────────
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

    // ── High contrast overrides ───────────────────────────────────────────
    if (s.contrast === "high" || s.contrast === "ultra") {
      root.style.setProperty("--text-primary", isDark ? "#ffffff" : "#000000");
      root.style.setProperty("--border-color", isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)");
    }

  }, []);

  // Apply whenever settings change
  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings, applySettings]);

  // Listen for system color scheme changes
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

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, DEFAULTS }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

// ── Utility: format a number based on current settings ────────────────────
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

    // Default: Indian format
    const isNeg = n < 0;
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    const display = `${prefix}${formatted}`;

    if (!isNeg) return display;
    const negFmt = settings.negativeDisplay;
    if (negFmt === "parens") return `(${display})`;
    if (negFmt === "red")    return display; // caller must apply color
    return `-${display}`;
  }, [settings.numberDisplay, settings.currencyFormat, settings.negativeDisplay]);
}