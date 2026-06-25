import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import supabase from "../lib/supabaseClient";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  LabelList,
  Brush,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  CreditCard,
  FileText,
  Activity,
  Filter,
  RefreshCw,
  ChevronDown,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  BarChart2,
  Search,
  FileX,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL COLOR SYSTEM — Semantic, domain-consistent, accessible
// ═══════════════════════════════════════════════════════════════════════════════
// One deliberate token per business domain. Same color always means
// the same thing across the entire dashboard. Low-saturation, restrained.
const P = {
  steel: "#3D6A91",      // Revenue / Invoicing
  teal: "#2F8577",       // Collections / inflow / positive
  amber: "#C08A3E",      // Outstanding / pending / mid-risk
  brick: "#B14B3F",      // Credit notes / bad debt / outflow / high-risk
  clay: "#C17F4E",       // OS payout (external workforce cost)
  plum: "#6E5E94",       // Salary & CTC (internal payroll cost)
  slate: "#5B6B82",      // Team / headcount (neutral structural)
  sky: "#4A7FA6",        // Bank & cash flow
  trend: "#33415C",      // Secondary line / cumulative
  steelLight: "#A7C0D6",
  plumLight: "#C9C0E0",
};

// Categorical fallback for genuinely unordered multi-category data
const CC = [
  P.steel, P.teal, P.amber, P.brick, P.plum, P.clay, P.slate, P.sky,
];

const TEAM_DEPT_MAP = {
  OS: "Operations",
  Rec: "Recruitment",
  BD: "Business Development",
  Accts: "Accounts",
  Temp: "Temporary",
  Common: "Common",
};

// ─── Color helpers ────────────────────────────────────────────────────────────
const semanticColor = (label, idx = 0) => {
  const l = (label || "").toLowerCase();
  if (/paid|received|cleared|active|collected|completed|resolved|inflow/.test(l))
    return P.teal;
  if (/pending|partial|progress|due|review|outstanding/.test(l)) return P.amber;
  if (/overdue|cancel|reject|bad|inactive|terminated|left|fail|outflow/.test(l))
    return P.brick;
  return CC[idx % CC.length];
};

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"))
    .join("");

const seqColor = (i, total, fromHex, toHex) => {
  const t = total <= 1 ? 1 : i / (total - 1);
  const [r1, g1, b1] = hexToRgb(fromHex);
  const [r2, g2, b2] = hexToRgb(toHex);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const fmtFull = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtCount = (n) => Number(n || 0).toLocaleString("en-IN");
const toYYYYMM = (d) => (d || "").slice(0, 7);
const fmtMonth = (ym) =>
  !ym
    ? ""
    : new Date(ym + "-01").toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "");
const isBankInflow = (b) =>
  b.entry_type === "payment_received" || b.flow_type === "inflow";
const isSoftwareInflow = (s) =>
  s.flow_type === "inflow" || (s.flow_type == null && Number(s.amount) > 0);

const fyRange = (startYear) => {
  const start = `${startYear}-04-01`;
  const end = `${startYear + 1}-03-31`;
  const label = `FY ${String(startYear).slice(-2)}-${String(
    startYear + 1
  ).slice(-2)}`;
  return { label, start, end, startYear };
};
const currentFYStartYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? y : y - 1;
};

const safeRpc = async (fn, params) => {
  try {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) {
      console.warn(`RPC ${fn} error:`, error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`RPC ${fn} exception:`, e);
    return [];
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLTIPS — Unified, professional, context-aware
// ═══════════════════════════════════════════════════════════════════════════════
const TooltipBox = ({ children }) => (
  <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-2xl p-3 text-xs min-w-[180px] max-w-[280px]">
    {children}
  </div>
);

const CurrencyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <TooltipBox>
      {label && (
        <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1.5 truncate">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: p.color || p.fill }}
            />
            <span className="text-slate-500 truncate">{p.name}</span>
          </span>
          <span className="font-semibold text-slate-800 tabular-nums flex-shrink-0">
            {typeof p.value === "number" ? fmtFull(p.value) : p.value}
          </span>
        </div>
      ))}
    </TooltipBox>
  );
};

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <TooltipBox>
      {label && (
        <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1.5 truncate">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: p.color || p.fill }}
            />
            <span className="text-slate-500 truncate">{p.name}</span>
          </span>
          <span className="font-semibold text-slate-800 tabular-nums flex-shrink-0">
            {typeof p.value === "number" ? fmtCount(p.value) : p.value}
          </span>
        </div>
      ))}
    </TooltipBox>
  );
};

const PctTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <TooltipBox>
      {label && (
        <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1.5 truncate">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: p.color || p.fill }}
            />
            <span className="text-slate-500 truncate">{p.name}</span>
          </span>
          <span className="font-semibold text-slate-800 tabular-nums flex-shrink-0">
            {typeof p.value === "number" ? `${p.value.toFixed(1)}%` : p.value}
          </span>
        </div>
      ))}
    </TooltipBox>
  );
};

