import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import {
  Palette,
  BarChart2,
  Bell,
  Zap,
  DollarSign,
  Cpu,
  Sun,
  Moon,
  Monitor,
  Type,
  AlignJustify,
  Contrast,
  Eye,
  RefreshCw,
  Filter,
  Search,
  Hash,
  TrendingDown,
  Star,
  Activity,
  Volume2,
  VolumeX,
  Layout,
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  Sliders,
} from "lucide-react";

// ── Toggle ────────────────────────────────────────────────────────────────
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

// ── Pill Selector ─────────────────────────────────────────────────────────
const PillSelect = ({ options, value, onChange, accent = "blue" }) => {
  const accentMap = {
    blue:   "bg-blue-600 text-white shadow-sm shadow-blue-200",
    indigo: "bg-indigo-600 text-white shadow-sm shadow-indigo-200",
    violet: "bg-violet-600 text-white shadow-sm shadow-violet-200",
    amber:  "bg-amber-500 text-white shadow-sm shadow-amber-200",
    rose:   "bg-rose-500 text-white shadow-sm shadow-rose-200",
    emerald:"bg-emerald-500 text-white shadow-sm shadow-emerald-200",
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
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          {opt.icon && <span className="mr-1">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ── Setting Row ───────────────────────────────────────────────────────────
const SettingRow = ({ label, description, children, badge }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-50 last:border-0">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// ── Section Card ─────────────────────────────────────────────────────────
const SectionCard = ({ id, icon: Icon, title, subtitle, color, children, activeSection, onToggle }) => {
  const colorMap = {
    blue:   { bg: "from-blue-500 to-indigo-600",   light: "bg-blue-50 text-blue-700 border-blue-100",   dot: "bg-blue-500" },
    violet: { bg: "from-violet-500 to-purple-600",  light: "bg-violet-50 text-violet-700 border-violet-100", dot: "bg-violet-500" },
    amber:  { bg: "from-amber-500 to-orange-500",   light: "bg-amber-50 text-amber-700 border-amber-100",  dot: "bg-amber-500" },
    emerald:{ bg: "from-emerald-500 to-teal-500",   light: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
    rose:   { bg: "from-rose-500 to-pink-600",      light: "bg-rose-50 text-rose-700 border-rose-100",    dot: "bg-rose-500" },
    slate:  { bg: "from-slate-600 to-gray-700",     light: "bg-gray-50 text-gray-700 border-gray-200",    dot: "bg-gray-500" },
  };
  const c = colorMap[color] || colorMap.blue;
  const isOpen = activeSection === id;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-md`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-2 border-t border-gray-50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Preview Badge ─────────────────────────────────────────────────────────
const LivePreview = ({ settings }) => {
  const sampleNum = settings.numberDisplay === "k" || settings.numberDisplay === "million"
    ? "₹87.8L"
    : settings.numberDisplay === "raw"
    ? "₹87799167"
    : "₹87,79,916";

  const fontMap = {
    inter: "'Inter', sans-serif",
    poppins: "'Poppins', sans-serif",
    roboto: "'Roboto', sans-serif",
    opensans: "'Open Sans', sans-serif",
    system: "system-ui, sans-serif",
  };

  return (
    <div
      className="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-center"
      style={{ fontFamily: fontMap[settings.fontFamily] }}
    >
      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Live Preview</p>
      <p className="text-2xl font-black text-blue-700">{sampleNum}</p>
      <p className="text-xs text-blue-400 mt-1">
        {settings.fontFamily.charAt(0).toUpperCase() + settings.fontFamily.slice(1)} ·{" "}
        {settings.fontSize} · {settings.compactMode} rows
      </p>
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[10px] text-gray-500 font-medium">
          {settings.colorMode === "dark" ? "Dark mode" : settings.colorMode === "system" ? "System" : "Light mode"} ·{" "}
          {settings.contrast !== "normal" ? settings.contrast + " contrast" : "normal contrast"}
        </span>
      </div>
    </div>
  );
};

// ── Main Settings Page ────────────────────────────────────────────────────
const SettingsPage = () => {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [activeSection, setActiveSection] = useState("appearance");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleSection = (id) => setActiveSection((prev) => (prev === id ? null : id));

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

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Settings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Preferences apply across the entire app instantly</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              resetConfirm
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resetConfirm ? "Confirm Reset?" : "Reset All"}
          </button>
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-600"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Live Preview */}
      <LivePreview settings={settings} />

      {/* ── 🎨 APPEARANCE ── */}
      <SectionCard
        id="appearance" icon={Palette} title="Appearance"
        subtitle="Theme, fonts, and display density"
        color="blue" activeSection={activeSection} onToggle={toggleSection}
      >
        <SettingRow label="Color Mode" description="Changes the entire app theme">
          <PillSelect
            value={settings.colorMode}
            onChange={(v) => updateSetting("colorMode", v)}
            options={[
              { value: "light",  label: "☀️ Light" },
              { value: "dark",   label: "🌙 Dark" },
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
              { value: "normal",     label: "Normal" },
              { value: "warm",       label: "🌅 Warm" },
              { value: "extra-warm", label: "🕯️ Extra Warm" },
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
              { value: "high",   label: "High" },
              { value: "ultra",  label: "Ultra" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Font Size">
          <PillSelect
            value={settings.fontSize}
            onChange={(v) => updateSetting("fontSize", v)}
            options={[
              { value: "small",  label: "S" },
              { value: "medium", label: "M" },
              { value: "large",  label: "L" },
              { value: "xl",     label: "XL" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Font Family" description="Changes text throughout the app">
          <PillSelect
            value={settings.fontFamily}
            onChange={(v) => updateSetting("fontFamily", v)}
            options={[
              { value: "inter",    label: "Inter" },
              { value: "poppins",  label: "Poppins" },
              { value: "roboto",   label: "Roboto" },
              { value: "opensans", label: "Open Sans" },
              { value: "system",   label: "System" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Compact Mode" description="Reduce row height — great for large tables">
          <PillSelect
            value={settings.compactMode}
            onChange={(v) => updateSetting("compactMode", v)}
            accent="indigo"
            options={[
              { value: "normal",        label: "Normal" },
              { value: "compact",       label: "Compact" },
              { value: "ultra-compact", label: "Ultra" },
            ]}
          />
        </SettingRow>
      </SectionCard>

      {/* ── 📊 DASHBOARD ── */}
      <SectionCard
        id="dashboard" icon={BarChart2} title="Dashboard"
        subtitle="Default views and data display"
        color="violet" activeSection={activeSection} onToggle={toggleSection}
      >
        <SettingRow label="Default Period" description="Date range auto-selected on Dashboard load">
          <PillSelect
            value={settings.dashboardPeriod}
            onChange={(v) => updateSetting("dashboardPeriod", v)}
            accent="violet"
            options={[
              { value: "month", label: "This Month" },
              { value: "3m",    label: "3 Months" },
              { value: "6m",    label: "6 Months" },
              { value: "12m",   label: "12 Months" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Landing Page" description="First page shown after login">
          <PillSelect
            value={settings.landingPage}
            onChange={(v) => updateSetting("landingPage", v)}
            accent="violet"
            options={[
              { value: "dashboard",     label: "Dashboard" },
              { value: "pl",            label: "P&L" },
              { value: "banking",       label: "Banking" },
              { value: "invoices",      label: "Invoices" },
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
              { value: "indian",  label: "₹1,25,000" },
              { value: "k",       label: "₹125K" },
              { value: "lakh",    label: "₹1.25L" },
            ]}
          />
        </SettingRow>
      </SectionCard>

      {/* ── 🔔 NOTIFICATIONS ── */}
      <SectionCard
        id="notifications" icon={Bell} title="Notifications"
        subtitle="Sounds, alerts, and summaries"
        color="amber" activeSection={activeSection} onToggle={toggleSection}
      >
        <SettingRow label="Sound Notifications" description="Audible alerts for key events">
          <Toggle
            enabled={settings.soundNotifications}
            onChange={(v) => updateSetting("soundNotifications", v)}
          />
        </SettingRow>

        <AnimatePresence>
          {settings.soundNotifications && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-amber-50 rounded-xl p-3 my-2 space-y-2.5">
                {[
                  ["soundPaymentReceived", "Payment Received"],
                  ["soundInvoiceAdded",    "Invoice Added"],
                  ["soundOsPayout",        "OS Payout Approved"],
                  ["soundSalary",          "Salary Processed"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-800">{label}</span>
                    <Toggle
                      enabled={settings[key]}
                      onChange={(v) => updateSetting(key, v)}
                    />
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
              if (v && "Notification" in window) {
                Notification.requestPermission();
              }
              updateSetting("desktopNotifications", v);
            }}
          />
        </SettingRow>

        <SettingRow label="Daily Financial Summary" description="Get a daily digest at end of day">
          <Toggle
            enabled={settings.dailySummary}
            onChange={(v) => updateSetting("dailySummary", v)}
          />
        </SettingRow>
      </SectionCard>

      {/* ── ⚡ PRODUCTIVITY ── */}
      <SectionCard
        id="productivity" icon={Zap} title="Productivity"
        subtitle="Speed, search, and filter memory"
        color="emerald" activeSection={activeSection} onToggle={toggleSection}
      >
        <SettingRow label="Auto Refresh" description="Automatically refresh dashboard data">
          <PillSelect
            value={settings.autoRefresh}
            onChange={(v) => updateSetting("autoRefresh", v)}
            accent="emerald"
            options={[
              { value: "off", label: "Off" },
              { value: "30s", label: "30s" },
              { value: "1m",  label: "1 min" },
              { value: "5m",  label: "5 min" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Sticky Filters" description="Remember department, entity, and date range after logout">
          <Toggle
            enabled={settings.stickyFilters}
            onChange={(v) => updateSetting("stickyFilters", v)}
          />
        </SettingRow>

        <SettingRow label="Quick Invoice Search" description="Type 4+ digits anywhere to instantly find an invoice">
          <Toggle
            enabled={settings.quickSearch}
            onChange={(v) => updateSetting("quickSearch", v)}
          />
        </SettingRow>
      </SectionCard>

      {/* ── 💰 FINANCE ── */}
      <SectionCard
        id="finance" icon={DollarSign} title="Finance Display"
        subtitle="Number formats and color coding"
        color="rose" activeSection={activeSection} onToggle={toggleSection}
      >
        <SettingRow label="Number Display" description="How large numbers are formatted in tables and charts">
          <PillSelect
            value={settings.numberDisplay}
            onChange={(v) => updateSetting("numberDisplay", v)}
            accent="rose"
            options={[
              { value: "indian",  label: "8,77,99,167" },
              { value: "million", label: "87.8M" },
              { value: "raw",     label: "87799167" },
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
              { value: "dash",   label: "−10,000" },
              { value: "red",    label: "🔴 Red" },
            ]}
          />
        </SettingRow>

        <SettingRow label="Profit / Loss Colors" description="Color scheme for profit and loss indicators">
          <PillSelect
            value={settings.profitColor}
            onChange={(v) => updateSetting("profitColor", v)}
            accent="emerald"
            options={[
              { value: "green",   label: "🟢 Green profit" },
              { value: "inverse", label: "🔵 Inverse" },
            ]}
          />
        </SettingRow>
      </SectionCard>

      {/* ── 🚀 ADVANCED ── */}
      <SectionCard
        id="advanced" icon={Cpu} title="Advanced"
        subtitle="Performance, animations, and visual FX"
        color="slate" activeSection={activeSection} onToggle={toggleSection}
      >
        <SettingRow
          label="Performance Mode"
          description="Disables animations, glow effects, and particles — recommended for slower machines"
        >
          <Toggle
            enabled={settings.performanceMode}
            onChange={(v) => updateSetting("performanceMode", v)}
          />
        </SettingRow>

        <SettingRow label="Startup Live Screen" description="Show live activity screen immediately after login">
          <Toggle
            enabled={settings.startupLiveScreen}
            onChange={(v) => updateSetting("startupLiveScreen", v)}
          />
        </SettingRow>

        <SettingRow label="Star Background" description="Animated star particles in the background">
          <Toggle
            enabled={settings.starBackground}
            onChange={(v) => updateSetting("starBackground", v)}
          />
        </SettingRow>
      </SectionCard>

      {/* Save button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Settings Saved Automatically · Tap to Confirm
        </button>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          All changes apply instantly and persist across sessions
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;