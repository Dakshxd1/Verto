import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import {
  SHORTCUT_ACTIONS,
  formatCombo,
  comboToString,
  findConflict,
} from "../utils/shortcutDefaults";
import {
  Palette,
  BarChart2,
  Bell,
  Zap,
  DollarSign,
  Cpu,
  Keyboard,
  Download,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  Edit2,
  Upload,
  AlertTriangle,
  X,
} from "lucide-react";

/* ─── Toggle ─── */
const Toggle = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
      enabled ? "bg-blue-500" : "bg-gray-200"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

/* ─── Pill Select ─── */
const PillSelect = ({ options, value, onChange, accent = "blue" }) => {
  const accentMap = {
    blue: "bg-blue-600 text-white shadow-sm shadow-blue-200",
    indigo: "bg-indigo-600 text-white shadow-sm shadow-indigo-200",
    violet: "bg-violet-600 text-white shadow-sm shadow-violet-200",
    amber: "bg-amber-500 text-white shadow-sm shadow-amber-200",
    rose: "bg-rose-500 text-white shadow-sm shadow-rose-200",
    emerald: "bg-emerald-500 text-white shadow-sm shadow-emerald-200",
    slate: "bg-slate-600 text-white shadow-sm shadow-slate-200",
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
            value === opt.value
              ? accentMap[accent] + " border-transparent"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
          }`}
        >
          {opt.icon && <span className="mr-1">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
};

/* ─── Setting Row ─── */
const SettingRow = ({ label, description, children, badge }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

/* ─── KBD Badge ─── */
const Kbd = ({ children }) => (
  <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-200 rounded-md text-gray-700">
    {children}
  </kbd>
);

/* ─── Sections config ─── */
const SECTIONS = [
  { id: "appearance", icon: Palette, title: "Appearance", subtitle: "Theme, fonts, and display", color: "blue", gradient: "from-blue-500 to-indigo-600" },
  { id: "dashboard", icon: BarChart2, title: "Dashboard", subtitle: "Default views and data display", color: "violet", gradient: "from-violet-500 to-purple-600" },
  { id: "notifications", icon: Bell, title: "Notifications", subtitle: "Sounds, alerts, and summaries", color: "amber", gradient: "from-amber-500 to-orange-500" },
  { id: "productivity", icon: Zap, title: "Productivity", subtitle: "Speed, search, and filter memory", color: "emerald", gradient: "from-emerald-500 to-teal-500" },
  { id: "finance", icon: DollarSign, title: "Finance Display", subtitle: "Number formats and color coding", color: "rose", gradient: "from-rose-500 to-pink-600" },
  { id: "shortcuts", icon: Keyboard, title: "Keyboard Shortcuts", subtitle: "Global hotkeys for quick actions", color: "indigo", gradient: "from-indigo-500 to-blue-600" },
  { id: "export", icon: Download, title: "Export Settings", subtitle: "Default format and page options", color: "slate", gradient: "from-slate-600 to-gray-700" },
  { id: "advanced", icon: Cpu, title: "Advanced", subtitle: "Performance, animations, and FX", color: "slate", gradient: "from-slate-500 to-gray-600" },
];

/* ─── Main Page ─── */
const SettingsPage = () => {
  const { settings, updateSetting, resetSettings,
    shortcuts, updateShortcut, resetShortcuts,
    exportShortcuts, importShortcuts } = useSettings();
  const [activeSection, setActiveSection] = useState("appearance");
  const [resetConfirm, setResetConfirm]   = useState(false);
  const [saved, setSaved]                 = useState(false);

  // ── Shortcut capture state ──
  const [capturing, setCapturing]         = useState(null); // action id being edited
  const [capturedCombo, setCapturedCombo] = useState("");   // combo pressed so far
  const [conflict, setConflict]           = useState(null); // conflicting action label
  const [resetShortcutsConfirm, setResetShortcutsConfirm] = useState(false);
  const importRef = useRef(null);

  // Handle keydown while capturing
  useEffect(() => {
    if (!capturing) return;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const combo = comboToString(e);
      if (!combo) return;
      if (!combo.startsWith("ctrl")) {
        if (e.key === "Escape") { setCapturing(null); setCapturedCombo(""); setConflict(null); }
        return;
      }
      const conflictId = findConflict(shortcuts, combo, capturing);
      const conflictAction = SHORTCUT_ACTIONS.find(a => a.id === conflictId);
      setCapturedCombo(combo);
      setConflict(conflictAction ? conflictAction.label : null);
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [capturing, shortcuts]);

  const saveCapture = useCallback(() => {
    if (!capturedCombo || conflict) return;
    updateShortcut(capturing, capturedCombo);
    setCapturing(null); setCapturedCombo(""); setConflict(null);
  }, [capturing, capturedCombo, conflict, updateShortcut]);

  const handleExport = () => {
    const json = exportShortcuts();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "verto-shortcuts.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        importShortcuts(obj);
        setSaved(true); setTimeout(() => setSaved(false), 2000);
      } catch { alert("Invalid JSON file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Group actions by group label
  const shortcutGroups = ["Quick Add", "Navigate", "Power"].map((g) => ({
    group: g,
    actions: SHORTCUT_ACTIONS.filter((a) => a.group === g),
  }));

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    resetSettings();
    setResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const active = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-64px)] flex gap-6 p-6">
      {/* ── LEFT SIDEBAR ── */}
      <div className="w-72 flex-shrink-0 space-y-2 overflow-y-auto pr-2 scrollbar-hide">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">Preferences apply instantly</p>
        </div>

        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 group ${
                isActive
                  ? "bg-white shadow-md border border-gray-100 ring-1 ring-blue-100"
                  : "hover:bg-white/60"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${isActive ? `bg-gradient-to-br ${section.gradient}` : "bg-gray-100 group-hover:scale-105 transition-transform"}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${isActive ? "text-gray-900" : "text-gray-800"}`}>
                  {section.title}
                </div>
                <div className="text-[11px] text-gray-500 truncate">{section.subtitle}</div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "text-blue-500 translate-x-0.5" : "text-gray-300"}`} />
            </button>
          );
        })}

        <div className="pt-4 space-y-2">
          <button
            type="button"
            onClick={handleReset}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              resetConfirm
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resetConfirm ? "Confirm Reset?" : "Reset All"}
          </button>

          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-600"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 overflow-y-auto flex-1 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${active.gradient} flex items-center justify-center shadow-lg`}>
                  <active.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{active.title}</h3>
                  <p className="text-sm text-gray-500">{active.subtitle}</p>
                </div>
              </div>

              {/* ── APPEARANCE ── */}
              {activeSection === "appearance" && (
                <div className="space-y-1">
                  <SettingRow label="Color Mode" description="Changes the entire app theme">
                    <PillSelect
                      value={settings.colorMode}
                      onChange={(v) => updateSetting("colorMode", v)}
                      options={[
                        { value: "light", label: "☀️ Light" },
                        { value: "dark", label: "🌙 Dark" },
                        { value: "system", label: "🖥️ System" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Night Light" description="Warm tone to reduce eye strain during long sessions">
                    <PillSelect
                      value={settings.nightLight}
                      onChange={(v) => updateSetting("nightLight", v)}
                      accent="amber"
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "warm", label: "🌅 Warm" },
                        { value: "extra-warm", label: "🖥️ Extra Warm" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Contrast" description="Increase contrast for better readability">
                    <PillSelect
                      value={settings.contrast}
                      onChange={(v) => updateSetting("contrast", v)}
                      accent="slate"
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "high", label: "High" },
                        { value: "ultra", label: "Ultra" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Font Size">
                    <PillSelect
                      value={settings.fontSize}
                      onChange={(v) => updateSetting("fontSize", v)}
                      options={[
                        { value: "small", label: "S" },
                        { value: "medium", label: "M" },
                        { value: "large", label: "L" },
                        { value: "xl", label: "XL" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Font Family" description="Changes text throughout the app">
                    <PillSelect
                      value={settings.fontFamily}
                      onChange={(v) => updateSetting("fontFamily", v)}
                      options={[
                        { value: "inter", label: "Inter" },
                        { value: "poppins", label: "Poppins" },
                        { value: "roboto", label: "Roboto" },
                        { value: "opensans", label: "Open Sans" },
                        { value: "system", label: "System" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Compact Mode" description="Reduce row height — great for large tables">
                    <PillSelect
                      value={settings.compactMode}
                      onChange={(v) => updateSetting("compactMode", v)}
                      accent="indigo"
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "compact", label: "Compact" },
                        { value: "ultra-compact", label: "Ultra" },
                      ]}
                    />
                  </SettingRow>
                </div>
              )}

              {/* ── DASHBOARD ── */}
              {activeSection === "dashboard" && (
                <div className="space-y-1">
                  <SettingRow label="Default Period" description="Date range auto-selected on Dashboard load">
                    <PillSelect
                      value={settings.dashboardPeriod}
                      onChange={(v) => updateSetting("dashboardPeriod", v)}
                      accent="violet"
                      options={[
                        { value: "month", label: "This Month" },
                        { value: "3m", label: "3 Months" },
                        { value: "6m", label: "6 Months" },
                        { value: "12m", label: "12 Months" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Landing Page" description="First page shown after login">
                    <PillSelect
                      value={settings.landingPage}
                      onChange={(v) => updateSetting("landingPage", v)}
                      accent="violet"
                      options={[
                        { value: "dashboard", label: "Dashboard" },
                        { value: "pl", label: "P&L" },
                        { value: "banking", label: "Banking" },
                        { value: "invoices", label: "Invoices" },
                        { value: "internal-cost", label: "Internal Cost" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Currency Format" description="How amounts are displayed across the app">
                    <PillSelect
                      value={settings.currencyFormat}
                      onChange={(v) => updateSetting("currencyFormat", v)}
                      accent="violet"
                      options={[
                        { value: "indian", label: "₹1,25,000" },
                        { value: "k", label: "₹125K" },
                        { value: "lakh", label: "₹1.25L" },
                      ]}
                    />
                  </SettingRow>
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeSection === "notifications" && (
                <div className="space-y-1">
                  <SettingRow label="Sound Notifications" description="Audible alerts for key events">
                    <Toggle enabled={settings.soundNotifications} onChange={(v) => updateSetting("soundNotifications", v)} />
                  </SettingRow>
                  <AnimatePresence>
                    {settings.soundNotifications && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-amber-50 rounded-xl p-3 my-2 space-y-2.5">
                          {[
                            ["soundPaymentReceived", "Payment Received"],
                            ["soundInvoiceAdded", "Invoice Added"],
                            ["soundOsPayout", "OS Payout Approved"],
                            ["soundSalary", "Salary Processed"],
                          ].map(([key, label]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-xs font-medium text-amber-800">{label}</span>
                              <Toggle enabled={settings[key]} onChange={(v) => updateSetting(key, v)} />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <SettingRow label="Desktop Notifications" description="Show browser push notifications" badge="Beta">
                    <Toggle
                      enabled={settings.desktopNotifications}
                      onChange={(v) => {
                        if (v && "Notification" in window) Notification.requestPermission();
                        updateSetting("desktopNotifications", v);
                      }}
                    />
                  </SettingRow>
                  <SettingRow label="Daily Financial Summary" description="Get a daily digest at end of day">
                    <Toggle enabled={settings.dailySummary} onChange={(v) => updateSetting("dailySummary", v)} />
                  </SettingRow>
                </div>
              )}

              {/* ── PRODUCTIVITY ── */}
              {activeSection === "productivity" && (
                <div className="space-y-1">
                  <SettingRow label="Auto Refresh" description="Automatically refresh dashboard data">
                    <PillSelect
                      value={settings.autoRefresh}
                      onChange={(v) => updateSetting("autoRefresh", v)}
                      accent="emerald"
                      options={[
                        { value: "off", label: "Off" },
                        { value: "30s", label: "30s" },
                        { value: "1m", label: "1 min" },
                        { value: "5m", label: "5 min" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Sticky Filters" description="Remember department, entity, and date range after logout">
                    <Toggle enabled={settings.stickyFilters} onChange={(v) => updateSetting("stickyFilters", v)} />
                  </SettingRow>
                  <SettingRow label="Quick Invoice Search" description="Type 4+ digits anywhere to instantly find an invoice">
                    <Toggle enabled={settings.quickSearch} onChange={(v) => updateSetting("quickSearch", v)} />
                  </SettingRow>
                </div>
              )}

              {/* ── FINANCE ── */}
              {activeSection === "finance" && (
                <div className="space-y-1">
                  <SettingRow label="Number Display" description="How large numbers are formatted in tables and charts">
                    <PillSelect
                      value={settings.numberDisplay}
                      onChange={(v) => updateSetting("numberDisplay", v)}
                      accent="rose"
                      options={[
                        { value: "indian", label: "8,77,99,167" },
                        { value: "million", label: "87.8M" },
                        { value: "raw", label: "87799167" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Negative Values" description="How negative amounts are shown">
                    <PillSelect
                      value={settings.negativeDisplay}
                      onChange={(v) => updateSetting("negativeDisplay", v)}
                      accent="rose"
                      options={[
                        { value: "parens", label: "(10,000)" },
                        { value: "dash", label: "−10,000" },
                        { value: "red", label: "🔴 Red" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Profit / Loss Colors" description="Color scheme for profit and loss indicators">
                    <PillSelect
                      value={settings.profitColor}
                      onChange={(v) => updateSetting("profitColor", v)}
                      accent="emerald"
                      options={[
                        { value: "green", label: "🟢 Green profit" },
                        { value: "inverse", label: "🔴 Inverse" },
                      ]}
                    />
                  </SettingRow>
                </div>
              )}

              {/* ── KEYBOARD SHORTCUTS (NEW) ── */}
              {activeSection === "shortcuts" && (
                <div className="space-y-5">
                  {/* Master toggle */}
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div>
                      <p className="text-sm font-bold text-indigo-900">Enable All Keyboard Shortcuts</p>
                      <p className="text-xs text-indigo-500 mt-0.5">Master switch — disabling this turns off all hotkeys</p>
                    </div>
                    <Toggle enabled={settings.shortcutsEnabled} onChange={(v) => updateSetting("shortcutsEnabled", v)} />
                  </div>

                  {/* Import / Export / Reset row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleExport}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all">
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                    <button onClick={() => importRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all">
                      <Upload className="w-3.5 h-3.5" /> Import
                    </button>
                    <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                    <button
                      onClick={() => {
                        if (!resetShortcutsConfirm) { setResetShortcutsConfirm(true); return; }
                        resetShortcuts(); setResetShortcutsConfirm(false);
                        setSaved(true); setTimeout(() => setSaved(false), 2000);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        resetShortcutsConfirm
                          ? "bg-rose-50 border-rose-200 text-rose-600"
                          : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600"}`}>
                      <RotateCcw className="w-3.5 h-3.5" />
                      {resetShortcutsConfirm ? "Confirm Reset?" : "Restore Defaults"}
                    </button>
                  </div>

                  {/* Capture overlay */}
                  <AnimatePresence>
                    {capturing && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="sticky top-0 z-10 bg-white border-2 border-blue-400 rounded-xl p-4 shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 mb-1">
                              Press new shortcut for: <span className="text-blue-600">{SHORTCUT_ACTIONS.find(a=>a.id===capturing)?.label}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {capturedCombo ? (
                                <kbd className="px-3 py-1.5 text-sm font-mono font-bold bg-blue-50 border-2 border-blue-300 rounded-lg text-blue-700">
                                  {formatCombo(capturedCombo)}
                                </kbd>
                              ) : (
                                <span className="text-sm text-gray-500 italic animate-pulse">Waiting for key combo (must include Ctrl)…</span>
                              )}
                            </div>
                            {conflict && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Already assigned to: <span className="font-bold">{conflict}</span> — choose a different combo
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              disabled={!capturedCombo || !!conflict}
                              onClick={saveCapture}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                              Save
                            </button>
                            <button onClick={() => { setCapturing(null); setCapturedCombo(""); setConflict(null); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-all">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Shortcut groups */}
                  {shortcutGroups.map(({ group, actions }) => (
                    <div key={group}>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">{group}</p>
                      <div className="space-y-1.5">
                        {actions.map((action) => {
                          const currentCombo = shortcuts[action.id] || action.default;
                          const isCustom = currentCombo !== action.default;
                          const isCapturing = capturing === action.id;

                          return (
                            <div key={action.id}
                              className={`flex items-center justify-between py-3 px-4 rounded-xl border transition-all ${
                                isCapturing
                                  ? "border-blue-300 bg-blue-50"
                                  : !settings.shortcutsEnabled
                                  ? "opacity-40 bg-gray-50 border-gray-100"
                                  : "bg-gray-50 border-gray-100 hover:border-gray-200"
                              }`}>
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Current combo display */}
                                <kbd className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border whitespace-nowrap flex-shrink-0 ${
                                  isCustom
                                    ? "bg-violet-50 border-violet-200 text-violet-700"
                                    : "bg-blue-50 border-blue-100 text-blue-700"
                                }`}>
                                  {formatCombo(currentCombo)}
                                </kbd>
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-gray-800 block truncate">{action.label}</span>
                                  {isCustom && (
                                    <span className="text-[10px] text-violet-500 font-semibold">Custom · default: {formatCombo(action.default)}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Edit button */}
                                <button
                                  disabled={!settings.shortcutsEnabled}
                                  onClick={() => {
                                    setCapturing(action.id);
                                    setCapturedCombo("");
                                    setConflict(null);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                  <Edit2 className="w-3 h-3" /> Edit
                                </button>
                                {/* Reset single shortcut to default */}
                                {isCustom && (
                                  <button
                                    onClick={() => updateShortcut(action.id, action.default)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-rose-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all">
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <p className="text-[11px] text-gray-500 text-center pt-2">
                    Shortcuts don't fire when typing inside inputs or textareas · <kbd className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> cancels capture
                  </p>
                </div>
              )}

              {/* ── EXPORT SETTINGS (NEW) ── */}
              {activeSection === "export" && (
                <div className="space-y-1">
                  <SettingRow label="Default Export Type" description="Format used when exporting tables or reports">
                    <PillSelect
                      value={settings.defaultExportType}
                      onChange={(v) => updateSetting("defaultExportType", v)}
                      accent="slate"
                      options={[
                        { value: "excel", label: "📊 Excel" },
                        { value: "pdf", label: "📄 PDF" },
                        { value: "csv", label: "📋 CSV" },
                      ]}
                    />
                  </SettingRow>
                  <SettingRow label="Include Company Logo" description="Embed logo in exported PDF and Excel headers">
                    <Toggle enabled={settings.includeCompanyLogo} onChange={(v) => updateSetting("includeCompanyLogo", v)} />
                  </SettingRow>
                  <SettingRow label="Include Filters" description="Append active filter summary to exported documents">
                    <Toggle enabled={settings.includeFilters} onChange={(v) => updateSetting("includeFilters", v)} />
                  </SettingRow>

                  <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Export Preview</h4>
                    <p className="text-xs text-gray-500 mb-3">Your documents will look like this</p>
                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          {settings.includeCompanyLogo && (
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-xs">🏢</div>
                          )}
                          <span className="text-sm font-bold text-gray-900">Verto Finance</span>
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{settings.defaultExportType}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-100 rounded w-3/4" />
                        <div className="h-2 bg-gray-100 rounded w-1/2" />
                        <div className="h-2 bg-gray-100 rounded w-5/6" />
                      </div>
                      {settings.includeFilters && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <span className="text-[10px] text-gray-500">Filters: Department=All · Entity=All · Date=This Month</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ADVANCED ── */}
              {activeSection === "advanced" && (
                <div className="space-y-1">
                  <SettingRow label="Performance Mode" description="Disables animations, glow effects, and particles — recommended for slower machines">
                    <Toggle enabled={settings.performanceMode} onChange={(v) => updateSetting("performanceMode", v)} />
                  </SettingRow>
                  <SettingRow label="Startup Live Screen" description="Show live activity screen immediately after login">
                    <Toggle enabled={settings.startupLiveScreen} onChange={(v) => updateSetting("startupLiveScreen", v)} />
                  </SettingRow>
                  <SettingRow label="Star Background" description="Animated star particles in the background">
                    <Toggle enabled={settings.starBackground} onChange={(v) => updateSetting("starBackground", v)} />
                  </SettingRow>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Save footer */}
          <div className="mt-8 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Automatically · Tap to Confirm
            </button>
            <p className="text-center text-[10px] text-gray-500 mt-2">
              All changes apply instantly and persist across sessions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;