// Mixed-unit tooltip for composed charts (e.g. headcount vs cost)
const FlexibleTooltip = ({ active, payload, label, moneyKeys = [] }) => {
  if (!active || !payload?.length) return null;
  return (
    <TooltipBox>
      {label && (
        <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1.5 truncate">
          {label}
        </p>
      )}
      {payload.map((p, i) => {
        const isMoney = moneyKeys.includes(p.name) || moneyKeys.includes(p.dataKey);
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: p.color || p.fill }}
              />
              <span className="text-slate-500 truncate">{p.name}</span>
            </span>
            <span className="font-semibold text-slate-800 tabular-nums flex-shrink-0">
              {typeof p.value === "number"
                ? isMoney
                  ? fmtFull(p.value)
                  : fmtCount(p.value)
                : p.value}
            </span>
          </div>
        );
      })}
    </TooltipBox>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, color, trend, alert }) => (
  <div
    className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 ${
      alert ? "border-amber-200 bg-amber-50/30" : "border-slate-200"
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: color + "18" }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend !== undefined && (
        <span
          className={`flex items-center gap-0.5 text-[11px] font-semibold ${
            trend >= 0 ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {trend >= 0 ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
    <p className="text-[11px] font-semibold text-slate-500 mt-1">{label}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

// ─── Chart Card ───────────────────────────────────────────────────────────────
const ChartCard = ({
  title,
  subtitle,
  children,
  className = "",
  topN,
  onTopN,
  topNOptions = [5, 10, 20],
  scrollable,
  minScrollWidth,
  expandable,
  onExpand,
  noPadding = false,
}) => (
  <div
    className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}
  >
    <div className="flex items-start justify-between px-5 pt-5 pb-0 mb-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
        {topN !== undefined && onTopN && (
          <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            {topNOptions.map((n, i) => (
              <button
                key={n}
                onClick={() => onTopN(n)}
                className={`px-2 py-1 text-[10px] font-bold transition-colors ${
                  topN === n
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-800"
                } ${i > 0 ? "border-l border-slate-200" : ""}`}
              >
                {n === 999 ? "All" : `Top ${n}`}
              </button>
            ))}
          </div>
        )}
        {expandable && onExpand && (
          <button
            onClick={onExpand}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
    {scrollable ? (
      <div className="overflow-x-auto pb-5 px-5">
        <div style={{ minWidth: minScrollWidth || 600 }}>{children}</div>
      </div>
    ) : (
      <div className={noPadding ? "" : "px-5 pb-5"}>{children}</div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CHART COMPONENTS — Professional, reusable, consistent
// ═══════════════════════════════════════════════════════════════════════════════

// 1. TIME SERIES AREA — For continuous trends (revenue, collections, salary, bank)
const TimeSeriesArea = ({
  data,
  lines,
  height = 260,
  tooltip = <CurrencyTooltip />,
  axisFormatter = fmt,
}) => {
  if (!data?.length) return null;
  const minW = Math.max(400, data.length * 35);
  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ minWidth: minW }}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
          >
            <defs>
              {lines.map((l) => (
                <linearGradient
                  key={l.key}
                  id={`grad_${l.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={l.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={l.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={axisFormatter}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={tooltip} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            {lines.map((l) => (
              <Area
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.name || l.key}
                stroke={l.color}
                strokeWidth={2}
                fill={`url(#grad_${l.key})`}
                dot={data.length < 16 ? { r: 3, strokeWidth: 0 } : false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
            {data.length > 12 && (
              <Brush
                dataKey="x"
                height={18}
                stroke="#cbd5e1"
                travellerWidth={6}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 2. RANK BAR — Horizontal scrollable bar for rankings (clients, departments, etc.)
const RankBar = ({
  data,
  dataKey,
  nameKey = "name",
  color,
  height = 280,
  formatter = fmt,
  tooltip = <CurrencyTooltip />,
}) => {
  if (!data?.length) return null;
  const barSize = 24;
  const totalH = Math.max(height, data.length * (barSize + 10));
  return (
    <div style={{ height, overflowY: "auto" }} className="pr-1">
      <div style={{ height: totalH }}>
        <ResponsiveContainer width="100%" height={totalH}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 80, left: 4, bottom: 4 }}
            barSize={barSize}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={formatter}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey={nameKey}
              type="category"
              tick={{ fontSize: 10, fill: "#475569" }}
              width={130}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={tooltip} />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey={dataKey}
                position="right"
                formatter={formatter}
                style={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. GROUPED BAR — Horizontal grouped bar for multi-series comparison
const GroupedBar = ({ data, bars, nameKey = "name", height = 280 }) => {
  if (!data?.length) return null;
  const barSize = 14;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
        barSize={barSize}
        barGap={4}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#64748b" }}
          tickFormatter={fmt}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey={nameKey}
          type="category"
          tick={{ fontSize: 10, fill: "#475569" }}
          width={130}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CurrencyTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        {bars.map((b) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.name || b.key}
            fill={b.color}
            radius={[0, 4, 4, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// 4. HORIZONTAL GROUPED BAR — Time series / multi-series comparison (scrollable)
const HScrollBar = ({
  data,
  bars,
  xKey,
  height = 240,
  barWidth = 44,
  axisFormatter = fmt,
  tooltip = <CurrencyTooltip />,
}) => {
  if (!data?.length) return null;
  const minW = Math.max(400, data.length * (bars.length * barWidth + 16));
  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ minWidth: minW }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: "#64748b" }}
              angle={data.length > 8 ? -30 : 0}
              textAnchor={data.length > 8 ? "end" : "middle"}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={axisFormatter}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={tooltip} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            {bars.map((b) => (
              <Bar
                key={b.key}
                dataKey={b.key}
                name={b.name || b.key}
                fill={b.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. STACKED BAR — For part-to-whole composition (statutory, etc.)
const StackedBar = ({ data, bars, xKey, height = 260 }) => {
  if (!data?.length) return null;
  const minW = Math.max(400, data.length * 50);
  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ minWidth: minW }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: "#64748b" }}
              angle={data.length > 10 ? -30 : 0}
              textAnchor={data.length > 10 ? "end" : "middle"}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={fmt}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            {bars.map((b, i) => (
              <Bar
                key={b.key}
                dataKey={b.key}
                name={b.name || b.key}
                stackId="a"
                fill={b.color}
                radius={
                  i === bars.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 6. DONUT CHART — For proportions (status, billable, pay head)
const DonutChart = ({
  data,
  colors = CC,
  height = 240,
  innerRadius = 55,
  outerRadius = 85,
  tooltip = <CurrencyTooltip />,
}) => {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          stroke="none"
          label={({ name, percent }) =>
            percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
          }
          labelLine={false}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={tooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// 7. COMPOSED METRIC — Bar + Line on dual axes (e.g. invoice value + collection %)
const ComposedMetric = ({
  data,
  xKey,
  bars = [],
  lines = [],
  height = 260,
  leftFormatter = fmt,
  rightFormatter = (v) => `${v}%`,
  tooltip = <CurrencyTooltip />,
}) => {
  if (!data?.length) return null;
  const minW = Math.max(400, data.length * 45);
  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ minWidth: minW }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: "#64748b" }}
              angle={data.length > 8 ? -30 : 0}
              textAnchor={data.length > 8 ? "end" : "middle"}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickFormatter={leftFormatter}
              axisLine={false}
              tickLine={false}
            />
            {lines.length > 0 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickFormatter={rightFormatter}
                axisLine={false}
                tickLine={false}
              />
            )}
            <Tooltip content={tooltip} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            {bars.map((b) => (
              <Bar
                key={b.key}
                yAxisId="left"
                dataKey={b.key}
                name={b.name || b.key}
                fill={b.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              />
            ))}
            {lines.map((l) => (
              <Line
                key={l.key}
                yAxisId="right"
                type="monotone"
                dataKey={l.key}
                name={l.name || l.key}
                stroke={l.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 8. DATA TABLE — Reusable, sortable-ready
const DataTable = ({ columns, data, maxHeight = 280 }) => {
  if (!data?.length) return null;
  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`text-left py-2 pr-3 text-slate-400 font-semibold ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
              {columns.map((col, j) => (
                <td
                  key={j}
                  className={`py-2 pr-3 ${col.className || ""} ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                >
                  {col.formatter
                    ? col.formatter(row[col.key], row, i)
                    : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SH = ({ icon: Icon, title, color, count }) => (
  <div className="flex items-center gap-2.5 mb-4 mt-2">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: color + "18" }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
      {title}
    </h2>
    {count !== undefined && (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
        {count}
      </span>
    )}
    <div className="flex-1 h-px bg-slate-100" />
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const Empty = ({ msg = "No data for selected filters", icon: Icon = BarChart2 }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
    <Icon className="w-8 h-8 mb-2 opacity-50" />
    <p className="text-xs font-medium">{msg}</p>
  </div>
);

// ─── Filter Select ────────────────────────────────────────────────────────────
const FS = ({ label, value, onChange, options, placeholder = "All" }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value || o} value={o.value || o}>
            {o.label || o}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

// ─── FY Selector ──────────────────────────────────────────────────────────────
const FYSelector = ({
  startYear,
  onChange,
  minYear = 2015,
  maxYear = currentFYStartYear() + 1,
}) => {
  const { label } = fyRange(startYear);
  return (
    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-1">
      <button
        onClick={() => onChange(Math.max(minYear, startYear - 1))}
        disabled={startYear <= minYear}
        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs font-bold text-slate-700 px-2 tracking-wide whitespace-nowrap">
        {label}
      </span>
      <button
        onClick={() => onChange(Math.min(maxYear, startYear + 1))}
        disabled={startYear >= maxYear}
        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Expand Modal ─────────────────────────────────────────────────────────────
const Modal = ({ title, subtitle, children, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
    <div
      className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-auto p-6 flex-1">{children}</div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsDashboard() {
  const [invoices, setSI] = useState([]);
  const [payments, setSP] = useState([]);
  const [osPayouts, setSO] = useState([]);
  const [creditNotes, setSC] = useState([]);
  const [salaries, setSS] = useState([]);
  const [team, setTeam] = useState([]);
  const [bankEntries, setBE] = useState([]);
  const [softwareEntries, setSE2] = useState([]);
  const [clients, setCl] = useState([]);
  const [departments, setDm] = useState([]);
  const [entities, setEn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLF] = useState(null);
  const [modal, setModal] = useState(null);

  const [rpcKpi, setRpcKpi] = useState(null);
  const [rpcProfit, setRpcProfit] = useState([]);
  const [rpcDeptRev, setRpcDeptRev] = useState([]);
  const [rpcClientPL, setRpcClientPL] = useState([]);
  const [rpcAging, setRpcAging] = useState([]);
  const [rpcFunnel, setRpcFunnel] = useState([]);
  const [rpcOsMonth, setRpcOsMonth] = useState([]);
  const [rpcBankWeekly, setRpcBankWeekly] = useState([]);
  const [rpcBankSource, setRpcBankSource] = useState([]);
  const [rpcStatutory, setRpcStatutory] = useState([]);
  const [rpcHeadEcon, setRpcHeadEcon] = useState([]);
  const [rpcInvHealth, setRpcInvHealth] = useState([]);
  const [rpcTopEarners, setRpcTopEarners] = useState([]);
  const [rpcCnSummary, setRpcCnSummary] = useState([]);
  const [rpcPayTrend, setRpcPayTrend] = useState([]);
  
  // ══ NEW: 4 Advanced Analytics RPCs ══
  const [rpcCashflowProj, setRpcCashflowProj] = useState([]);
  const [rpcPaymentsMade, setRpcPaymentsMade] = useState([]);
  const [rpcCollectionDelay, setRpcCollectionDelay] = useState([]);
  const [rpcBounceback, setRpcBounceback] = useState([]);

  const [fyStartYear, setFyStartYear] = useState(currentFYStartYear());
  const fy = useMemo(() => fyRange(fyStartYear), [fyStartYear]);

  const [topNClient, setTopNClient] = useState(10);
  const [topNInvoice, setTopNInvoice] = useState(10);
  const [topNDept, setTopNDept] = useState(999);
  const [topNTeam, setTopNTeam] = useState(999);
  const [topNSalary, setTopNSalary] = useState(999);

  const [filters, setFilters] = useState({
    dateFrom: "", dateTo: "", impactMonth: "", department: "", client: "",
    entity: "", invoiceNumber: "", status: "", payHead: "", employee: "",
  });
  const [filtersOpen, setFO] = useState(true);
  const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const clearF = () => setFilters({ dateFrom: "", dateTo: "", impactMonth: "", department: "", client: "", entity: "", invoiceNumber: "", status: "", payHead: "", employee: "" });
  const AFC = Object.values(filters).filter(Boolean).length;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: inv }, { data: pay }, { data: os }, { data: cn }, { data: sal }, { data: tm }, { data: be }, { data: se }, { data: cl }, { data: dm }, { data: em }] = await Promise.all([
        supabase.from("invoices").select(`id,invoice_number,invoice_date,impact_month,invoice_value,amount_received,receivable_amount,verto_fee,gst,tds,net_in_hand,gross_value,co_pf,co_esi,lwf_tax,pt_tax,employee_count,pay_head,status,client_id,department_id,entity_id,clients_master!invoices_client_id_fkey(client_name),entity_master!invoices_entity_id_fkey(entity_name)`),
        supabase.from("payments_received").select(`id,amount_received,payment_date,invoice_id,invoices(invoice_number,clients_master!invoices_client_id_fkey(client_name))`),
        supabase.from("os_payouts").select(`id,payout_month,payment_date,amount_paid,employee_count,is_billable,pay_head,client_id,department_id,entity_id,invoice_id,clients_master!os_payouts_client_id_fkey(client_name),entity_master!os_payouts_entity_id_fkey(entity_name),invoices(department_id)`),
        supabase.from("credit_note_bad_debt").select(`id,invoice_id,invoice_number,type,amount,issue_date,pay_cn,verto_fee_cn,gst_cn,tds_cn,er_pf,ee_pf,er_esic,ee_esic,lwf_cn,pt_cn,invoices(department_id,clients_master!invoices_client_id_fkey(client_name))`),
        supabase.from("employee_expense_payouts").select(`id,month_of_pay,date_of_pay,net_payment,pay_head,employee_name,emp_code,department_id,entity_id,departments_master!employee_expense_payouts_department_id_fkey(dept_name),entity_master!employee_expense_payouts_entity_id_fkey(entity_name)`),
        supabase.from("internal_team").select("id,name,emp_code,department,designation,location,ctc,status,doj,entity"),
        supabase.from("bank_entries").select("id,date,amount,flow_type,entry_type,source_table,entity").eq("is_deleted", false).order("date"),
        supabase.from("software_entries").select("id,date,amount,flow_type,source_table").order("date"),
        supabase.from("clients_master").select("id,client_name"),
        supabase.from("departments_master").select("id,dept_name,dept_code"),
        supabase.from("entity_master").select("id,entity_name"),
      ]);
      setSI(inv || []); setSP(pay || []); setSO(os || []); setSC(cn || []); setSS(sal || []); setTeam(tm || []);
      setBE(be || []); setSE2(se || []); setCl(cl || []); setDm(dm || []); setEn(em || []);

      const fyS = `${fyStartYear}-04-01`;
      const fyE = `${fyStartYear + 1}-03-31`;

      const [dKpi, dProfit, dDeptRev, dClientPL, dAging, dFunnel, dOsMonth, dBankWeekly, dBankSource, dStatutory, dHeadEcon, dInvHealth, dTopEarners, dCnSummary, dPayTrend, dCashflowProj, dPaymentsMade, dCollectionDelay, dBounceback] = await Promise.all([
        safeRpc("get_analytics_kpi_summary", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_profit_waterfall", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_dept_revenue", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_client_pl", { p_start: fyS, p_end: fyE, p_dept_id: null, p_limit: 15 }),
        safeRpc("get_analytics_collection_aging", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_collection_funnel", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_os_payout_summary", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_bank_flow_weekly", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_bank_flow_by_source", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_statutory_summary", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_headcount_economics", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_invoice_health", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_top_earners", { p_start: fyS, p_end: fyE, p_limit: 10 }),
        safeRpc("get_analytics_cn_summary", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_payment_trend", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_cashflow_projection_vs_actual", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_payments_made_breakdown", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_collection_delay", { p_start: fyS, p_end: fyE }),
        safeRpc("get_analytics_bounceback_summary", { p_start: fyS, p_end: fyE }),
      ]);

      setRpcKpi(Array.isArray(dKpi) && dKpi.length > 0 ? dKpi[0] : null);
      setRpcProfit(dProfit || []); setRpcDeptRev(dDeptRev || []); setRpcClientPL(dClientPL || []);
      setRpcAging(dAging || []); setRpcFunnel(dFunnel || []); setRpcOsMonth(dOsMonth || []);
      setRpcBankWeekly(dBankWeekly || []); setRpcBankSource(dBankSource || []);
      setRpcStatutory(dStatutory || []); setRpcHeadEcon(dHeadEcon || []);
      setRpcInvHealth(dInvHealth || []); setRpcTopEarners(dTopEarners || []);
      setRpcCnSummary(dCnSummary || []); setRpcPayTrend(dPayTrend || []);
      setRpcCashflowProj(dCashflowProj || []);
      setRpcPaymentsMade(dPaymentsMade || []);
      setRpcCollectionDelay(dCollectionDelay || []);
      setRpcBounceback(dBounceback || []);
      setLF(new Date());
    } catch (e) {
      console.error("Analytics fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [fyStartYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Lookups ────────────────────────────────────────────────────────────────
  const deptById = useMemo(() => { const m = {}; departments.forEach((d) => { m[d.id] = d.dept_name; }); return m; }, [departments]);
  const entityById = useMemo(() => { const m = {}; entities.forEach((e) => { m[e.id] = e.entity_name; }); return m; }, [entities]);
  const empDeptByCode = useMemo(() => { const m = {}; team.forEach((t) => { if (t.emp_code) m[t.emp_code] = TEAM_DEPT_MAP[t.department] || t.department || "Unknown"; }); return m; }, [team]);

  // ── Flatten ────────────────────────────────────────────────────────────────
  const FI = useMemo(() => invoices.map((i) => ({ ...i, client_name: i.clients_master?.client_name || "Unknown", dept_name: deptById[i.department_id] || "Unknown", entity_name: i.entity_master?.entity_name || entityById[i.entity_id] || "Unknown" })), [invoices, deptById, entityById]);
  const FP = useMemo(() => payments.map((p) => ({ ...p, invoice_number: p.invoices?.invoice_number || "", client_name: p.invoices?.clients_master?.client_name || "Unknown" })), [payments]);
  const FO = useMemo(() => osPayouts.map((o) => ({ ...o, client_name: o.clients_master?.client_name || "Unknown", dept_name: deptById[o.department_id] || deptById[o.invoices?.department_id] || "Unknown", entity_name: o.entity_master?.entity_name || entityById[o.entity_id] || "Unknown", effective_month: toYYYYMM(o.payout_month) || toYYYYMM(o.payment_date) })), [osPayouts, deptById, entityById]);
  const FC = useMemo(() => creditNotes.map((cn) => ({ ...cn, client_name: cn.invoices?.clients_master?.client_name || "Unknown", dept_name: deptById[cn.invoices?.department_id] || "Unknown", issue_month: toYYYYMM(cn.issue_date) })), [creditNotes, deptById]);
  const FSal = useMemo(() => salaries.map((s) => ({ ...s, dept_name: s.departments_master?.dept_name || empDeptByCode[s.emp_code] || "Unknown", entity_name: s.entity_master?.entity_name || entityById[s.entity_id] || "Unknown" })), [salaries, empDeptByCode, entityById]);

  // ── Filters applied ──────────────────────────────────────────────────────
  const effFrom = filters.dateFrom || fy.start;
  const effTo = filters.dateTo || fy.end;

  const fI = useMemo(() => FI.filter((i) => {
    if (effFrom && i.invoice_date < effFrom) return false;
    if (effTo && i.invoice_date > effTo) return false;
    if (filters.impactMonth && toYYYYMM(i.invoice_date) !== filters.impactMonth) return false;
    if (filters.department && i.dept_name !== filters.department) return false;
    if (filters.client && i.client_name !== filters.client) return false;
    if (filters.entity && i.entity_name !== filters.entity) return false;
    if (filters.status && i.status?.toLowerCase() !== filters.status?.toLowerCase()) return false;
    if (filters.payHead && i.pay_head !== filters.payHead) return false;
    if (filters.invoiceNumber && !i.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;
    return true;
  }), [FI, filters, effFrom, effTo]);

  const fP = useMemo(() => FP.filter((p) => {
    if (effFrom && p.payment_date < effFrom) return false;
    if (effTo && p.payment_date > effTo) return false;
    if (filters.client && p.client_name !== filters.client) return false;
    if (filters.invoiceNumber && !p.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;
    return true;
  }), [FP, filters, effFrom, effTo]);

  const fO = useMemo(() => FO.filter((o) => {
    if (effFrom && o.payment_date && o.payment_date < effFrom) return false;
    if (effTo && o.payment_date && o.payment_date > effTo) return false;
    if (filters.department && o.dept_name !== filters.department) return false;
    if (filters.client && o.client_name !== filters.client) return false;
    return true;
  }), [FO, filters, effFrom, effTo]);

  const fC = useMemo(() => FC.filter((cn) => {
    if (effFrom && cn.issue_date < effFrom) return false;
    if (effTo && cn.issue_date > effTo) return false;
    if (filters.department && cn.dept_name !== filters.department) return false;
    if (filters.client && cn.client_name !== filters.client) return false;
    if (filters.invoiceNumber && !cn.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) return false;
    return true;
  }), [FC, filters, effFrom, effTo]);

  const fSal = useMemo(() => FSal.filter((s) => {
    if (effFrom && s.date_of_pay && s.date_of_pay < effFrom) return false;
    if (effTo && s.date_of_pay && s.date_of_pay > effTo) return false;
    if (filters.department && s.dept_name !== filters.department) return false;
    if (filters.entity && s.entity_name !== filters.entity) return false;
    if (filters.payHead && s.pay_head !== filters.payHead) return false;
    if (filters.employee && !s.employee_name?.toLowerCase().includes(filters.employee.toLowerCase())) return false;
    return true;
  }), [FSal, filters, effFrom, effTo]);

  const fTeam = useMemo(() => team.filter((t) => {
    const fd = TEAM_DEPT_MAP[t.department] || t.department;
    if (filters.department && fd !== filters.department) return false;
    if (filters.employee && !t.name?.toLowerCase().includes(filters.employee.toLowerCase())) return false;
    return true;
  }), [team, filters]);

  const fBank = useMemo(() => bankEntries.filter((b) => {
    if (effFrom && b.date < effFrom) return false;
    if (effTo && b.date > effTo) return false;
    return true;
  }), [bankEntries, filters, effFrom, effTo]);

  const fSw = useMemo(() => softwareEntries.filter((s) => {
    if (effFrom && s.date < effFrom) return false;
    if (effTo && s.date > effTo) return false;
    return true;
  }), [softwareEntries, filters, effFrom, effTo]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalInv = fI.reduce((s, i) => s + Number(i.invoice_value || 0), 0);
    const totalV = fI.reduce((s, i) => s + Number(i.verto_fee || 0), 0);
    const cnVd = fC.reduce((s, c) => s + Number(c.verto_fee_cn || 0), 0);
    const netV = totalV - cnVd;
    const totalOut = fI.reduce((s, i) => s + Number(i.receivable_amount || 0), 0);
    const totalRcv = fP.reduce((s, p) => s + Number(p.amount_received || 0), 0);
    const totalOS = fO.reduce((s, o) => s + Number(o.amount_paid || 0), 0);
    const totalSal = fSal.reduce((s, e) => s + Number(e.net_payment || 0), 0);
    const totalCN = fC.reduce((s, c) => s + Number(c.amount || 0), 0);
    const activeEmp = fTeam.filter((t) => t.status === "Active").length;
    const colPct = totalInv > 0 ? ((totalRcv / totalInv) * 100).toFixed(1) : "0.0";
    const bIn = fBank.filter(isBankInflow).reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
    const bOut = fBank.filter((b) => !isBankInflow(b)).reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
    return { totalInv, netV, totalOut, totalRcv, totalOS, totalSal, totalCN, activeEmp, colPct, bIn, bOut, bNet: bIn - bOut };
  }, [fI, fP, fO, fC, fSal, fTeam, fBank]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHART DATA
  // ═══════════════════════════════════════════════════════════════════════════════

  // REVENUE: Monthly time series
  const revenueMonthly = useMemo(() => {
    const m = {};
    fI.forEach((i) => {
      const k = toYYYYMM(i.invoice_date);
      if (!k) return;
      if (!m[k]) m[k] = { x: fmtMonth(k), invoiceValue: 0, vertoFee: 0, gst: 0, tds: 0 };
      m[k].invoiceValue += Number(i.invoice_value || 0);
      m[k].vertoFee += Number(i.verto_fee || 0);
      m[k].gst += Number(i.gst || 0);
      m[k].tds += Number(i.tds || 0);
    });
    fC.forEach((cn) => {
      const k = toYYYYMM(cn.issue_date);
      if (!k || !m[k]) return;
      m[k].vertoFee -= Number(cn.verto_fee_cn || 0);
      m[k].gst -= Number(cn.gst_cn || 0);
      m[k].tds -= Number(cn.tds_cn || 0);
    });
    return Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
  }, [fI, fC]);

  // CLIENT REVENUE: Ranking
  const clientRevenue = useMemo(() => {
    const m = {};
    fI.forEach((i) => {
      const c = i.client_name;
      if (!m[c]) m[c] = { name: c, "Invoice Value": 0, "Verto Fee": 0, "Received": 0, "CN Deducted": 0 };
      m[c]["Invoice Value"] += Number(i.invoice_value || 0);
      m[c]["Verto Fee"] += Number(i.verto_fee || 0);
    });
    fP.forEach((p) => {
      const c = p.client_name;
      if (!m[c]) m[c] = { name: c, "Invoice Value": 0, "Verto Fee": 0, "Received": 0, "CN Deducted": 0 };
      m[c]["Received"] += Number(p.amount_received || 0);
    });
    fC.forEach((cn) => {
      const c = cn.client_name;
      if (!m[c]) m[c] = { name: c, "Invoice Value": 0, "Verto Fee": 0, "Received": 0, "CN Deducted": 0 };
      m[c]["CN Deducted"] += Number(cn.amount || 0);
    });
    return Object.values(m).sort((a, b) => b["Invoice Value"] - a["Invoice Value"]);
  }, [fI, fP, fC]);

  const clientRevenueTop = useMemo(
    () => (topNClient === 999 ? clientRevenue : clientRevenue.slice(0, topNClient)),
    [clientRevenue, topNClient]
  );

  // DEPT REVENUE: Ranking
  const deptRevenue = useMemo(() => {
    const m = {};
    fI.forEach((i) => {
      const d = i.dept_name;
      if (!m[d]) m[d] = { name: d, invoiceValue: 0, vertoFee: 0 };
      m[d].invoiceValue += Number(i.invoice_value || 0);
      m[d].vertoFee += Number(i.verto_fee || 0);
    });
    return Object.values(m)
      .sort((a, b) => b.invoiceValue - a.invoiceValue)
      .slice(0, topNDept === 999 ? undefined : topNDept);
  }, [fI, topNDept]);

  // INVOICE STATUS: Proportions
  const invStatusData = useMemo(() => {
    const m = {};
    fI.forEach((i) => {
      const s = i.status || "Unknown";
      m[s] = (m[s] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [fI]);

  // PAY HEAD: Proportions (top 5 + others)
  const payHeadData = useMemo(() => {
    const m = {};
    fI.forEach((i) => {
      const ph = i.pay_head || "Other";
      m[ph] = (m[ph] || 0) + Number(i.invoice_value || 0);
    });
    const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const result = [];
    let others = 0;
    entries.forEach(([name, value], i) => {
      if (i < 5 && value / total > 0.02) result.push({ name, value });
      else others += value;
    });
    if (others > 0) result.push({ name: "Others", value: others });
    return result;
  }, [fI]);

  // COLLECTION: Composed chart data
  const collectionData = useMemo(() => {
    const rcvByInv = {};
    fP.forEach((p) => {
      if (p.invoice_number)
        rcvByInv[p.invoice_number] = (rcvByInv[p.invoice_number] || 0) + Number(p.amount_received || 0);
    });
    return fI
      .map((i) => {
        const rcv = rcvByInv[i.invoice_number] ?? Number(i.amount_received || 0);
        const pct = Number(i.invoice_value) > 0
          ? Math.min(100, Math.round((rcv / Number(i.invoice_value)) * 100))
          : 0;
        return {
          x: i.invoice_number,
          "Invoice Value": Number(i.invoice_value || 0),
          "Received": rcv,
          "Collection %": pct,
        };
      })
      .sort((a, b) => b["Invoice Value"] - a["Invoice Value"]);
  }, [fI, fP]);

  const collectionTop = useMemo(
    () => (topNInvoice === 999 ? collectionData : collectionData.slice(0, topNInvoice)),
    [collectionData, topNInvoice]
  );

  // OUTSTANDING: Ranking
  const outstandingData = useMemo(() => {
    const m = {};
    fI.forEach((i) => {
      const o = Number(i.receivable_amount || 0);
      if (o > 0) m[i.client_name] = (m[i.client_name] || 0) + o;
    });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [fI]);

  // PAYMENTS TREND: Time series
  const paymentsTrend = useMemo(() => {
    const m = {};
    fP.forEach((p) => {
      const d = p.payment_date;
      if (!d) return;
      if (!m[d]) m[d] = { x: fmtDate(d), received: 0 };
      m[d].received += Number(p.amount_received || 0);
    });
    return Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
  }, [fP]);

  // CREDIT NOTES: Monthly time series
  const cnMonthly = useMemo(() => {
    const m = {};
    fC.forEach((cn) => {
      const k = toYYYYMM(cn.issue_date);
      if (!k) return;
      if (!m[k]) m[k] = { x: fmtMonth(k), total: 0, vertoFee: 0, gst: 0 };
      m[k].total += Number(cn.amount || 0);
      m[k].vertoFee += Number(cn.verto_fee_cn || 0);
      m[k].gst += Number(cn.gst_cn || 0);
    });
    return Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
  }, [fC]);

  // CN BY CLIENT: Ranking
  const cnByClient = useMemo(() => {
    const m = {};
    fC.forEach((cn) => {
      const c = cn.client_name;
      if (!m[c]) m[c] = { name: c, value: 0 };
      m[c].value += Number(cn.amount || 0);
    });
    return Object.values(m).sort((a, b) => b.value - a.value);
  }, [fC]);

  // OS PAYOUTS: Monthly time series
  const osMonthly = useMemo(() => {
    const m = {};
    fO.forEach((o) => {
      const k = o.effective_month;
      if (!k) return;
      if (!m[k]) m[k] = { x: fmtMonth(k), amountPaid: 0, employeeCount: 0 };
      m[k].amountPaid += Number(o.amount_paid || 0);
      m[k].employeeCount += Number(o.employee_count || 0);
    });
    return Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
  }, [fO]);

  // OS BY CLIENT: Ranking
  const osByClient = useMemo(() => {
    const m = {};
    fO.forEach((o) => {
      const c = o.client_name;
      if (!m[c]) m[c] = { name: c, amountPaid: 0, employeeCount: 0 };
      m[c].amountPaid += Number(o.amount_paid || 0);
      m[c].employeeCount += Number(o.employee_count || 0);
    });
    return Object.values(m).sort((a, b) => b.amountPaid - a.amountPaid);
  }, [fO]);

  // OS BILLABLE: Proportions
  const osBillableData = useMemo(() => {
    let b = 0, nb = 0;
    fO.forEach((o) => {
      if (o.is_billable) b += Number(o.amount_paid || 0);
      else nb += Number(o.amount_paid || 0);
    });
    return [{ name: "Billable", value: b }, { name: "Non-Billable", value: nb }].filter((d) => d.value > 0);
  }, [fO]);

  // SALARY: Monthly time series
  const salaryMonthly = useMemo(() => {
    const m = {};
    fSal.forEach((s) => {
      const k = toYYYYMM(s.date_of_pay) || toYYYYMM(s.month_of_pay);
      if (!k) return;
      if (!m[k]) m[k] = { x: fmtMonth(k), salary: 0, count: 0 };
      m[k].salary += Number(s.net_payment || 0);
      m[k].count += 1;
    });
    return Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
  }, [fSal]);

  // SALARY BY DEPT: Ranking
  const salaryByDept = useMemo(() => {
    const m = {};
    fSal.forEach((s) => {
      const d = s.dept_name;
      if (!m[d]) m[d] = { name: d, salary: 0, count: 0 };
      m[d].salary += Number(s.net_payment || 0);
      m[d].count += 1;
    });
    return Object.values(m).sort((a, b) => b.salary - a.salary).slice(0, topNSalary === 999 ? undefined : topNSalary);
  }, [fSal, topNSalary]);

  // SALARY PAY HEAD: Proportions (top 5 + others)
  const salaryPayHeadData = useMemo(() => {
    const m = {};
    fSal.forEach((s) => {
      const ph = s.pay_head || "Other";
      m[ph] = (m[ph] || 0) + Number(s.net_payment || 0);
    });
    const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const result = [];
    let others = 0;
    entries.forEach(([name, value], i) => {
      if (i < 5 && value / total > 0.02) result.push({ name, value });
      else others += value;
    });
    if (others > 0) result.push({ name: "Others", value: others });
    return result;
  }, [fSal]);

  // TEAM: Department stats
  const teamByDept = useMemo(() => {
    const m = {};
    fTeam.forEach((t) => {
      const d = TEAM_DEPT_MAP[t.department] || t.department || "Unknown";
      if (!m[d]) m[d] = { name: d, count: 0, ctc: 0, active: 0 };
      m[d].count += 1;
      m[d].ctc += Number(t.ctc || 0);
      if (t.status === "Active") m[d].active += 1;
    });
    return Object.values(m).sort((a, b) => b.count - a.count).slice(0, topNTeam === 999 ? undefined : topNTeam);
  }, [fTeam, topNTeam]);

  // TEAM STATUS: Proportions
  const teamStatusData = useMemo(() => {
    const m = {};
    fTeam.forEach((t) => {
      const s = t.status || "Unknown";
      m[s] = (m[s] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [fTeam]);

  // DESIGNATIONS: Ranking
  const designations = useMemo(() => {
    const m = {};
    fTeam.forEach((t) => {
      if (!t.designation) return;
      m[t.designation] = (m[t.designation] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));
  }, [fTeam]);

  // LOCATIONS: Ranking
  const locationDist = useMemo(() => {
    const m = {};
    fTeam.forEach((t) => {
      if (!t.location) return;
      m[t.location] = (m[t.location] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));
  }, [fTeam]);

  // CTC HISTOGRAM
  const ctcHist = useMemo(() => {
    const buckets = [
      { l: "< 20K", min: 0, max: 20000 },
      { l: "20–30K", min: 20000, max: 30000 },
      { l: "30–50K", min: 30000, max: 50000 },
      { l: "50–75K", min: 50000, max: 75000 },
      { l: "75K+", min: 75000, max: Infinity },
    ];
    return buckets.map((b) => ({ range: b.l, count: fTeam.filter((t) => { const c = Number(t.ctc || 0); return c >= b.min && c < b.max; }).length }));
  }, [fTeam]);

  // BANK FLOW: Time series
  const bankFlow = useMemo(() => {
    const m = {};
    fBank.forEach((b) => {
      const d = b.date;
      if (!d) return;
      if (!m[d]) m[d] = { x: fmtDate(d), Inflow: 0, Outflow: 0 };
      const amt = Math.abs(Number(b.amount || 0));
      if (isBankInflow(b)) m[d].Inflow += amt;
      else m[d].Outflow += amt;
    });
    return Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
  }, [fBank]);

  // SOFTWARE FLOW: Time series
  const swFlow = useMemo(() => {
    const m = {};
    fSw.forEach((s) => {
      const d = s.date;
      if (!d) return;
      if (!m[d]) m[d] = { x: fmtDate(d), Inflow: 0, Outflow: 0 };
      const amt = Math.abs(Number(s.amount || 0));
      if (isSoftwareInflow(s)) m[d].Inflow += amt;
      else m[d].Outflow += amt;
    });
    return Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
  }, [fSw]);

  // CASH BY SOURCE: Grouped bar
  const cashBySource = useMemo(() => {
    const SL = { payments_received: "Payment In", os_payouts: "OS Payout", employee_expense_payouts: "Salary", statutory_payments: "Statutory" };
    const m = {};
    [...fBank].forEach((b) => {
      const src = SL[b.source_table] || b.source_table || "Other";
      if (!m[src]) m[src] = { name: src, Inflow: 0, Outflow: 0 };
      const amt = Math.abs(Number(b.amount || 0));
      if (isBankInflow(b)) m[src].Inflow += amt;
      else m[src].Outflow += amt;
    });
    [...fSw].forEach((s) => {
      const src = SL[s.source_table] || s.source_table || "Software";
      if (!m[src]) m[src] = { name: src, Inflow: 0, Outflow: 0 };
      const amt = Math.abs(Number(s.amount || 0));
      if (isSoftwareInflow(s)) m[src].Inflow += amt;
      else m[src].Outflow += amt;
    });
    return Object.values(m).filter((d) => d.Inflow > 0 || d.Outflow > 0);
  }, [fBank, fSw]);

  // STATUTORY: Stacked bar per invoice
  const statByInv = useMemo(() =>
    fI.filter((i) => Number(i.co_pf || 0) + Number(i.co_esi || 0) + Number(i.lwf_tax || 0) + Number(i.pt_tax || 0) > 0)
      .map((i) => ({ x: i.invoice_number, "Co. PF": Number(i.co_pf || 0), "Co. ESI": Number(i.co_esi || 0), "LWF": Number(i.lwf_tax || 0), "PT": Number(i.pt_tax || 0) })),
    [fI]
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEW ADVANCED COMPUTED DATA
  // ═══════════════════════════════════════════════════════════════════════════════

  // ── 15. CASHFLOW: Net position & variance ────────────────────────────────────
  const cashflowKpis = useMemo(() => {
    if (!rpcCashflowProj.length) return null;
    const totalProjIn = rpcCashflowProj.reduce((s, r) => s + Number(r.projected_inflow || 0), 0);
    const totalProjOut = rpcCashflowProj.reduce((s, r) => s + Number(r.projected_outflow || 0), 0);
    const totalActIn = rpcCashflowProj.reduce((s, r) => s + Number(r.actual_inflow || 0), 0);
    const totalActOut = rpcCashflowProj.reduce((s, r) => s + Number(r.actual_outflow || 0), 0);
    const netProj = totalProjIn - totalProjOut;
    const netAct = totalActIn - totalActOut;
    const inflowVariance = totalProjIn > 0 ? ((totalActIn - totalProjIn) / totalProjIn * 100) : 0;
    const outflowVariance = totalProjOut > 0 ? ((totalActOut - totalProjOut) / totalProjOut * 100) : 0;
    return {
      totalProjIn, totalProjOut, totalActIn, totalActOut,
      netProj, netAct, inflowVariance, outflowVariance,
      varianceColor: netAct >= netProj ? P.teal : P.brick,
      varianceIcon: netAct >= netProj ? ArrowUpRight : ArrowDownRight,
    };
  }, [rpcCashflowProj]);

  // ── 16. PAYMENTS MADE: by pay_head & department ──────────────────────────────
  const paymentsMadeByHead = useMemo(() => {
    const m = {};
    rpcPaymentsMade.forEach(r => {
      const ph = r.pay_head || 'Other';
      m[ph] = (m[ph] || 0) + Number(r.total_amount || 0);
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [rpcPaymentsMade]);

  const paymentsMadeByDept = useMemo(() => {
    const m = {};
    rpcPaymentsMade.forEach(r => {
      const d = r.department || 'Other';
      m[d] = (m[d] || 0) + Number(r.total_amount || 0);
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [rpcPaymentsMade]);

  const paymentsMadeKpis = useMemo(() => {
    if (!rpcPaymentsMade.length) return null;
    const total = rpcPaymentsMade.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const entries = rpcPaymentsMade.reduce((s, r) => s + Number(r.entry_count || 0), 0);
    const topHead = paymentsMadeByHead[0]?.name || '-';
    const topHeadAmt = paymentsMadeByHead[0]?.value || 0;
    return { total, entries, topHead, topHeadPct: total > 0 ? (topHeadAmt / total * 100) : 0 };
  }, [rpcPaymentsMade, paymentsMadeByHead]);

  // ── 17. COLLECTION DELAY: buckets & risk metrics ─────────────────────────────
  const delayBuckets = useMemo(() => {
    const ORDER = ['Paid','Not Yet Due','No Due Date','Overdue 1–15d','Overdue 16–30d','Overdue 31–60d','Overdue 60d+'];
    const m = {};
    rpcCollectionDelay.forEach(r => {
      const b = r.delay_bucket || 'Unknown';
      if (!m[b]) m[b] = { bucket: b, count: 0, outstanding: 0 };
      m[b].count += 1;
      m[b].outstanding += Number(r.receivable_amount || 0);
    });
    return ORDER.filter(k => m[k]).map(k => m[k]);
  }, [rpcCollectionDelay]);

  const collectionDelayKpis = useMemo(() => {
    if (!rpcCollectionDelay.length) return null;
    const totalOutstanding = rpcCollectionDelay.reduce((s, r) => s + Number(r.receivable_amount || 0), 0);
    const overdue = rpcCollectionDelay.filter(r => r.delay_bucket && r.delay_bucket.includes('Overdue'));
    const overdueAmt = overdue.reduce((s, r) => s + Number(r.receivable_amount || 0), 0);
    const overdueCount = overdue.length;
    const overduePct = rpcCollectionDelay.length > 0 ? (overdueCount / rpcCollectionDelay.length * 100) : 0;
    const critical = rpcCollectionDelay.filter(r => r.delay_bucket === 'Overdue 60d+');
    const criticalAmt = critical.reduce((s, r) => s + Number(r.receivable_amount || 0), 0);
    return { totalOutstanding, overdueAmt, overdueCount, overduePct, criticalAmt, criticalCount: critical.length };
  }, [rpcCollectionDelay]);

  // ── 18. BOUNCEBACK: summary metrics ──────────────────────────────────────────
  const bouncebackKpis = useMemo(() => {
    if (!rpcBounceback.length) return null;
    const totalBounced = rpcBounceback.reduce((s, r) => s + Number(r.bounce_amount || 0), 0);
    const totalInvoiceVal = rpcBounceback.reduce((s, r) => s + Number(r.invoice_value || 0), 0);
    const uniqueClients = [...new Set(rpcBounceback.map(r => r.client_name))].length;
    const uniqueInvoices = [...new Set(rpcBounceback.map(r => r.invoice_number))].length;
    const bounceRate = totalInvoiceVal > 0 ? (totalBounced / totalInvoiceVal * 100) : 0;
    return { totalBounced, totalInvoiceVal, uniqueClients, uniqueInvoices, bounceRate };
  }, [rpcBounceback]);

  // Filter options
  const clientOpts = clients.map((c) => ({ value: c.client_name, label: c.client_name }));
  const entityOpts = entities.map((e) => ({ value: e.entity_name, label: e.entity_name }));
  const deptOpts = departments.map((d) => ({ value: d.dept_name, label: d.dept_name }));
  const statusOpts = [...new Set(invoices.map((i) => i.status).filter(Boolean))].map((s) => ({ value: s, label: s }));
  const payHOpts = [...new Set([...invoices.map((i) => i.pay_head), ...salaries.map((s) => s.pay_head)].filter(Boolean))].map((p) => ({ value: p, label: p }));
  const impMonthOpts = [...new Set(invoices.map((i) => toYYYYMM(i.invoice_date)).filter(Boolean))].sort().reverse().map((m) => ({ value: m, label: fmtMonth(m) }));
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center animate-pulse">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Loading analytics...</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-10">
      {modal && <Modal title={modal.title} subtitle={modal.subtitle} onClose={() => setModal(null)}>{modal.content}</Modal>}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live · Supabase{lastFetched && ` · ${lastFetched.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
            {AFC > 0 && <span className="ml-2 text-slate-500 font-semibold">{AFC} filter{AFC > 1 ? "s" : ""} active</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FYSelector startYear={fyStartYear} onChange={setFyStartYear} />
          <button onClick={() => setFO((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${filtersOpen ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            {AFC > 0 && <span className="w-4 h-4 rounded-full bg-white text-slate-700 text-[10px] font-black flex items-center justify-center">{AFC}</span>}
          </button>
          <button onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      {filtersOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filters
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">Date range defaults to <span className="font-semibold text-slate-600">{fy.label}</span> unless overridden</span>
              {AFC > 0 && (
                <button onClick={clearF} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-semibold">
                  <X className="w-3 h-3" /> Clear all ({AFC})
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setF("dateFrom", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date To</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setF("dateTo", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400" />
            </div>
            <FS label="Invoice Month" value={filters.impactMonth} onChange={(v) => setF("impactMonth", v)} options={impMonthOpts} />
            <FS label="Department" value={filters.department} onChange={(v) => setF("department", v)} options={deptOpts} />
            <FS label="Client" value={filters.client} onChange={(v) => setF("client", v)} options={clientOpts} />
            <FS label="Entity" value={filters.entity} onChange={(v) => setF("entity", v)} options={entityOpts} />
            <FS label="Invoice Status" value={filters.status} onChange={(v) => setF("status", v)} options={statusOpts} />
            <FS label="Pay Head" value={filters.payHead} onChange={(v) => setF("payHead", v)} options={payHOpts} />
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice #</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                <input type="text" value={filters.invoiceNumber} onChange={(e) => setF("invoiceNumber", e.target.value)} placeholder="Search..." className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                <input type="text" value={filters.employee} onChange={(e) => setF("employee", e.target.value)} placeholder="Search..." className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Invoice Value" value={fmt(kpis.totalInv)} sub={`${fI.length} invoices`} icon={FileText} color={P.steel} />
        <KpiCard label="Net Verto Fee" value={fmt(kpis.netV)} sub="After CN deductions" icon={TrendingUp} color={P.trend} />
        <KpiCard label="Total Collected" value={fmt(kpis.totalRcv)} sub={`${kpis.colPct}% collection rate`} icon={DollarSign} color={P.teal} />
        <KpiCard label="Outstanding" value={fmt(kpis.totalOut)} sub={outstandingData.length > 0 ? `${outstandingData.length} clients pending` : "All cleared ✓"} icon={Activity} color={kpis.totalOut > 0 ? P.amber : P.teal} alert={kpis.totalOut > 0} />
        <KpiCard label="Credit Notes Total" value={fmt(kpis.totalCN)} sub={`${fC.length} CN entries`} icon={FileX} color={P.brick} />
        <KpiCard label="OS Payout" value={fmt(kpis.totalOS)} sub={`${fO.length} payouts`} icon={Wallet} color={P.clay} />
        <KpiCard label="Salary Paid" value={fmt(kpis.totalSal)} sub={`${fSal.length} entries`} icon={CreditCard} color={P.plum} />
        <KpiCard label="Active Employees" value={kpis.activeEmp} sub="Internal team" icon={Users} color={P.slate} />
      </div>

      {/* ══ SECTION 1: REVENUE ══ */}
      <SH icon={TrendingUp} title="Revenue & Invoicing" color={P.steel} count={`${fI.length} invoices`} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue Trend — AREA CHART */}
        <ChartCard title="Revenue Trend by Month" subtitle="Invoice value vs Verto fee over time" className="lg:col-span-2">
          {revenueMonthly.length === 0 ? <Empty /> : (
            <TimeSeriesArea data={revenueMonthly} lines={[
              { key: "invoiceValue", name: "Invoice Value", color: P.steel },
              { key: "vertoFee", name: "Net Verto Fee", color: P.trend },
            ]} height={280} />
          )}
        </ChartCard>

        {/* Revenue by Client — RANK BAR */}
        <ChartCard title="Revenue by Client" subtitle={`${clientRevenue.length} clients total`}
          topN={topNClient} onTopN={setTopNClient} topNOptions={[5, 10, 20, 999]}
          expandable onExpand={() => setModal({
            title: "Revenue by Client — All Clients", subtitle: `${clientRevenue.length} clients`,
            content: <RankBar data={clientRevenue} dataKey="Invoice Value" nameKey="name" color={P.steel} height={Math.min(600, clientRevenue.length * 34 + 20)} />
          })}>
          {clientRevenueTop.length === 0 ? <Empty /> : (
            <RankBar data={clientRevenueTop} dataKey="Invoice Value" nameKey="name" color={P.steel} height={Math.min(360, clientRevenueTop.length * 34 + 20)} />
          )}
        </ChartCard>

        {/* Revenue by Department — RANK BAR */}
        <ChartCard title="Revenue by Department" subtitle="Invoice value per department">
          {deptRevenue.length === 0 ? <Empty /> : (
            <RankBar data={deptRevenue} dataKey="invoiceValue" nameKey="name" color={P.steel} height={Math.min(320, deptRevenue.length * 34 + 20)} />
          )}
        </ChartCard>

        {/* Invoice Status — DONUT */}
        <ChartCard title="Invoice Status" subtitle="Distribution by status">
          {invStatusData.length === 0 ? <Empty /> : <DonutChart data={invStatusData} height={240} innerRadius={60} outerRadius={90} />}
        </ChartCard>

        {/* Pay Head — DONUT (top 5 + others) */}
        <ChartCard title="Pay Head Distribution" subtitle="Invoice value by pay head">
          {payHeadData.length === 0 ? <Empty /> : <DonutChart data={payHeadData} height={240} innerRadius={60} outerRadius={90} />}
        </ChartCard>
      </div>

      {/* GST & TDS — GROUPED BAR */}
      {revenueMonthly.length > 0 && (
        <ChartCard title="GST & TDS by Month" subtitle="Net after credit note adjustments" className="lg:col-span-2">
          <HScrollBar data={revenueMonthly} xKey="x" barWidth={40} bars={[
            { key: "gst", name: "Net GST", color: P.amber },
            { key: "tds", name: "Net TDS", color: P.brick },
          ]} height={220} />
        </ChartCard>
      )}

      {/* Invoice Value vs Gross vs Net-in-Hand */}
      {fI.length > 0 && (
        <ChartCard title="Invoice Value vs Gross vs Net-in-Hand" subtitle={`${fI.length} invoices · scroll horizontally`} scrollable minScrollWidth={Math.max(500, fI.length * 120)}>
          <HScrollBar
            data={fI.map((i) => ({ x: i.invoice_number, "Invoice Value": Number(i.invoice_value || 0), "Gross Value": Number(i.gross_value || 0), "Net in Hand": Number(i.net_in_hand || 0) }))}
            xKey="x"
            barWidth={36}
            bars={[
              { key: "Invoice Value", color: P.steel },
              { key: "Gross Value", color: seqColor(1, 2, P.steel, P.teal) },
              { key: "Net in Hand", color: P.teal },
            ]}
            height={240}
          />
        </ChartCard>
      )}

      {/* ══ SECTION 2: CREDIT NOTES ══ */}
      {(fC.length > 0 || creditNotes.length > 0) && (
        <>
          <SH icon={FileX} title="Credit Notes & Bad Debt" color={P.brick} count={`${fC.length} entries`} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Credit Notes by Month" subtitle="Total credit note value raised">
              {cnMonthly.length === 0 ? <Empty msg="No credit notes in selected range" /> : (
                <TimeSeriesArea data={cnMonthly} lines={[
                  { key: "total", name: "Total CN", color: P.brick },
                  { key: "vertoFee", name: "Verto Fee CN", color: P.amber },
                ]} height={240} />
              )}
            </ChartCard>
            <ChartCard title="CN by Client" subtitle="Credit note impact per client">
              {cnByClient.length === 0 ? <Empty msg="No credit notes in selected range" /> : (
                <RankBar data={cnByClient} dataKey="value" nameKey="name" color={P.brick} height={Math.min(280, cnByClient.length * 34 + 20)} />
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 3: COLLECTIONS ══ */}
      <SH icon={DollarSign} title="Collections" color={P.teal} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Invoice vs Collected — COMPOSED CHART (Bar + Line %) */}
        <ChartCard title="Invoice vs Collected" subtitle={`${collectionData.length} invoices`}
          topN={topNInvoice} onTopN={setTopNInvoice} topNOptions={[5, 10, 20, 999]}>
          {collectionTop.length === 0 ? <Empty /> : (
            <ComposedMetric data={collectionTop} xKey="x"
              bars={[{ key: "Invoice Value", color: P.steel, name: "Invoice Value" }, { key: "Received", color: P.teal, name: "Received" }]}
              lines={[{ key: "Collection %", color: P.sky, name: "Collection %" }]} height={260} />
          )}
        </ChartCard>

        {/* Outstanding by Client — RANK BAR */}
        <ChartCard title="Outstanding by Client" subtitle="Remaining receivable" expandable
          onExpand={() => setModal({
            title: "Outstanding by Client", subtitle: `${outstandingData.length} clients`,
            content: <RankBar data={outstandingData} dataKey="value" nameKey="name" color={P.amber} height={Math.min(700, outstandingData.length * 34 + 20)} />
          })}>
          {outstandingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-emerald-500">
              <DollarSign className="w-8 h-8 mb-2" />
              <p className="text-xs font-semibold">No outstanding amounts</p>
            </div>
          ) : (
            <RankBar data={outstandingData} dataKey="value" nameKey="name" color={P.amber} height={Math.min(280, outstandingData.length * 34 + 20)} />
          )}
        </ChartCard>

        {/* Payments Trend — AREA CHART */}
        <ChartCard title="Payments Received Trend" subtitle="Daily collection amounts">
          {paymentsTrend.length === 0 ? <Empty /> : (
            <TimeSeriesArea data={paymentsTrend} lines={[{ key: "received", name: "Received", color: P.teal }]} height={260} />
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 4: OS PAYOUTS ══ */}
      <SH icon={Wallet} title="OS Payouts" color={P.clay} count={`${fO.length} payouts`} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="OS Payout by Month" subtitle="Amount paid per month">
          {osMonthly.length === 0 ? <Empty msg="No OS payout data" /> : (
            <TimeSeriesArea data={osMonthly} lines={[
              { key: "amountPaid", name: "Amount Paid", color: P.clay },
              { key: "employeeCount", name: "Employee Count", color: P.slate },
            ]} height={260} />
          )}
        </ChartCard>

        <ChartCard title="OS Payout by Client" subtitle={`${osByClient.length} clients`}>
          {osByClient.length === 0 ? <Empty /> : (
            <RankBar data={osByClient} dataKey="amountPaid" nameKey="name" color={P.clay} height={Math.min(320, osByClient.length * 34 + 20)} />
          )}
        </ChartCard>

        <ChartCard title="Billable vs Non-Billable" subtitle="OS payout split">
          {osBillableData.length === 0 ? <Empty /> : <DonutChart data={osBillableData} colors={[P.clay, P.slate]} height={240} innerRadius={55} outerRadius={85} />}
        </ChartCard>
      </div>

      {/* ══ SECTION 5: SALARY ══ */}
      <SH icon={CreditCard} title="Internal Salary" color={P.plum} count={`${fSal.length} entries`} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Salary Paid by Month" subtitle="Net salary outflow trend">
          {salaryMonthly.length === 0 ? <Empty /> : (
            <TimeSeriesArea data={salaryMonthly} lines={[
              { key: "salary", name: "Net Salary", color: P.plum },
              { key: "count", name: "Employee Count", color: P.slate },
            ]} height={260} />
          )}
        </ChartCard>

        <ChartCard title="Salary by Department" subtitle="Falls back to internal_team dept via emp_code"
          topN={topNSalary} onTopN={setTopNSalary} topNOptions={[5, 10, 999]}>
          {salaryByDept.length === 0 ? <Empty /> : (
            <RankBar data={salaryByDept} dataKey="salary" nameKey="name" color={P.plum} height={Math.min(280, salaryByDept.length * 34 + 20)} />
          )}
        </ChartCard>

        <ChartCard title="Salary Pay Head Split" subtitle="Distribution by pay head">
          {salaryPayHeadData.length === 0 ? <Empty /> : <DonutChart data={salaryPayHeadData} height={240} innerRadius={55} outerRadius={85} />}
        </ChartCard>

        <ChartCard title="Top Earners (This Period)" subtitle="By net payment across filtered salary entries">
          {fSal.length === 0 ? <Empty /> : (
            <DataTable
              columns={[
                { header: "Employee", key: "employee_name", className: "font-medium text-slate-800 truncate max-w-[130px]" },
                { header: "Dept", key: "dept_name", className: "text-slate-500 truncate" },
                { header: "Net Pay", key: "net_payment", align: "right", formatter: (v) => <span className="font-semibold text-slate-800">{fmt(v)}</span> },
              ]}
              data={[...fSal].sort((a, b) => Number(b.net_payment || 0) - Number(a.net_payment || 0)).slice(0, 10)}
              maxHeight={260}
            />
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 6: INTERNAL TEAM ══ */}
      <SH icon={Users} title="Internal Team" color={P.slate} count={`${fTeam.length} employees`} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Headcount by Department" subtitle="Active vs total per department">
          {teamByDept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.min(280, teamByDept.length * 52 + 20)}>
              <BarChart data={teamByDept} layout="vertical" margin={{ top: 4, right: 50, left: 4, bottom: 4 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#475569" }} width={120} axisLine={false} tickLine={false} />
                <Tooltip content={<CountTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Bar dataKey="active" name="Active" fill={P.teal} radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="count" name="Total" fill={P.slate} fillOpacity={0.3} radius={[0, 4, 4, 0]} stackId="a">
                  <LabelList dataKey="count" position="right" style={{ fontSize: 9, fill: P.slate }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Total CTC by Department" subtitle="Monthly salary burden">
          {teamByDept.length === 0 ? <Empty /> : (
            <RankBar data={teamByDept} dataKey="ctc" nameKey="name" color={P.plum} height={Math.min(280, teamByDept.length * 34 + 20)} />
          )}
        </ChartCard>

        <ChartCard title="Employee Status" subtitle="Active vs inactive breakdown">
          {teamStatusData.length === 0 ? <Empty /> : (
            <DonutChart data={teamStatusData} colors={[P.teal, P.brick]} height={240} innerRadius={55} outerRadius={85} />
          )}
        </ChartCard>

        <ChartCard title="CTC Range Distribution" subtitle="Salary bands across team">
          {ctcHist.every((d) => d.count === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ctcHist} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                  {ctcHist.map((_, i) => (
                    <Cell key={i} fill={seqColor(i, ctcHist.length, P.plumLight, P.plum)} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#475569" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Designation Distribution" subtitle={`${designations.length} unique designations`} expandable
          onExpand={() => setModal({
            title: "All Designations", subtitle: `${designations.length} designations`,
            content: <RankBar data={designations} dataKey="count" nameKey="name" color={P.slate} height={Math.min(700, designations.length * 34 + 20)} formatter={(v) => Number(v || 0).toLocaleString("en-IN")} tooltip={<CountTooltip />} />
          })}>
          {designations.length === 0 ? <Empty /> : (
            <RankBar data={designations.slice(0, 10)} dataKey="count" nameKey="name" color={P.slate} height={Math.min(280, Math.min(10, designations.length) * 34 + 20)} formatter={(v) => Number(v || 0).toLocaleString("en-IN")} tooltip={<CountTooltip />} />
          )}
        </ChartCard>

        <ChartCard title="Employee Location" subtitle={`${locationDist.length} cities`} expandable
          onExpand={() => setModal({
            title: "Employee Location Distribution", subtitle: `${locationDist.length} cities`,
            content: <RankBar data={locationDist} dataKey="count" nameKey="name" color={P.slate} height={Math.min(700, locationDist.length * 34 + 20)} formatter={(v) => Number(v || 0).toLocaleString("en-IN")} tooltip={<CountTooltip />} />
          })}>
          {locationDist.length === 0 ? <Empty /> : (
            <RankBar data={locationDist.slice(0, 10)} dataKey="count" nameKey="name" color={P.slate} height={Math.min(280, Math.min(10, locationDist.length) * 34 + 20)} formatter={(v) => Number(v || 0).toLocaleString("en-IN")} tooltip={<CountTooltip />} />
          )}
        </ChartCard>

        <ChartCard title="Joining Trend" subtitle="Cumulative headcount growth by DOJ month" className="lg:col-span-2">
          {(() => {
            const m = {};
            [...fTeam].sort((a, b) => (a.doj || "").localeCompare(b.doj || "")).forEach((t) => { const k = toYYYYMM(t.doj); if (!k) return; m[k] = (m[k] || 0) + 1; });
            let running = 0;
            const data = Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => { running += v; return { x: fmtMonth(k), joined: v, total: running }; });
            return data.length === 0 ? <Empty msg="No DOJ data" /> : (
              <TimeSeriesArea data={data} lines={[
                { key: "joined", name: "Joined", color: P.slate },
                { key: "total", name: "Cumulative", color: P.trend },
              ]} height={240} tooltip={<CountTooltip />} />
            );
          })()}
        </ChartCard>
      </div>

      {/* ══ SECTION 7: CASH FLOW ══ */}
      <SH icon={Activity} title="Cash Flow — Bank & Software" color={P.sky} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Bank Inflow vs Outflow" subtitle="Daily cash movement">
          {bankFlow.length === 0 ? <Empty /> : (
            <TimeSeriesArea data={bankFlow} lines={[
              { key: "Inflow", color: P.teal },
              { key: "Outflow", color: P.brick },
            ]} height={260} />
          )}
        </ChartCard>

        <ChartCard title="Software Balance Flow" subtitle="Daily software entries">
          {swFlow.length === 0 ? <Empty msg="No software entry data" /> : (
            <TimeSeriesArea data={swFlow} lines={[
              { key: "Inflow", color: P.sky },
              { key: "Outflow", color: P.amber },
            ]} height={260} />
          )}
        </ChartCard>

        <ChartCard title="Cash Flow by Source" subtitle="All entries grouped by transaction type" className="lg:col-span-2">
          {cashBySource.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cashBySource} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Bar dataKey="Inflow" fill={P.teal} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outflow" fill={P.brick} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 8: STATUTORY ══ */}
      {statByInv.length > 0 && (
        <>
          <SH icon={FileText} title="Statutory Deductions" color={P.brick} />
          <ChartCard title="PF + ESI + LWF + PT per Invoice" subtitle="Scroll for many invoices">
            <StackedBar data={statByInv} xKey="x" bars={[
              { key: "Co. PF", color: P.plum },
              { key: "Co. ESI", color: P.sky },
              { key: "LWF", color: P.amber },
              { key: "PT", color: P.brick },
            ]} height={260} />
          </ChartCard>
        </>
      )}

      {/* ══ SECTION 9: PROFIT WATERFALL (RPC) ══ */}
      {rpcProfit.length > 0 && (
        <>
          <SH icon={TrendingUp} title="Profit Waterfall" color={P.teal} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Verto Fee vs Expense vs Profit" subtitle="Monthly P&L trend">
              <HScrollBar data={rpcProfit.map((r) => ({ x: r.month, "Verto Fee": Number(r.verto_fee_earned || 0), "Expense": Number(r.monthly_expense || 0), "Profit": Number(r.profit_pre_tds || 0) }))} xKey="x" barWidth={50} bars={[
                { key: "Verto Fee", color: P.steel },
                { key: "Expense", color: P.brick },
                { key: "Profit", color: P.teal },
              ]} height={260} />
            </ChartCard>

            <ChartCard title="Profit Margin % by Month" subtitle="profit_pre_tds / verto_fee_earned">
              {rpcProfit.length === 0 ? <Empty /> : (
                <TimeSeriesArea data={rpcProfit.map((r) => ({ x: r.month, "Margin %": Number(r.margin_pct || 0) }))} lines={[{ key: "Margin %", color: P.teal }]} height={240} tooltip={<PctTooltip />} />
              )}
            </ChartCard>

            <ChartCard title="Revenue vs Profit by Department" subtitle="All months combined">
              {rpcDeptRev.length === 0 ? <Empty /> : (
                <GroupedBar data={rpcDeptRev.map((r) => ({ name: r.dept_name, "Verto Fee": Number(r.verto_fee_earned || 0), "Profit": Number(r.profit_pre_tds || 0) }))} nameKey="name" bars={[
                  { key: "Verto Fee", color: P.steel },
                  { key: "Profit", color: P.teal },
                ]} height={Math.min(280, rpcDeptRev.length * 52 + 20)} />
              )}
            </ChartCard>

            <ChartCard title="Client P&L — Top 15" subtitle="Verto fee earned vs actual profit">
              {rpcClientPL.length === 0 ? <Empty /> : (
                <GroupedBar data={rpcClientPL.map((r) => ({ name: r.client_name, "Verto Fee": Number(r.verto_fee_earned || 0), "Profit": Number(r.actual_profit || 0) }))} nameKey="name" bars={[
                  { key: "Verto Fee", color: P.steel },
                  { key: "Profit", color: P.teal },
                ]} height={Math.min(400, rpcClientPL.length * 48 + 20)} />
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 10: COLLECTION FUNNEL & AGING (RPC) ══ */}
      {(rpcFunnel.length > 0 || rpcAging.length > 0) && (
        <>
          <SH icon={DollarSign} title="Collection Funnel & Invoice Aging" color={P.teal} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Collection Funnel" subtitle="Invoiced to Outstanding pipeline">
              {rpcFunnel.length === 0 ? <Empty /> : (
                <RankBar data={rpcFunnel.map((r, i) => ({ name: r.stage, value: Number(r.amount || 0) }))} dataKey="value" nameKey="name" color={P.steel} height={260} />
              )}
            </ChartCard>

            <ChartCard title="Invoice Aging — Outstanding Buckets" subtitle="Grouped by delay_days">
              {rpcAging.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-emerald-500">
                  <DollarSign className="w-8 h-8 mb-2" />
                  <p className="text-xs font-semibold">No outstanding invoices</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={rpcAging} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="outstanding" name="Outstanding" radius={[4, 4, 0, 0]}>
                      {rpcAging.map((_, i) => <Cell key={i} fill={seqColor(i, rpcAging.length, P.teal, P.brick)} />)}
                      <LabelList dataKey="outstanding" position="top" formatter={fmt} style={{ fontSize: 9, fill: "#475569" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Invoice Health Check" subtitle="Mismatches & delayed invoices">
              {rpcInvHealth.length === 0 ? <Empty /> : (
                <RankBar data={rpcInvHealth.map((r) => ({ name: r.metric, value: Number(r.count || 0) }))} dataKey="value" nameKey="name" color={P.brick} height={260} formatter={(v) => Number(v || 0).toLocaleString("en-IN")} tooltip={<CountTooltip />} />
              )}
            </ChartCard>

            <ChartCard title="Weekly Payment Collections" subtitle="Aggregated weekly collections">
              {rpcPayTrend.length === 0 ? <Empty /> : (
                <TimeSeriesArea data={rpcPayTrend.map((r) => ({ x: r.week_start, received: Number(r.total_received || 0) }))} lines={[{ key: "received", name: "Received", color: P.teal }]} height={240} />
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 11: HEADCOUNT ECONOMICS (RPC) ══ */}
      {rpcHeadEcon.length > 0 && (
        <>
          <SH icon={Users} title="Headcount Economics" color={P.sky} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Revenue per Head by Month" subtitle="Invoice value / employee count">
              <TimeSeriesArea data={rpcHeadEcon.map((r) => ({ x: r.month, "Revenue/Head": Number(r.revenue_per_head || 0), "OS Cost/Head": Number(r.os_cost_per_head || 0) }))} lines={[
                { key: "Revenue/Head", color: P.steel },
                { key: "OS Cost/Head", color: P.clay },
              ]} height={240} />
            </ChartCard>

            <ChartCard title="Headcount vs OS & Salary Cost" subtitle="Bars = headcount (left) · lines = cost (right, different scale)">
              <ComposedMetric
                data={rpcHeadEcon.map((r) => ({ x: r.month, Headcount: Number(r.total_employee_count || 0), "OS Cost": Number(r.os_cost || 0), Salary: Number(r.salary_cost || 0) }))}
                xKey="x"
                bars={[{ key: "Headcount", color: P.slate, name: "Headcount" }]}
                lines={[{ key: "OS Cost", color: P.clay, name: "OS Cost" }, { key: "Salary", color: P.plum, name: "Salary" }]}
                leftFormatter={fmtCount}
                rightFormatter={fmt}
                tooltip={<FlexibleTooltip moneyKeys={["OS Cost", "Salary"]} />}
                height={240}
              />
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 12: STATUTORY MONTHLY TREND (RPC) ══ */}
      {rpcStatutory.length > 0 && (
        <>
          <SH icon={FileText} title="Statutory Liability Trend" color={P.brick} />
          <ChartCard title="Net Statutory by Month" subtitle="After CN deductions · aggregated server-side">
            <StackedBar data={rpcStatutory.map((r) => ({ x: r.month, "Net PF": Number(r.net_pf || 0), "Net ESI": Number(r.net_esi || 0), "Net LWF": Number(r.net_lwf || 0), "PT": Number(r.pt_tax || 0) }))} xKey="x" bars={[
              { key: "Net PF", color: P.plum },
              { key: "Net ESI", color: P.sky },
              { key: "Net LWF", color: P.amber },
              { key: "PT", color: P.brick },
            ]} height={260} />
          </ChartCard>
        </>
      )}

      {/* ══ SECTION 13: BANK FLOW WEEKLY (RPC) ══ */}
      {rpcBankWeekly.length > 0 && (
        <>
          <SH icon={Activity} title="Bank Flow — Weekly" color={P.sky} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Weekly Bank Inflow vs Outflow" subtitle="52 data points per year regardless of volume">
              <TimeSeriesArea data={rpcBankWeekly.map((r) => ({ x: r.week_start, Inflow: Number(r.inflow || 0), Outflow: Number(r.outflow || 0) }))} lines={[
                { key: "Inflow", color: P.teal },
                { key: "Outflow", color: P.brick },
              ]} height={260} />
            </ChartCard>

            <ChartCard title="Cash Flow by Source Type" subtitle="Pre-aggregated — safe at 100K+ entries">
              {rpcBankSource.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={rpcBankSource} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="source_label" tick={{ fontSize: 10, fill: "#64748b" }} angle={-15} textAnchor="end" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                    <Bar dataKey="inflow" name="Inflow" fill={P.teal} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outflow" name="Outflow" fill={P.brick} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 14: TOP EARNERS RPC TABLE ══ */}
      {rpcTopEarners.length > 0 && (
        <>
          <SH icon={CreditCard} title="Top Earners — Period Summary" color={P.plum} />
          <ChartCard title={`Top ${rpcTopEarners.length} Earners`} subtitle="Aggregated from server">
            <DataTable
              columns={[
                { header: "#", key: "index", formatter: (_, row, i) => <span className="text-slate-300 font-bold">{i + 1}</span> },
                { header: "Employee", key: "employee_name", className: "font-semibold text-slate-800 truncate max-w-[140px]" },
                { header: "Dept", key: "dept_name", className: "text-slate-400 truncate" },
                { header: "Pay Head", key: "pay_head", className: "text-slate-400" },
                { header: "Gross", key: "total_gross", align: "right", formatter: (v) => <span className="text-slate-600">{fmt(v)}</span> },
                { header: "TDS", key: "total_tds", align: "right", formatter: (v) => <span className="text-rose-400">{fmt(v)}</span> },
                { header: "Net Pay", key: "total_net", align: "right", formatter: (v) => <span className="font-bold text-slate-800">{fmt(v)}</span> },
              ]}
              data={rpcTopEarners}
              maxHeight={320}
            />
          </ChartCard>
        </>
      )}

      {/* ══ SECTION 15: CASHFLOW PROJECTION vs ACTUALS (RPC) ══ */}
      {rpcCashflowProj.length > 0 && (
        <>
          <SH icon={Activity} title="Cashflow Intelligence" color={P.sky} count={`${rpcCashflowProj.length} months`} />
          
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KpiCard
              label="Projected Net Cash"
              value={fmt(cashflowKpis?.netProj)}
              sub="Budgeted position"
              icon={Wallet}
              color={P.steelLight}
            />
            <KpiCard
              label="Actual Net Cash"
              value={fmt(cashflowKpis?.netAct)}
              sub="Realized position"
              icon={Wallet}
              color={cashflowKpis?.netAct >= cashflowKpis?.netProj ? P.teal : P.brick}
              trend={cashflowKpis ? Number((cashflowKpis.netAct / Math.max(1, cashflowKpis.netProj) * 100 - 100).toFixed(1)) : 0}
            />
            <KpiCard
              label="Inflow Variance"
              value={`${cashflowKpis?.inflowVariance > 0 ? '+' : ''}${cashflowKpis?.inflowVariance.toFixed(1)}%`}
              sub="Actual vs projected inflow"
              icon={TrendingUp}
              color={cashflowKpis?.inflowVariance >= 0 ? P.teal : P.brick}
            />
            <KpiCard
              label="Outflow Variance"
              value={`${cashflowKpis?.outflowVariance > 0 ? '+' : ''}${cashflowKpis?.outflowVariance.toFixed(1)}%`}
              sub="Actual vs projected outflow"
              icon={Activity}
              color={cashflowKpis?.outflowVariance <= 0 ? P.teal : P.brick}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Projected vs Actual Cash Flow"
              subtitle="Monthly inflow & outflow comparison"
              className="lg:col-span-2"
            >
              <HScrollBar
                data={rpcCashflowProj.map(r => ({
                  x: r.month,
                  'Proj. Inflow':  Number(r.projected_inflow  || 0),
                  'Proj. Outflow': Number(r.projected_outflow || 0),
                  'Actual Inflow': Number(r.actual_inflow     || 0),
                  'Actual Outflow':Number(r.actual_outflow    || 0),
                }))}
                xKey="x"
                barWidth={38}
                bars={[
                  { key: 'Proj. Inflow',   color: P.steelLight, name: 'Proj. Inflow' },
                  { key: 'Proj. Outflow',  color: P.plumLight,  name: 'Proj. Outflow' },
                  { key: 'Actual Inflow',  color: P.teal,       name: 'Actual Inflow' },
                  { key: 'Actual Outflow', color: P.brick,      name: 'Actual Outflow' },
                ]}
                height={280}
              />
            </ChartCard>

            <ChartCard title="Net Cash Position" subtitle="Projected vs Actual net per month">
              <TimeSeriesArea
                data={rpcCashflowProj.map(r => ({
                  x: r.month,
                  'Net Projected': Number(r.net_projected || 0),
                  'Net Actual':    Number(r.net_actual    || 0),
                }))}
                lines={[
                  { key: 'Net Projected', color: P.steelLight, name: 'Net Projected' },
                  { key: 'Net Actual',    color: P.teal,       name: 'Net Actual' },
                ]}
                height={240}
              />
            </ChartCard>

            <ChartCard title="Variance Analysis" subtitle="Actual minus Projected by month">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={rpcCashflowProj.map(r => ({
                    x: r.month,
                    'Inflow Var': Number(r.actual_inflow || 0) - Number(r.projected_inflow || 0),
                    'Outflow Var': Number(r.actual_outflow || 0) - Number(r.projected_outflow || 0),
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  <Bar dataKey="Inflow Var" fill={P.teal} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflow Var" fill={P.brick} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 16: OPERATIONAL EXPENSES — PAYMENTS MADE (RPC) ══ */}
      {rpcPaymentsMade.length > 0 && (
        <>
          <SH icon={CreditCard} title="Operational Expense Intelligence" color={P.amber} count={`${rpcPaymentsMade.length} entries`} />
          
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KpiCard
              label="Total Expenses"
              value={fmt(paymentsMadeKpis?.total)}
              sub={`${paymentsMadeKpis?.entries} payment entries`}
              icon={CreditCard}
              color={P.amber}
            />
            <KpiCard
              label="Top Expense Head"
              value={paymentsMadeKpis?.topHead}
              sub={`${paymentsMadeKpis?.topHeadPct.toFixed(1)}% of total`}
              icon={FileText}
              color={P.clay}
            />
            <KpiCard
              label="Departments"
              value={paymentsMadeByDept.length}
              sub="Active cost centers"
              icon={Building2}
              color={P.slate}
            />
            <KpiCard
              label="Avg. per Entry"
              value={fmt(paymentsMadeKpis?.entries > 0 ? paymentsMadeKpis.total / paymentsMadeKpis.entries : 0)}
              sub="Mean transaction size"
              icon={DollarSign}
              color={P.sky}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Expenses by Pay Head"
              subtitle="All operational payments grouped by category"
            >
              {paymentsMadeByHead.length === 0 ? <Empty /> : (
                <RankBar
                  data={paymentsMadeByHead}
                  dataKey="value"
                  nameKey="name"
                  color={P.amber}
                  height={Math.min(320, paymentsMadeByHead.length * 34 + 20)}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Expenses by Department"
              subtitle="Cost allocation across departments"
            >
              {paymentsMadeByDept.length === 0 ? <Empty /> : (
                <RankBar
                  data={paymentsMadeByDept}
                  dataKey="value"
                  nameKey="name"
                  color={P.clay}
                  height={Math.min(320, paymentsMadeByDept.length * 34 + 20)}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Expense Distribution"
              subtitle="Proportional breakdown by pay head"
            >
              {paymentsMadeByHead.length === 0 ? <Empty /> : (
                <DonutChart
                  data={paymentsMadeByHead}
                  height={260}
                  innerRadius={60}
                  outerRadius={90}
                  tooltip={<CurrencyTooltip />}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Monthly Expense Trend"
              subtitle="Spend pattern over time"
            >
              {(() => {
                const m = {};
                rpcPaymentsMade.forEach(r => {
                  const k = r.month || 'Unknown';
                  if (!m[k]) m[k] = { x: k, amount: 0, count: 0 };
                  m[k].amount += Number(r.total_amount || 0);
                  m[k].count += Number(r.entry_count || 0);
                });
                const data = Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
                return data.length === 0 ? <Empty /> : (
                  <TimeSeriesArea
                    data={data}
                    lines={[
                      { key: 'amount', name: 'Total Expense', color: P.amber },
                      { key: 'count', name: 'Entry Count', color: P.slate },
                    ]}
                    height={240}
                    tooltip={<FlexibleTooltip moneyKeys={['Total Expense']} />}
                  />
                );
              })()}
            </ChartCard>

            <ChartCard
              title="Expense Detail"
              subtitle="All entries in selected period"
              className="lg:col-span-2"
            >
              <DataTable
                columns={[
                  { header: 'Month',    key: 'month',        className: 'text-slate-500' },
                  { header: 'Pay Head', key: 'pay_head',     className: 'font-medium text-slate-800' },
                  { header: 'Dept',     key: 'department',   className: 'text-slate-500' },
                  { header: 'Entries',  key: 'entry_count',  align: 'right', formatter: v => fmtCount(v) },
                  { header: 'Amount',   key: 'total_amount', align: 'right', formatter: v => (
                    <span className="font-semibold text-slate-800">{fmt(v)}</span>
                  )},
                ]}
                data={[...rpcPaymentsMade].sort((a, b) => Number(b.total_amount) - Number(a.total_amount))}
                maxHeight={280}
              />
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 17: COLLECTION DELAY & RECEIVABLE RISK (RPC) ══ */}
      {rpcCollectionDelay.length > 0 && (
        <>
          <SH icon={Activity} title="Receivables Risk Intelligence" color={P.brick} count={`${rpcCollectionDelay.length} invoices`} />
          
          {/* Risk KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KpiCard
              label="Total Outstanding"
              value={fmt(collectionDelayKpis?.totalOutstanding)}
              sub="All receivables"
              icon={DollarSign}
              color={P.amber}
              alert={collectionDelayKpis?.totalOutstanding > 0}
            />
            <KpiCard
              label="Overdue Amount"
              value={fmt(collectionDelayKpis?.overdueAmt)}
              sub={`${collectionDelayKpis?.overdueCount} invoices`}
              icon={Activity}
              color={P.brick}
              alert={collectionDelayKpis?.overdueAmt > 0}
            />
            <KpiCard
              label="Overdue Rate"
              value={`${collectionDelayKpis?.overduePct.toFixed(1)}%`}
              sub="% of total invoices"
              icon={TrendingUp}
              color={collectionDelayKpis?.overduePct > 30 ? P.brick : collectionDelayKpis?.overduePct > 15 ? P.amber : P.teal}
            />
            <KpiCard
              label="Critical (60d+)"
              value={fmt(collectionDelayKpis?.criticalAmt)}
              sub={`${collectionDelayKpis?.criticalCount} invoices`}
              icon={AlertTriangle}
              color={P.brick}
              alert={collectionDelayKpis?.criticalAmt > 0}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Outstanding by Delay Bucket"
              subtitle="Receivable aging by risk segment"
            >
              {delayBuckets.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={delayBuckets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="outstanding" name="Outstanding" radius={[4, 4, 0, 0]}>
                      {delayBuckets.map((d, i) => (
                        <Cell key={i} fill={
                          d.bucket === 'Paid'         ? P.teal :
                          d.bucket === 'Not Yet Due'  ? P.steel :
                          d.bucket === 'No Due Date'  ? '#94a3b8' :
                          d.bucket === 'Overdue 1–15d'? '#fbbf24' :
                          d.bucket === 'Overdue 16–30d'? '#f59e0b' :
                          d.bucket === 'Overdue 31–60d'? '#d97706' :
                          P.brick
                        } />
                      ))}
                      <LabelList dataKey="outstanding" position="top" formatter={fmt} style={{ fontSize: 9, fill: '#475569' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Invoice Count per Bucket"
              subtitle="Volume distribution by delay stage"
            >
              {delayBuckets.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={delayBuckets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip content={<CountTooltip />} />
                    <Bar dataKey="count" name="Invoices" fill={P.brick} radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Overdue Invoices — Detail"
              subtitle="Sorted by days overdue · click expand for all"
              className="lg:col-span-2"
              expandable
              onExpand={() => setModal({
                title: 'All Invoices — Collection Delay Detail',
                subtitle: `${rpcCollectionDelay.length} invoices · ${fmt(collectionDelayKpis?.totalOutstanding)} total outstanding`,
                content: (
                  <DataTable
                    columns={[
                      { header: 'Invoice',    key: 'invoice_number',  className: 'font-medium text-slate-800' },
                      { header: 'Client',     key: 'client_name',     className: 'text-slate-600 truncate max-w-[180px]' },
                      { header: 'Status',     key: 'status',          className: 'text-slate-500' },
                      { header: 'Due Date',   key: 'expected_collection_date', formatter: v => fmtDate(v) },
                      { header: 'Days Over',  key: 'days_overdue',    align: 'right', formatter: v => (
                        <span className={Number(v)>60 ? 'text-rose-600 font-bold' : Number(v)>15 ? 'text-amber-600 font-semibold' : 'text-slate-600'}>{v}d</span>
                      )},
                      { header: 'Bucket',     key: 'delay_bucket',    className: 'text-slate-500 text-[10px]' },
                      { header: 'Outstanding',key: 'receivable_amount', align: 'right', formatter: v => (
                        <span className="font-semibold text-slate-800">{fmt(v)}</span>
                      )},
                    ]}
                    data={rpcCollectionDelay.filter(r => r.receivable_amount > 0).sort((a, b) => Number(b.days_overdue) - Number(a.days_overdue))}
                    maxHeight={500}
                  />
                ),
              })}
            >
              <DataTable
                columns={[
                  { header: 'Invoice',    key: 'invoice_number',  className: 'font-medium text-slate-800' },
                  { header: 'Client',     key: 'client_name',     className: 'text-slate-500 truncate max-w-[140px]' },
                  { header: 'Days Over',  key: 'days_overdue',    align: 'right', formatter: v => (
                    <span className={Number(v)>60 ? 'text-rose-600 font-bold' : Number(v)>15 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>{v}d</span>
                  )},
                  { header: 'Bucket',     key: 'delay_bucket',    className: 'text-[10px] text-slate-400' },
                  { header: 'Outstanding',key: 'receivable_amount', align: 'right', formatter: v => (
                    <span className="font-semibold text-slate-800">{fmt(v)}</span>
                  )},
                ]}
                data={rpcCollectionDelay.filter(r => r.receivable_amount > 0).sort((a, b) => Number(b.days_overdue) - Number(a.days_overdue)).slice(0, 12)}
                maxHeight={300}
              />
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 18: BOUNCE BACK TRACKER (RPC) ══ */}
      {rpcBounceback.length > 0 && (
        <>
          <SH icon={Activity} title="Payment Bounce Intelligence" color={P.brick} count={`${rpcBounceback.length} events`} />
          
          {/* Bounce KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KpiCard
              label="Total Bounced"
              value={fmt(bouncebackKpis?.totalBounced)}
              sub={`${rpcBounceback.length} bounce events`}
              icon={Activity}
              color={P.brick}
              alert
            />
            <KpiCard
              label="Bounce Rate"
              value={`${bouncebackKpis?.bounceRate.toFixed(2)}%`}
              sub="Of invoice value"
              icon={TrendingUp}
              color={bouncebackKpis?.bounceRate > 5 ? P.brick : P.amber}
            />
            <KpiCard
              label="Clients Affected"
              value={bouncebackKpis?.uniqueClients}
              sub="Unique clients"
              icon={Users}
              color={P.amber}
            />
            <KpiCard
              label="Invoices Affected"
              value={bouncebackKpis?.uniqueInvoices}
              sub="Unique invoices"
              icon={FileText}
              color={P.slate}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Bounce Back by Client"
              subtitle="Bounced amount per client"
            >
              {(() => {
                const m = {};
                rpcBounceback.forEach(r => {
                  const c = r.client_name || 'Unknown';
                  m[c] = (m[c] || 0) + Number(r.bounce_amount || 0);
                });
                const data = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
                return data.length === 0 ? <Empty /> : (
                  <RankBar
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    color={P.brick}
                    height={Math.min(320, data.length * 34 + 20)}
                  />
                );
              })()}
            </ChartCard>

            <ChartCard
              title="Bounce Back by Month"
              subtitle="Timeline of bounce events"
            >
              {(() => {
                const m = {};
                rpcBounceback.forEach(r => {
                  const k = r.bounce_date ? r.bounce_date.slice(0, 7) : 'Unknown';
                  if (!m[k]) m[k] = { x: fmtMonth(k), amount: 0, count: 0 };
                  m[k].amount += Number(r.bounce_amount || 0);
                  m[k].count += 1;
                });
                const data = Object.values(m).sort((a, b) => a.x.localeCompare(b.x));
                return data.length === 0 ? <Empty /> : (
                  <TimeSeriesArea
                    data={data}
                    lines={[
                      { key: 'amount', name: 'Bounced Amount', color: P.brick },
                      { key: 'count', name: 'Event Count', color: P.amber },
                    ]}
                    height={260}
                    tooltip={<FlexibleTooltip moneyKeys={['Bounced Amount']} />}
                  />
                );
              })()}
            </ChartCard>

            <ChartCard
              title="Bounce Events — Detail"
              subtitle="All payment bounces in selected period"
              className="lg:col-span-2"
            >
              <DataTable
                columns={[
                  { header: 'Date',        key: 'bounce_date',    formatter: v => fmtDate(v) },
                  { header: 'Invoice',     key: 'invoice_number', className: 'font-medium text-slate-800' },
                  { header: 'Client',      key: 'client_name',    className: 'text-slate-600 truncate max-w-[160px]' },
                  { header: 'Bank',        key: 'bank_details',   className: 'text-slate-400 text-[10px] max-w-[120px]' },
                  { header: 'Bounced Amt', key: 'bounce_amount',  align: 'right', formatter: v => (
                    <span className="font-bold text-rose-500">{fmt(v)}</span>
                  )},
                  { header: 'Invoice Val', key: 'invoice_value',  align: 'right', formatter: v => (
                    <span className="text-slate-500">{fmt(v)}</span>
                  )},
                  { header: 'Bounce %', key: 'bounce_pct', align: 'right', formatter: (_, row) => {
                    const pct = row.invoice_value > 0 ? (row.bounce_amount / row.invoice_value * 100).toFixed(1) : 0;
                    return <span className={pct > 50 ? 'text-rose-600 font-bold' : 'text-slate-500'}>{pct}%</span>;
                  }},
                ]}
                data={rpcBounceback}
                maxHeight={320}
              />
            </ChartCard>
          </div>
        </>
      )}

      {/* NOTE: Forecast/Growth/HR/Working Capital/Ratio cards requested are not added in this change.
          Analyticsdashboard currently uses only its existing RPC set. Adding those sections requires
          additional RPCs + computed datasets and is not safe to merge without verifying the RPC output shape. */}

      <div className="text-center py-4 text-[11px] text-slate-300">
        Analytics · {fy.label} · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </div>
    </div>
  );
}