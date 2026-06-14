import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import supabase from "../lib/supabaseClient";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Tooltip, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, Legend, LabelList, Brush,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, CreditCard, FileText,
  Activity, Filter, RefreshCw, ChevronDown, X, ArrowUpRight,
  ArrowDownRight, Wallet, Building2, BarChart2, Search, FileX,
  ChevronLeft, ChevronRight, Maximize2, SlidersHorizontal,
} from "lucide-react";

// ─── Palette (professional, muted, low-saturation) ────────────────────────────
const P = {
  blue:    "#3b5b92", indigo:  "#5b6b9e", violet:  "#7c6f9e",
  emerald: "#3f8f6e", amber:   "#b8924a", rose:    "#b15c5c",
  sky:     "#5a8aa6", teal:    "#4a8f8a", orange:  "#bb7f4f", pink: "#a17b94",
  slate:   "#64748b",
};
const CC = [P.blue, P.teal, P.amber, P.violet, P.emerald, P.rose, P.sky, P.indigo, P.orange, P.pink];

const TEAM_DEPT_MAP = {
  OS: "Operations", Rec: "Recruitment", BD: "Business Development",
  Accts: "Accounts", Temp: "Temporary", Common: "Common",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v/1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v/1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(v/1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const fmtFull  = (n) => `₹${Number(n||0).toLocaleString("en-IN")}`;
const toYYYYMM = (d) => (d||"").slice(0,7);
const fmtMonth = (ym) => !ym ? "" : new Date(ym+"-01").toLocaleDateString("en-IN",{month:"short",year:"2-digit"});
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "";
const isBankInflow = (b) => b.entry_type === "payment_received" || b.flow_type === "inflow";
const isSoftwareInflow = (s) => s.flow_type === "inflow" || (s.flow_type==null && Number(s.amount)>0);

// ─── Financial Year helpers (Apr–Mar) ──────────────────────────────────────────
// Returns {label:"FY 26-27", start:"2026-04-01", end:"2027-03-31"} for a given start year (e.g. 2026)
const fyRange = (startYear) => {
  const start = `${startYear}-04-01`;
  const end   = `${startYear+1}-03-31`;
  const label = `FY ${String(startYear).slice(-2)}-${String(startYear+1).slice(-2)}`;
  return { label, start, end, startYear };
};
const currentFYStartYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth()+1; // 1-12
  return m >= 4 ? y : y-1;
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CT = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-2xl p-3 text-xs min-w-[150px] max-w-[260px]">
      {label && <p className="font-bold text-gray-700 mb-2 border-b pb-1 truncate">{label}</p>}
      {payload.map((p,i) => (
        <div key={i} className="flex items-center justify-between gap-3 mt-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:p.color||p.fill}}/>
            <span className="text-gray-500 truncate">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-800 flex-shrink-0">
            {typeof p.value==="number"&&p.value>999 ? fmtFull(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({label,value,sub,icon:Icon,color,trend,alert}) => (
  <div className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all ${alert?"border-amber-200 bg-amber-50/30":"border-gray-100"}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:color+"18"}}>
        <Icon className="w-5 h-5" style={{color}}/>
      </div>
      {trend!==undefined && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend>=0?"text-emerald-600":"text-rose-500"}`}>
          {trend>=0?<ArrowUpRight className="w-3 h-3"/>:<ArrowDownRight className="w-3 h-3"/>}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
    <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
    {sub&&<p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// ─── Chart Card with optional horizontal scroll & Top-N toggle ───────────────
const ChartCard = ({title,subtitle,children,className="",topN,onTopN,topNOptions=[5,10,20],scrollable,minScrollWidth,expandable,onExpand}) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
    <div className="flex items-start justify-between px-5 pt-5 pb-0 mb-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {subtitle&&<p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
        {topN!==undefined&&onTopN&&(
          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            {topNOptions.map((n,i)=>(
              <button key={n} onClick={()=>onTopN(n)}
                className={`px-2 py-1 text-[10px] font-bold transition-colors ${topN===n?"bg-slate-700 text-white":"text-gray-500 hover:text-gray-800"} ${i>0?"border-l border-gray-200":""}`}>
                {n===999?"All":`Top ${n}`}
              </button>
            ))}
          </div>
        )}
        {expandable&&onExpand&&(
          <button onClick={onExpand} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <Maximize2 className="w-3.5 h-3.5"/>
          </button>
        )}
      </div>
    </div>
    {scrollable ? (
      <div className="overflow-x-auto pb-5 px-5">
        <div style={{minWidth: minScrollWidth||600}}>
          {children}
        </div>
      </div>
    ) : (
      <div className="px-5 pb-5">{children}</div>
    )}
  </div>
);

// ─── Scrollable Vertical Bar — for large client/dept lists ───────────────────
const VScrollBar = ({data,dataKey,nameKey="name",color,formatter=fmt,height=360,barSize=28}) => {
  const totalH = Math.max(height, data.length * (barSize+12));
  return (
    <div style={{height,overflowY:"auto"}} className="pr-1">
      <div style={{height:totalH}}>
        <ResponsiveContainer width="100%" height={totalH}>
          <BarChart data={data} layout="vertical" margin={{top:4,right:60,left:8,bottom:4}} barSize={barSize}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
            <XAxis type="number" tick={{fontSize:10}} tickFormatter={formatter}/>
            <YAxis dataKey={nameKey} type="category" tick={{fontSize:10}} width={130}/>
            <Tooltip content={<CT/>}/>
            <Bar dataKey={dataKey} fill={color} radius={[0,4,4,0]}>
              <LabelList dataKey={dataKey} position="right" formatter={formatter} style={{fontSize:9,fill:color}}/>
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Scrollable Horizontal Bar — for many months/invoices ────────────────────
const HScrollBar = ({data,bars,xKey,height=220,barWidth=44}) => {
  const minW = Math.max(400, data.length * (bars.length*barWidth+16));
  return (
    <div className="overflow-x-auto pb-1">
      <div style={{minWidth:minW}}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{top:5,right:10,left:0,bottom:20}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey={xKey} tick={{fontSize:10}} angle={data.length>8?-30:0} textAnchor={data.length>8?"end":"middle"}/>
            <YAxis tick={{fontSize:10}} tickFormatter={fmt}/>
            <Tooltip content={<CT/>}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            {bars.map(b=>(
              <Bar key={b.key} dataKey={b.key} name={b.name||b.key} fill={b.color} radius={[4,4,0,0]} maxBarSize={50}/>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Area chart with brush for long time series ───────────────────────────────
const BrushArea = ({data,lines,xKey,height=220}) => (
  <div className="overflow-x-auto pb-1">
    <div style={{minWidth:Math.max(400,data.length*24)}}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{top:5,right:10,left:0,bottom:30}}>
          <defs>
            {lines.map(l=>(
              <linearGradient key={l.key} id={`g_${l.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={l.color} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={l.color} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
          <XAxis dataKey={xKey} tick={{fontSize:9}}/>
          <YAxis tick={{fontSize:10}} tickFormatter={fmt}/>
          <Tooltip content={<CT/>}/>
          <Legend wrapperStyle={{fontSize:10}}/>
          {lines.map(l=>(
            <Area key={l.key} type="monotone" dataKey={l.key} name={l.name||l.key}
              stroke={l.color} fill={`url(#g_${l.key})`} strokeWidth={2} dot={data.length<20}/>
          ))}
          {data.length>12&&<Brush dataKey={xKey} height={20} stroke="#e2e8f0" travellerWidth={8}/>}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SH = ({icon:Icon,title,color,count}) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:color+"18"}}>
      <Icon className="w-4 h-4" style={{color}}/>
    </div>
    <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">{title}</h2>
    {count!==undefined&&<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">{count}</span>}
    <div className="flex-1 h-px bg-gray-100"/>
  </div>
);

// ─── Empty ────────────────────────────────────────────────────────────────────
const Empty = ({msg="No data for selected filters"}) => (
  <div className="flex flex-col items-center justify-center py-10 text-gray-300">
    <BarChart2 className="w-8 h-8 mb-2"/><p className="text-xs font-medium">{msg}</p>
  </div>
);

// ─── Filter Select ────────────────────────────────────────────────────────────
const FS = ({label,value,onChange,options,placeholder="All"}) => (
  <div>
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
    <div className="relative">
      <select value={value} onChange={e=>onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 cursor-pointer">
        <option value="">{placeholder}</option>
        {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"/>
    </div>
  </div>
);

// ─── FY Selector (matches reference pill: « FY 26-27 ») ───────────────────────
const FYSelector = ({ startYear, onChange, minYear=2015, maxYear=currentFYStartYear()+1 }) => {
  const { label } = fyRange(startYear);
  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-1.5 py-1">
      <button
        onClick={()=>onChange(Math.max(minYear, startYear-1))}
        disabled={startYear<=minYear}
        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        <ChevronLeft className="w-3.5 h-3.5"/>
      </button>
      <span className="text-xs font-bold text-gray-700 px-2 tracking-wide whitespace-nowrap">{label}</span>
      <button
        onClick={()=>onChange(Math.min(maxYear, startYear+1))}
        disabled={startYear>=maxYear}
        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        <ChevronRight className="w-3.5 h-3.5"/>
      </button>
    </div>
  );
};

// ─── Expand Modal ─────────────────────────────────────────────────────────────
const Modal = ({title,subtitle,children,onClose}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle&&<p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
          <X className="w-4 h-4"/>
        </button>
      </div>
      <div className="overflow-auto p-6 flex-1">{children}</div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function AnalyticsDashboard() {

  // ── State ──────────────────────────────────────────────────────────────────
  const [invoices,setSI]        = useState([]);
  const [payments,setSP]        = useState([]);
  const [osPayouts,setSO]       = useState([]);
  const [creditNotes,setSC]     = useState([]);
  const [salaries,setSS]        = useState([]);
  const [team,setTeam]          = useState([]);
  const [bankEntries,setBE]     = useState([]);
  const [softwareEntries,setSE2]= useState([]);
  const [clients,setCl]         = useState([]);
  const [departments,setDm]     = useState([]);
  const [entities,setEn]        = useState([]);
  const [loading,setLoading]    = useState(true);
  const [lastFetched,setLF]     = useState(null);
  const [modal,setModal]        = useState(null); // {title,subtitle,content}

  // Financial Year selector (Apr–Mar)
  const [fyStartYear,setFyStartYear] = useState(currentFYStartYear());
  const fy = useMemo(()=>fyRange(fyStartYear),[fyStartYear]);

  // Top-N states per chart category
  const [topNClient,setTopNClient]   = useState(10);
  const [topNInvoice,setTopNInvoice] = useState(10);
  const [topNDept,setTopNDept]       = useState(999);
  const [topNTeam,setTopNTeam]       = useState(999);
  const [topNSalary,setTopNSalary]   = useState(999);

  const [filters,setFilters] = useState({
    dateFrom:"",dateTo:"",impactMonth:"",department:"",
    client:"",entity:"",invoiceNumber:"",status:"",payHead:"",employee:"",
  });
  const [filtersOpen,setFO] = useState(true);
  const setF = (k,v) => setFilters(p=>({...p,[k]:v}));
  const clearF = () => setFilters({dateFrom:"",dateTo:"",impactMonth:"",department:"",client:"",entity:"",invoiceNumber:"",status:"",payHead:"",employee:""});
  const AFC = Object.values(filters).filter(Boolean).length;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        {data:inv},{data:pay},{data:os},{data:cn},{data:sal},
        {data:tm},{data:be},{data:se},{data:cl},{data:dm},{data:em},
      ] = await Promise.all([
        supabase.from("invoices").select(`
          id,invoice_number,invoice_date,impact_month,invoice_value,
          amount_received,receivable_amount,verto_fee,gst,tds,
          net_in_hand,gross_value,co_pf,co_esi,lwf_tax,pt_tax,
          employee_count,pay_head,status,client_id,department_id,entity_id,
          clients_master!invoices_client_id_fkey(client_name),
          entity_master!invoices_entity_id_fkey(entity_name)
        `),
        supabase.from("payments_received").select(`
          id,amount_received,payment_date,invoice_id,
          invoices(invoice_number,clients_master!invoices_client_id_fkey(client_name))
        `),
        supabase.from("os_payouts").select(`
          id,payout_month,payment_date,amount_paid,employee_count,
          is_billable,pay_head,client_id,department_id,entity_id,invoice_id,
          clients_master!os_payouts_client_id_fkey(client_name),
          entity_master!os_payouts_entity_id_fkey(entity_name),
          invoices(department_id)
        `),
        supabase.from("credit_note_bad_debt").select(`
          id,invoice_id,invoice_number,type,amount,issue_date,
          pay_cn,verto_fee_cn,gst_cn,tds_cn,er_pf,ee_pf,er_esic,ee_esic,lwf_cn,pt_cn,
          invoices(department_id,clients_master!invoices_client_id_fkey(client_name))
        `),
        supabase.from("employee_expense_payouts").select(`
          id,month_of_pay,date_of_pay,net_payment,pay_head,
          employee_name,emp_code,department_id,entity_id,
          departments_master!employee_expense_payouts_department_id_fkey(dept_name),
          entity_master!employee_expense_payouts_entity_id_fkey(entity_name)
        `),
        supabase.from("internal_team").select("id,name,emp_code,department,designation,location,ctc,status,doj,entity"),
        supabase.from("bank_entries").select("id,date,amount,flow_type,entry_type,source_table,entity").eq("is_deleted",false).order("date"),
        supabase.from("software_entries").select("id,date,amount,flow_type,source_table").order("date"),
        supabase.from("clients_master").select("id,client_name"),
        supabase.from("departments_master").select("id,dept_name,dept_code"),
        supabase.from("entity_master").select("id,entity_name"),
      ]);
      setSI(inv||[]); setSP(pay||[]); setSO(os||[]); setSC(cn||[]); setSS(sal||[]);
      setTeam(tm||[]); setBE(be||[]); setSE2(se||[]); setCl(cl||[]); setDm(dm||[]); setEn(em||[]);
      setLF(new Date());
    } catch(e) { console.error("Analytics fetch error:",e); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{fetchAll();},[fetchAll]);

  // ── Lookups ────────────────────────────────────────────────────────────────
  const deptById   = useMemo(()=>{const m={};departments.forEach(d=>{m[d.id]=d.dept_name;});return m;},[departments]);
  const entityById = useMemo(()=>{const m={};entities.forEach(e=>{m[e.id]=e.entity_name;});return m;},[entities]);
  const empDeptByCode = useMemo(()=>{const m={};team.forEach(t=>{if(t.emp_code)m[t.emp_code]=TEAM_DEPT_MAP[t.department]||t.department||"Unknown";});return m;},[team]);

  // ── Flatten ────────────────────────────────────────────────────────────────
  const FI = useMemo(()=>invoices.map(i=>({
    ...i,
    client_name: i.clients_master?.client_name||"Unknown",
    dept_name:   deptById[i.department_id]||"Unknown",
    entity_name: i.entity_master?.entity_name||entityById[i.entity_id]||"Unknown",
  })),[invoices,deptById,entityById]);

  const FP = useMemo(()=>payments.map(p=>({
    ...p,
    invoice_number: p.invoices?.invoice_number||"",
    client_name:    p.invoices?.clients_master?.client_name||"Unknown",
  })),[payments]);

  const FO = useMemo(()=>osPayouts.map(o=>({
    ...o,
    client_name:    o.clients_master?.client_name||"Unknown",
    dept_name:      deptById[o.department_id]||deptById[o.invoices?.department_id]||"Unknown",
    entity_name:    o.entity_master?.entity_name||entityById[o.entity_id]||"Unknown",
    effective_month:toYYYYMM(o.payout_month)||toYYYYMM(o.payment_date),
  })),[osPayouts,deptById,entityById]);

  const FC = useMemo(()=>creditNotes.map(cn=>({
    ...cn,
    client_name: cn.invoices?.clients_master?.client_name||"Unknown",
    dept_name:   deptById[cn.invoices?.department_id]||"Unknown",
    issue_month: toYYYYMM(cn.issue_date),
  })),[creditNotes,deptById]);

  const FSal = useMemo(()=>salaries.map(s=>({
    ...s,
    dept_name:   s.departments_master?.dept_name||empDeptByCode[s.emp_code]||"Unknown",
    entity_name: s.entity_master?.entity_name||entityById[s.entity_id]||"Unknown",
  })),[salaries,empDeptByCode,entityById]);

  // ── Filters applied (date range from filters takes priority; else use FY range) ─
  const effFrom = filters.dateFrom || fy.start;
  const effTo   = filters.dateTo   || fy.end;

  const fI = useMemo(()=>FI.filter(i=>{
    if(effFrom&&i.invoice_date<effFrom)return false;
    if(effTo&&i.invoice_date>effTo)return false;
    if(filters.impactMonth&&toYYYYMM(i.impact_month)!==filters.impactMonth)return false;
    if(filters.department&&i.dept_name!==filters.department)return false;
    if(filters.client&&i.client_name!==filters.client)return false;
    if(filters.entity&&i.entity_name!==filters.entity)return false;
    if(filters.status&&i.status?.toLowerCase()!==filters.status?.toLowerCase())return false;
    if(filters.payHead&&i.pay_head!==filters.payHead)return false;
    if(filters.invoiceNumber&&!i.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase()))return false;
    return true;
  }),[FI,filters,effFrom,effTo]);

  const fP = useMemo(()=>FP.filter(p=>{
    if(effFrom&&p.payment_date<effFrom)return false;
    if(effTo&&p.payment_date>effTo)return false;
    if(filters.client&&p.client_name!==filters.client)return false;
    if(filters.invoiceNumber&&!p.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase()))return false;
    return true;
  }),[FP,filters,effFrom,effTo]);

  const fO = useMemo(()=>FO.filter(o=>{
    if(effFrom&&o.payment_date&&o.payment_date<effFrom)return false;
    if(effTo&&o.payment_date&&o.payment_date>effTo)return false;
    if(filters.department&&o.dept_name!==filters.department)return false;
    if(filters.client&&o.client_name!==filters.client)return false;
    return true;
  }),[FO,filters,effFrom,effTo]);

  const fC = useMemo(()=>FC.filter(cn=>{
    if(effFrom&&cn.issue_date<effFrom)return false;
    if(effTo&&cn.issue_date>effTo)return false;
    if(filters.department&&cn.dept_name!==filters.department)return false;
    if(filters.client&&cn.client_name!==filters.client)return false;
    if(filters.invoiceNumber&&!cn.invoice_number?.toLowerCase().includes(filters.invoiceNumber.toLowerCase()))return false;
    return true;
  }),[FC,filters,effFrom,effTo]);

  const fSal = useMemo(()=>FSal.filter(s=>{
    if(effFrom&&s.date_of_pay&&s.date_of_pay<effFrom)return false;
    if(effTo&&s.date_of_pay&&s.date_of_pay>effTo)return false;
    if(filters.department&&s.dept_name!==filters.department)return false;
    if(filters.entity&&s.entity_name!==filters.entity)return false;
    if(filters.payHead&&s.pay_head!==filters.payHead)return false;
    if(filters.employee&&!s.employee_name?.toLowerCase().includes(filters.employee.toLowerCase()))return false;
    return true;
  }),[FSal,filters,effFrom,effTo]);

  const fTeam = useMemo(()=>team.filter(t=>{
    const fd = TEAM_DEPT_MAP[t.department]||t.department;
    if(filters.department&&fd!==filters.department)return false;
    if(filters.employee&&!t.name?.toLowerCase().includes(filters.employee.toLowerCase()))return false;
    return true;
  }),[team,filters]);

  const fBank = useMemo(()=>bankEntries.filter(b=>{
    if(effFrom&&b.date<effFrom)return false;
    if(effTo&&b.date>effTo)return false;
    return true;
  }),[bankEntries,filters,effFrom,effTo]);

  const fSw = useMemo(()=>softwareEntries.filter(s=>{
    if(effFrom&&s.date<effFrom)return false;
    if(effTo&&s.date>effTo)return false;
    return true;
  }),[softwareEntries,filters,effFrom,effTo]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(()=>{
    const totalInv  = fI.reduce((s,i)=>s+Number(i.invoice_value||0),0);
    const totalV    = fI.reduce((s,i)=>s+Number(i.verto_fee||0),0);
    const cnVd      = fC.reduce((s,c)=>s+Number(c.verto_fee_cn||0),0);
    const netV      = totalV-cnVd;
    const totalOut  = fI.reduce((s,i)=>s+Number(i.receivable_amount||0),0);
    const totalRcv  = fP.reduce((s,p)=>s+Number(p.amount_received||0),0);
    const totalOS   = fO.reduce((s,o)=>s+Number(o.amount_paid||0),0);
    const totalSal  = fSal.reduce((s,e)=>s+Number(e.net_payment||0),0);
    const totalCN   = fC.reduce((s,c)=>s+Number(c.amount||0),0);
    const activeEmp = fTeam.filter(t=>t.status==="Active").length;
    const colPct    = totalInv>0?((totalRcv/totalInv)*100).toFixed(1):"0.0";
    const bIn       = fBank.filter(isBankInflow).reduce((s,b)=>s+Math.abs(Number(b.amount||0)),0);
    const bOut      = fBank.filter(b=>!isBankInflow(b)).reduce((s,b)=>s+Math.abs(Number(b.amount||0)),0);
    return {totalInv,netV,totalOut,totalRcv,totalOS,totalSal,totalCN,activeEmp,colPct,bIn,bOut,bNet:bIn-bOut};
  },[fI,fP,fO,fC,fSal,fTeam,fBank]);

  // ── CHART DATA ─────────────────────────────────────────────────────────────

  // Invoice by month (scrollable for many months)
  const invByMonth = useMemo(()=>{
    const m={};
    fI.forEach(i=>{
      const k=toYYYYMM(i.impact_month)||toYYYYMM(i.invoice_date); if(!k)return;
      if(!m[k])m[k]={month:k,invoiceValue:0,vertoFee:0,gst:0,tds:0,cnAmount:0};
      m[k].invoiceValue+=Number(i.invoice_value||0);
      m[k].vertoFee+=Number(i.verto_fee||0);
      m[k].gst+=Number(i.gst||0);
      m[k].tds+=Number(i.tds||0);
    });
    fC.forEach(cn=>{
      const k=toYYYYMM(cn.issue_date); if(!k||!m[k])return;
      m[k].cnAmount+=Number(cn.amount||0);
      m[k].gst-=Number(cn.gst_cn||0);
      m[k].tds-=Number(cn.tds_cn||0);
    });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month))
      .map(d=>({...d,month:fmtMonth(d.month),netVerto:d.vertoFee-(fC.reduce((s,c)=>toYYYYMM(c.issue_date)===d.month?s+Number(c.verto_fee_cn||0):s,0))}));
  },[fI,fC]);

  // Revenue by client (with Top-N)
  const revByClientAll = useMemo(()=>{
    const m={};
    fI.forEach(i=>{
      const c=i.client_name;
      if(!m[c])m[c]={client:c,"Invoice Value":0,"Verto Fee":0,"Received":0,"CN Deducted":0};
      m[c]["Invoice Value"]+=Number(i.invoice_value||0);
      m[c]["Verto Fee"]+=Number(i.verto_fee||0);
    });
    fP.forEach(p=>{
      const c=p.client_name;
      if(!m[c])m[c]={client:c,"Invoice Value":0,"Verto Fee":0,"Received":0,"CN Deducted":0};
      m[c]["Received"]+=Number(p.amount_received||0);
    });
    fC.forEach(cn=>{
      const c=cn.client_name;
      if(!m[c])m[c]={client:c,"Invoice Value":0,"Verto Fee":0,"Received":0,"CN Deducted":0};
      m[c]["CN Deducted"]+=Number(cn.amount||0);
    });
    return Object.values(m).sort((a,b)=>b["Invoice Value"]-a["Invoice Value"]);
  },[fI,fP,fC]);

  const revByClient = useMemo(()=>topNClient===999?revByClientAll:revByClientAll.slice(0,topNClient),[revByClientAll,topNClient]);

  // Revenue by dept
  const revByDept = useMemo(()=>{
    const m={};
    fI.forEach(i=>{
      const d=i.dept_name;
      if(!m[d])m[d]={dept:d,invoiceValue:0,vertoFee:0,cnDeducted:0};
      m[d].invoiceValue+=Number(i.invoice_value||0);
      m[d].vertoFee+=Number(i.verto_fee||0);
    });
    fC.forEach(cn=>{
      const d=cn.dept_name;
      if(!m[d])m[d]={dept:d,invoiceValue:0,vertoFee:0,cnDeducted:0};
      m[d].cnDeducted+=Number(cn.amount||0);
    });
    return Object.values(m).sort((a,b)=>b.invoiceValue-a.invoiceValue)
      .slice(0,topNDept===999?undefined:topNDept);
  },[fI,fC,topNDept]);

  // Invoice status
  const invStatus = useMemo(()=>{
    const m={};fI.forEach(i=>{const s=i.status||"Unknown";m[s]=(m[s]||0)+1;});
    return Object.entries(m).map(([name,value])=>({name,value}));
  },[fI]);

  // Pay head donut
  const payHeadD = useMemo(()=>{
    const m={};fI.forEach(i=>{const ph=i.pay_head||"Other";m[ph]=(m[ph]||0)+Number(i.invoice_value||0);});
    return Object.entries(m).map(([name,value])=>({name,value}));
  },[fI]);

  // Collection per invoice (top-N)
  const collAll = useMemo(()=>{
    const rcvByInv={};
    fP.forEach(p=>{if(p.invoice_number)rcvByInv[p.invoice_number]=(rcvByInv[p.invoice_number]||0)+Number(p.amount_received||0);});
    return fI.map(i=>{
      const rcv=rcvByInv[i.invoice_number]??Number(i.amount_received||0);
      const pct=Number(i.invoice_value)>0?Math.min(100,Math.round((rcv/Number(i.invoice_value))*100)):0;
      return {invoice:i.invoice_number,"Invoice Value":Number(i.invoice_value||0),"Amount Received":rcv,"Collection %":pct};
    }).sort((a,b)=>b["Invoice Value"]-a["Invoice Value"]);
  },[fI,fP]);
  const coll = useMemo(()=>topNInvoice===999?collAll:collAll.slice(0,topNInvoice),[collAll,topNInvoice]);

  // Outstanding by client
  const outstandingBC = useMemo(()=>{
    const m={};
    fI.forEach(i=>{const o=Number(i.receivable_amount||0);if(o>0)m[i.client_name]=(m[i.client_name]||0)+o;});
    return Object.entries(m).map(([client,outstanding])=>({client,outstanding})).sort((a,b)=>b.outstanding-a.outstanding);
  },[fI]);

  // Payment trend
  const payTrend = useMemo(()=>{
    const m={};
    fP.forEach(p=>{const d=p.payment_date;if(!d)return;if(!m[d])m[d]={date:d,received:0};m[d].received+=Number(p.amount_received||0);});
    return Object.values(m).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({...d,date:fmtDate(d.date)}));
  },[fP]);

  // CN charts
  const cnByMonth = useMemo(()=>{
    const m={};
    fC.forEach(cn=>{
      const k=toYYYYMM(cn.issue_date);if(!k)return;
      if(!m[k])m[k]={month:k,total:0,vertoFee:0,gst:0,pay:0};
      m[k].total+=Number(cn.amount||0);
      m[k].vertoFee+=Number(cn.verto_fee_cn||0);
      m[k].gst+=Number(cn.gst_cn||0);
      m[k].pay+=Number(cn.pay_cn||0);
    });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).map(d=>({...d,month:fmtMonth(d.month)}));
  },[fC]);

  const cnByClient = useMemo(()=>{
    const m={};
    fC.forEach(cn=>{
      const c=cn.client_name;
      if(!m[c])m[c]={client:c,total:0,vertoFee:0,gst:0};
      m[c].total+=Number(cn.amount||0);
      m[c].vertoFee+=Number(cn.verto_fee_cn||0);
      m[c].gst+=Number(cn.gst_cn||0);
    });
    return Object.values(m).sort((a,b)=>b.total-a.total);
  },[fC]);

  // OS charts
  const osByMonth = useMemo(()=>{
    const m={};
    fO.forEach(o=>{
      const k=o.effective_month;if(!k)return;
      if(!m[k])m[k]={month:k,amountPaid:0,employeeCount:0};
      m[k].amountPaid+=Number(o.amount_paid||0);
      m[k].employeeCount+=Number(o.employee_count||0);
    });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).map(d=>({...d,month:fmtMonth(d.month)}));
  },[fO]);

  const osByClientAll = useMemo(()=>{
    const m={};
    fO.forEach(o=>{
      const c=o.client_name;
      if(!m[c])m[c]={client:c,amountPaid:0,employeeCount:0};
      m[c].amountPaid+=Number(o.amount_paid||0);
      m[c].employeeCount+=Number(o.employee_count||0);
    });
    return Object.values(m).sort((a,b)=>b.amountPaid-a.amountPaid);
  },[fO]);

  const osBillable = useMemo(()=>{
    let b=0,nb=0;fO.forEach(o=>{if(o.is_billable)b+=Number(o.amount_paid||0);else nb+=Number(o.amount_paid||0);});
    return [{name:"Billable",value:b},{name:"Non-Billable",value:nb}].filter(d=>d.value>0);
  },[fO]);

  // Salary charts
  const salByMonth = useMemo(()=>{
    const m={};
    fSal.forEach(s=>{
      const k=toYYYYMM(s.month_of_pay);if(!k)return;
      if(!m[k])m[k]={month:k,salary:0,count:0};
      m[k].salary+=Number(s.net_payment||0);m[k].count+=1;
    });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).map(d=>({...d,month:fmtMonth(d.month)}));
  },[fSal]);

  const salByDeptAll = useMemo(()=>{
    const m={};
    fSal.forEach(s=>{
      const d=s.dept_name;
      if(!m[d])m[d]={dept:d,salary:0,count:0};
      m[d].salary+=Number(s.net_payment||0);m[d].count+=1;
    });
    return Object.values(m).sort((a,b)=>b.salary-a.salary);
  },[fSal]);
  const salByDept = useMemo(()=>topNSalary===999?salByDeptAll:salByDeptAll.slice(0,topNSalary),[salByDeptAll,topNSalary]);

  const salPayHead = useMemo(()=>{
    const m={};fSal.forEach(s=>{const ph=s.pay_head||"Other";m[ph]=(m[ph]||0)+Number(s.net_payment||0);});
    return Object.entries(m).map(([name,value])=>({name,value}));
  },[fSal]);

  // Team charts
  const teamByDeptAll = useMemo(()=>{
    const m={};
    fTeam.forEach(t=>{
      const d=TEAM_DEPT_MAP[t.department]||t.department||"Unknown";
      if(!m[d])m[d]={dept:d,count:0,ctc:0,active:0};
      m[d].count+=1;m[d].ctc+=Number(t.ctc||0);
      if(t.status==="Active")m[d].active+=1;
    });
    return Object.values(m).sort((a,b)=>b.count-a.count);
  },[fTeam]);
  const teamByDept = useMemo(()=>topNTeam===999?teamByDeptAll:teamByDeptAll.slice(0,topNTeam),[teamByDeptAll,topNTeam]);

  const teamStatus = useMemo(()=>{
    const m={};fTeam.forEach(t=>{const s=t.status||"Unknown";m[s]=(m[s]||0)+1;});
    return Object.entries(m).map(([name,value])=>({name,value}));
  },[fTeam]);

  const designations = useMemo(()=>{
    const m={};fTeam.forEach(t=>{if(!t.designation)return;m[t.designation]=(m[t.designation]||0)+1;});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([name,count])=>({name,count}));
  },[fTeam]);

  const locationDist = useMemo(()=>{
    const m={};fTeam.forEach(t=>{if(!t.location)return;m[t.location]=(m[t.location]||0)+1;});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([name,count])=>({name,count}));
  },[fTeam]);

  const ctcHist = useMemo(()=>{
    const buckets=[{l:"< 20K",min:0,max:20000},{l:"20–30K",min:20000,max:30000},
      {l:"30–50K",min:30000,max:50000},{l:"50–75K",min:50000,max:75000},{l:"75K+",min:75000,max:Infinity}];
    return buckets.map(b=>({range:b.l,count:fTeam.filter(t=>{const c=Number(t.ctc||0);return c>=b.min&&c<b.max;}).length}));
  },[fTeam]);

  // Bank/Cash flow
  const bankFlow = useMemo(()=>{
    const m={};
    fBank.forEach(b=>{
      const d=b.date;if(!d)return;
      if(!m[d])m[d]={date:d,Inflow:0,Outflow:0};
      const amt=Math.abs(Number(b.amount||0));
      if(isBankInflow(b))m[d].Inflow+=amt;else m[d].Outflow+=amt;
    });
    return Object.values(m).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({...d,date:fmtDate(d.date)}));
  },[fBank]);

  const swFlow = useMemo(()=>{
    const m={};
    fSw.forEach(s=>{
      const d=s.date;if(!d)return;
      if(!m[d])m[d]={date:d,Inflow:0,Outflow:0};
      const amt=Math.abs(Number(s.amount||0));
      if(isSoftwareInflow(s))m[d].Inflow+=amt;else m[d].Outflow+=amt;
    });
    return Object.values(m).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({...d,date:fmtDate(d.date)}));
  },[fSw]);

  const cashBySource = useMemo(()=>{
    const SL={payments_received:"Payment In",os_payouts:"OS Payout",employee_expense_payouts:"Salary",statutory_payments:"Statutory"};
    const m={};
    [...fBank].forEach(b=>{
      const src=SL[b.source_table]||b.source_table||"Other";
      if(!m[src])m[src]={source:src,Inflow:0,Outflow:0};
      const amt=Math.abs(Number(b.amount||0));
      if(isBankInflow(b))m[src].Inflow+=amt;else m[src].Outflow+=amt;
    });
    [...fSw].forEach(s=>{
      const src=SL[s.source_table]||s.source_table||"Software";
      if(!m[src])m[src]={source:src,Inflow:0,Outflow:0};
      const amt=Math.abs(Number(s.amount||0));
      if(isSoftwareInflow(s))m[src].Inflow+=amt;else m[src].Outflow+=amt;
    });
    return Object.values(m).filter(d=>d.Inflow>0||d.Outflow>0);
  },[fBank,fSw]);

  const statByInv = useMemo(()=>fI
    .filter(i=>Number(i.co_pf||0)+Number(i.co_esi||0)+Number(i.lwf_tax||0)+Number(i.pt_tax||0)>0)
    .map(i=>({invoice:i.invoice_number,"Co. PF":Number(i.co_pf||0),"Co. ESI":Number(i.co_esi||0),"LWF":Number(i.lwf_tax||0),"PT":Number(i.pt_tax||0)}))
  ,[fI]);

  // Inv breakdown
  const invBreakdown = useMemo(()=>
    fI.map(i=>({invoice:i.invoice_number,"Invoice Value":Number(i.invoice_value||0),"Gross Value":Number(i.gross_value||0),"Net in Hand":Number(i.net_in_hand||0)}))
  ,[fI]);

  // Filter options
  const clientOpts   = clients.map(c=>({value:c.client_name,label:c.client_name}));
  const entityOpts   = entities.map(e=>({value:e.entity_name,label:e.entity_name}));
  const deptOpts     = departments.map(d=>({value:d.dept_name,label:d.dept_name}));
  const statusOpts   = [...new Set(invoices.map(i=>i.status).filter(Boolean))].map(s=>({value:s,label:s}));
  const payHOpts     = [...new Set([...invoices.map(i=>i.pay_head),...salaries.map(s=>s.pay_head)].filter(Boolean))].map(p=>({value:p,label:p}));
  const impMonthOpts = [...new Set(invoices.map(i=>toYYYYMM(i.impact_month)).filter(Boolean))].sort().reverse().map(m=>({value:m,label:fmtMonth(m)}));

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center animate-pulse">
          <BarChart2 className="w-5 h-5 text-white"/>
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading analytics…</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-10">
      {modal&&(
        <Modal title={modal.title} subtitle={modal.subtitle} onClose={()=>setModal(null)}>
          {modal.content}
        </Modal>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Live · Supabase
            {lastFetched&&` · ${lastFetched.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`}
            {AFC>0&&<span className="ml-2 text-slate-500 font-semibold">{AFC} filter{AFC>1?"s":""} active</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FYSelector startYear={fyStartYear} onChange={setFyStartYear}/>
          <button onClick={()=>setFO(v=>!v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${filtersOpen?"bg-slate-700 text-white border-slate-700":"bg-white text-gray-600 border-gray-200 hover:border-slate-300"}`}>
            <SlidersHorizontal className="w-3.5 h-3.5"/> Filters
            {AFC>0&&<span className="w-4 h-4 rounded-full bg-white text-slate-700 text-[10px] font-black flex items-center justify-center">{AFC}</span>}
          </button>
          <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:border-slate-300 transition-all">
            <RefreshCw className="w-3.5 h-3.5"/> Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      {filtersOpen&&(
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-3.5 h-3.5"/> Filters
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400">
                Date range defaults to <span className="font-semibold text-gray-600">{fy.label}</span> unless overridden below
              </span>
              {AFC>0&&<button onClick={clearF} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-semibold">
                <X className="w-3 h-3"/> Clear all ({AFC})
              </button>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={e=>setF("dateFrom",e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-slate-400"/>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date To</label>
              <input type="date" value={filters.dateTo} onChange={e=>setF("dateTo",e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-slate-400"/>
            </div>
            <FS label="Impact Month"   value={filters.impactMonth} onChange={v=>setF("impactMonth",v)} options={impMonthOpts}/>
            <FS label="Department"     value={filters.department}  onChange={v=>setF("department",v)}  options={deptOpts}/>
            <FS label="Client"         value={filters.client}      onChange={v=>setF("client",v)}      options={clientOpts}/>
            <FS label="Entity"         value={filters.entity}      onChange={v=>setF("entity",v)}      options={entityOpts}/>
            <FS label="Invoice Status" value={filters.status}      onChange={v=>setF("status",v)}      options={statusOpts}/>
            <FS label="Pay Head"       value={filters.payHead}     onChange={v=>setF("payHead",v)}     options={payHOpts}/>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice #</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300"/>
                <input type="text" value={filters.invoiceNumber} onChange={e=>setF("invoiceNumber",e.target.value)} placeholder="Search…"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-slate-400"/>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Employee</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300"/>
                <input type="text" value={filters.employee} onChange={e=>setF("employee",e.target.value)} placeholder="Search…"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:border-slate-400"/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Invoice Value" value={fmt(kpis.totalInv)}    sub={`${fI.length} invoices`}                                               icon={FileText}  color={P.blue}/>
        <KpiCard label="Net Verto Fee"       value={fmt(kpis.netV)}         sub="After CN deductions"                                                   icon={TrendingUp} color={P.indigo}/>
        <KpiCard label="Total Collected"     value={fmt(kpis.totalRcv)}    sub={`${kpis.colPct}% collection rate`}                                      icon={DollarSign} color={P.emerald}/>
        <KpiCard label="Outstanding"         value={fmt(kpis.totalOut)}    sub={outstandingBC.length>0?`${outstandingBC.length} clients pending`:"All cleared ✓"} icon={Activity} color={kpis.totalOut>0?P.amber:P.emerald} alert={kpis.totalOut>0}/>
        <KpiCard label="Credit Notes Total"  value={fmt(kpis.totalCN)}     sub={`${fC.length} CN entries`}                                              icon={FileX}     color={P.rose}/>
        <KpiCard label="OS Payout"           value={fmt(kpis.totalOS)}     sub={`${fO.length} payouts`}                                                 icon={Wallet}    color={P.orange}/>
        <KpiCard label="Salary Paid"         value={fmt(kpis.totalSal)}    sub={`${fSal.length} entries`}                                               icon={CreditCard} color={P.violet}/>
        <KpiCard label="Active Employees"    value={kpis.activeEmp}        sub="Internal team"                                                          icon={Users}     color={P.teal}/>
      </div>

      {/* ══ SECTION 1: REVENUE ══ */}
      <SH icon={TrendingUp} title="Revenue & Invoicing" color={P.blue} count={`${fI.length} invoices`}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Invoice by month — scrollable for many months */}
        <ChartCard title="Invoice Value by Month" subtitle={`${invByMonth.length} months · scroll if needed`}
          scrollable minScrollWidth={Math.max(500,invByMonth.length*80)}
          expandable onExpand={()=>setModal({
            title:"Invoice Value by Month",subtitle:"All months — full width view",
            content:<HScrollBar data={invByMonth} xKey="month" barWidth={60}
              bars={[{key:"invoiceValue",name:"Invoice Value",color:P.blue},{key:"netVerto",name:"Net Verto Fee",color:P.indigo}]}
              height={380}/>
          })}>
          <HScrollBar data={invByMonth} xKey="month" barWidth={50}
            bars={[{key:"invoiceValue",name:"Invoice Value",color:P.blue},{key:"netVerto",name:"Net Verto Fee",color:P.indigo}]}
            height={220}/>
        </ChartCard>

        {/* Invoice status donut */}
        <ChartCard title="Invoice Status" subtitle="Distribution by status">
          {invStatus.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={invStatus} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90} paddingAngle={3}
                  label={({name,value,percent})=>`${name}: ${value} (${(percent*100).toFixed(0)}%)`} labelLine={false}>
                  {invStatus.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                </Pie>
                <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10}}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Revenue by client — vertical scrollable with Top-N */}
        <ChartCard title="Revenue by Client" subtitle={`${revByClientAll.length} clients total`}
          topN={topNClient} onTopN={setTopNClient} topNOptions={[5,10,20,999]}
          expandable onExpand={()=>setModal({
            title:"Revenue by Client — All Clients",
            subtitle:`${revByClientAll.length} clients`,
            content:(
              <div className="space-y-6">
                {[{k:"Invoice Value",c:P.blue},{k:"Received",c:P.emerald},{k:"CN Deducted",c:P.rose}].map(({k,c})=>(
                  <div key={k}>
                    <p className="text-xs font-bold text-gray-500 mb-2">{k}</p>
                    <VScrollBar data={revByClientAll} dataKey={k} nameKey="client" color={c} height={Math.min(600,revByClientAll.length*40+20)}/>
                  </div>
                ))}
              </div>
            )
          })}>
          <VScrollBar data={revByClient} dataKey="Invoice Value" nameKey="client" color={P.blue} height={Math.min(360,revByClient.length*40+20)}/>
        </ChartCard>

        {/* Revenue by dept */}
        <ChartCard title="Revenue by Department" subtitle="Invoice value & CN deducted">
          {revByDept.length===0?<Empty/>:(
            <VScrollBar data={revByDept} dataKey="invoiceValue" nameKey="dept" color={P.indigo} height={Math.min(320,revByDept.length*44+20)}/>
          )}
        </ChartCard>

        {/* Pay head donut */}
        <ChartCard title="Pay Head Distribution" subtitle="Invoice value by pay head">
          {payHeadD.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={payHeadD} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={90} paddingAngle={3}
                  label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                  {payHeadD.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* GST & TDS net */}
        <ChartCard title="GST & TDS by Month (Net after CN)" subtitle="Scroll for many months"
          scrollable minScrollWidth={Math.max(400,invByMonth.length*80)}>
          <HScrollBar data={invByMonth} xKey="month" barWidth={40}
            bars={[{key:"gst",name:"Net GST",color:P.amber},{key:"tds",name:"Net TDS",color:P.rose}]} height={220}/>
        </ChartCard>
      </div>

      {/* Invoice breakdown — full width scrollable */}
      {invBreakdown.length>0&&(
        <ChartCard title="Invoice Value vs Gross vs Net-in-Hand" subtitle={`${invBreakdown.length} invoices · scroll horizontally`}
          scrollable minScrollWidth={Math.max(500,invBreakdown.length*120)}>
          <HScrollBar data={invBreakdown} xKey="invoice" barWidth={36}
            bars={[{key:"Invoice Value",color:P.blue},{key:"Gross Value",color:P.indigo},{key:"Net in Hand",color:P.emerald}]} height={240}/>
        </ChartCard>
      )}

      {/* ══ SECTION 2: CREDIT NOTES ══ */}
      {(fC.length>0||creditNotes.length>0)&&(
        <>
          <SH icon={FileX} title="Credit Notes & Bad Debt" color={P.rose} count={`${fC.length} entries`}/>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="CN Amount by Month" subtitle="Total credit note value raised">
              {cnByMonth.length===0?<Empty msg="No credit notes in selected range"/>:(
                <HScrollBar data={cnByMonth} xKey="month" barWidth={50}
                  bars={[{key:"total",name:"Total CN",color:P.rose},{key:"vertoFee",name:"Verto Fee CN",color:P.orange},{key:"gst",name:"GST CN",color:P.amber}]} height={220}/>
              )}
            </ChartCard>
            <ChartCard title="CN by Client" subtitle="Credit note impact per client">
              {cnByClient.length===0?<Empty msg="No credit notes in selected range"/>:(
                <VScrollBar data={cnByClient} dataKey="total" nameKey="client" color={P.rose} height={Math.min(280,cnByClient.length*44+20)}/>
              )}
            </ChartCard>
          </div>
        </>
      )}

      {/* ══ SECTION 3: COLLECTIONS ══ */}
      <SH icon={DollarSign} title="Collections" color={P.emerald}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Collection per invoice — scrollable + Top-N */}
        <ChartCard title="Invoice vs Collected" subtitle={`${collAll.length} invoices`}
          topN={topNInvoice} onTopN={setTopNInvoice} topNOptions={[5,10,20,999]}
          scrollable minScrollWidth={Math.max(400,coll.length*100)}>
          <HScrollBar data={coll} xKey="invoice" barWidth={40}
            bars={[{key:"Invoice Value",color:P.blue},{key:"Amount Received",color:P.emerald}]} height={220}/>
        </ChartCard>

        {/* Collection % per invoice */}
        <ChartCard title="Collection Rate %" subtitle="% of invoice value collected"
          topN={topNInvoice} onTopN={setTopNInvoice} topNOptions={[5,10,20,999]}
          scrollable minScrollWidth={Math.max(400,coll.length*80)}>
          <div className="overflow-x-auto pb-1">
            <div style={{minWidth:Math.max(400,coll.length*80)}}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={coll} margin={{top:5,right:10,left:0,bottom:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="invoice" tick={{fontSize:9}} angle={coll.length>6?-20:0} textAnchor={coll.length>6?"end":"middle"}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`${v}%`} domain={[0,100]}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="Collection %" fill={P.teal} radius={[4,4,0,0]}>
                    <LabelList dataKey="Collection %" position="top" formatter={v=>`${v}%`} style={{fontSize:9,fill:P.teal}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        {/* Payments trend with brush */}
        <ChartCard title="Payments Received Trend" subtitle={payTrend.length>12?"Drag the brush below to zoom":"Daily collection amounts"}>
          {payTrend.length===0?<Empty/>:(
            <BrushArea data={payTrend} xKey="date" lines={[{key:"received",name:"Received",color:P.emerald}]} height={240}/>
          )}
        </ChartCard>

        {/* Outstanding */}
        <ChartCard title="Outstanding by Client" subtitle="Remaining receivable"
          expandable onExpand={()=>setModal({title:"Outstanding by Client",subtitle:`${outstandingBC.length} clients`,
            content:<VScrollBar data={outstandingBC} dataKey="outstanding" nameKey="client" color={P.amber} height={Math.min(700,outstandingBC.length*44+20)}/>
          })}>
          {outstandingBC.length===0?(
            <div className="flex flex-col items-center justify-center py-10 text-emerald-500">
              <DollarSign className="w-8 h-8 mb-2"/>
              <p className="text-xs font-semibold">No outstanding amounts 🎉</p>
            </div>
          ):(
            <VScrollBar data={outstandingBC} dataKey="outstanding" nameKey="client" color={P.amber} height={Math.min(280,outstandingBC.length*44+20)}/>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 4: OS PAYOUTS ══ */}
      <SH icon={Wallet} title="OS Payouts" color={P.orange} count={`${fO.length} payouts`}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="OS Payout by Month" subtitle="Amount paid per month (uses payment_date)"
          scrollable minScrollWidth={Math.max(400,osByMonth.length*80)}>
          {osByMonth.length===0?<Empty msg="No OS payout data"/>:(
            <HScrollBar data={osByMonth} xKey="month" barWidth={50}
              bars={[{key:"amountPaid",name:"Amount Paid",color:P.orange}]} height={220}/>
          )}
        </ChartCard>

        <ChartCard title="OS Employee Count by Month" subtitle="Headcount deployed per month">
          {osByMonth.length===0?<Empty/>:(
            <BrushArea data={osByMonth} xKey="month" lines={[{key:"employeeCount",name:"Employee Count",color:P.amber}]} height={220}/>
          )}
        </ChartCard>

        <ChartCard title="OS Payout by Client" subtitle={`${osByClientAll.length} clients`}>
          {osByClientAll.length===0?<Empty/>:(
            <VScrollBar data={osByClientAll} dataKey="amountPaid" nameKey="client" color={P.orange} height={Math.min(320,osByClientAll.length*44+20)}/>
          )}
        </ChartCard>

        <ChartCard title="Billable vs Non-Billable" subtitle="OS payout split">
          {osBillable.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={osBillable} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90} paddingAngle={3}
                  label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {osBillable.map((_,i)=><Cell key={i} fill={i===0?P.orange:P.sky}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 5: SALARY ══ */}
      <SH icon={CreditCard} title="Internal Salary" color={P.violet} count={`${fSal.length} entries`}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Salary Paid by Month" subtitle="Net salary outflow with brush to zoom">
          {salByMonth.length===0?<Empty/>:(
            <BrushArea data={salByMonth} xKey="month" lines={[{key:"salary",name:"Net Salary",color:P.violet}]} height={240}/>
          )}
        </ChartCard>

        <ChartCard title="Salary by Department" subtitle="Falls back to internal_team dept via emp_code"
          topN={topNSalary} onTopN={setTopNSalary} topNOptions={[5,10,999]}>
          {salByDept.length===0?<Empty/>:(
            <VScrollBar data={salByDept} dataKey="salary" nameKey="dept" color={P.violet} height={Math.min(280,salByDept.length*44+20)}/>
          )}
        </ChartCard>

        <ChartCard title="Salary Pay Head Split" subtitle="Distribution by pay head">
          {salPayHead.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={salPayHead} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90} paddingAngle={3}
                  label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {salPayHead.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top earners table */}
        <ChartCard title="Top Earners (This Period)" subtitle="By net_payment across filtered salary entries">
          {fSal.length===0?<Empty/>:(()=>{
            const top=[...fSal].sort((a,b)=>Number(b.net_payment||0)-Number(a.net_payment||0)).slice(0,10);
            return(
              <div className="overflow-auto max-h-[260px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b border-gray-100">
                    <tr>
                      <th className="text-left py-2 pr-3 text-gray-400 font-semibold">Employee</th>
                      <th className="text-left py-2 pr-3 text-gray-400 font-semibold">Dept</th>
                      <th className="text-right py-2 text-gray-400 font-semibold">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {top.map((s,i)=>(
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800 truncate max-w-[130px]">{s.employee_name||"—"}</td>
                        <td className="py-2 pr-3 text-gray-500 truncate">{s.dept_name}</td>
                        <td className="py-2 text-right font-semibold text-gray-800">{fmt(s.net_payment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </ChartCard>
      </div>

      {/* ══ SECTION 6: INTERNAL TEAM ══ */}
      <SH icon={Users} title="Internal Team" color={P.teal} count={`${fTeam.length} employees`}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Headcount by Department" subtitle="Active / total per department">
          {teamByDept.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={Math.min(280,teamByDept.length*52+20)}>
              <BarChart data={teamByDept} layout="vertical" margin={{top:4,right:50,left:8,bottom:4}} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/>
                <YAxis dataKey="dept" type="category" tick={{fontSize:10}} width={120}/>
                <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10}}/>
                <Bar dataKey="active" name="Active" fill={P.emerald} radius={[0,4,4,0]} stackId="a"/>
                <Bar dataKey="count" name="Total" fill={P.teal} radius={[0,4,4,0]} opacity={0.35} stackId="b">
                  <LabelList dataKey="count" position="right" style={{fontSize:9,fill:P.teal}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Total CTC by Department" subtitle="Monthly salary burden">
          {teamByDept.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={Math.min(280,teamByDept.length*52+20)}>
              <BarChart data={teamByDept} layout="vertical" margin={{top:4,right:70,left:8,bottom:4}} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:10}} tickFormatter={fmt}/>
                <YAxis dataKey="dept" type="category" tick={{fontSize:10}} width={120}/>
                <Tooltip content={<CT/>}/>
                <Bar dataKey="ctc" name="Total CTC" fill={P.indigo} radius={[0,4,4,0]}>
                  <LabelList dataKey="ctc" position="right" formatter={fmt} style={{fontSize:9,fill:P.indigo}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Employee Status" subtitle="Active vs inactive breakdown">
          {teamStatus.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={teamStatus} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90} paddingAngle={3}
                  label={({name,value,percent})=>`${name}: ${value} (${(percent*100).toFixed(0)}%)`} labelLine={false}>
                  {teamStatus.map((d,i)=><Cell key={i} fill={d.name==="Active"?P.emerald:P.rose}/>)}
                </Pie>
                <Tooltip content={<CT/>}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Location — scrollable for large cities list */}
        <ChartCard title="Employee Location" subtitle={`${locationDist.length} cities`}
          expandable onExpand={()=>setModal({title:"Employee Location Distribution",subtitle:`${locationDist.length} cities`,
            content:<VScrollBar data={locationDist} dataKey="count" nameKey="name" color={P.sky} height={Math.min(700,locationDist.length*44+20)}/>
          })}>
          <VScrollBar data={locationDist.slice(0,10)} dataKey="count" nameKey="name" color={P.sky} height={Math.min(280,Math.min(10,locationDist.length)*40+20)}/>
        </ChartCard>

        {/* Designations — scrollable */}
        <ChartCard title="Designation Distribution" subtitle={`${designations.length} unique designations`}
          expandable onExpand={()=>setModal({title:"All Designations",subtitle:`${designations.length} designations`,
            content:<VScrollBar data={designations} dataKey="count" nameKey="name" color={P.pink} height={Math.min(700,designations.length*44+20)}/>
          })}>
          <VScrollBar data={designations.slice(0,10)} dataKey="count" nameKey="name" color={P.pink} height={Math.min(280,Math.min(10,designations.length)*40+20)}/>
        </ChartCard>

        {/* CTC histogram */}
        <ChartCard title="CTC Range Distribution" subtitle="Salary bands across team">
          {ctcHist.every(d=>d.count===0)?<Empty/>:(
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ctcHist} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="range" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} allowDecimals={false}/>
                <Tooltip content={<CT/>}/>
                <Bar dataKey="count" name="Employees" radius={[4,4,0,0]}>
                  {ctcHist.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                  <LabelList dataKey="count" position="top" style={{fontSize:10,fontWeight:700}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Headcount trend by joining month */}
        <ChartCard title="Joining Trend" subtitle="Cumulative headcount growth by DOJ month"
          className="lg:col-span-2">
          {(()=>{
            const m={};
            [...fTeam].sort((a,b)=>(a.doj||"").localeCompare(b.doj||"")).forEach(t=>{
              const k=toYYYYMM(t.doj);if(!k)return;
              m[k]=(m[k]||0)+1;
            });
            let running=0;
            const data=Object.entries(m).sort(([a],[b])=>a.localeCompare(b))
              .map(([k,v])=>{running+=v;return{month:fmtMonth(k),joined:v,total:running};});
            return data.length===0?<Empty msg="No DOJ data"/>:(
              <BrushArea data={data} xKey="month"
                lines={[{key:"joined",name:"Joined",color:P.teal},{key:"total",name:"Cumulative",color:P.indigo}]} height={220}/>
            );
          })()}
        </ChartCard>
      </div>

      {/* ══ SECTION 7: CASH FLOW ══ */}
      <SH icon={Activity} title="Cash Flow — Bank & Software" color={P.sky}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard title="Bank Inflow vs Outflow" subtitle="Scroll/brush to navigate dates">
          {bankFlow.length===0?<Empty/>:(
            <BrushArea data={bankFlow} xKey="date" lines={[{key:"Inflow",color:P.emerald},{key:"Outflow",color:P.rose}]} height={240}/>
          )}
        </ChartCard>

        <ChartCard title="Software Balance Flow" subtitle="Scroll/brush to navigate">
          {swFlow.length===0?<Empty msg="No software entry data"/>:(
            <BrushArea data={swFlow} xKey="date" lines={[{key:"Inflow",color:P.sky},{key:"Outflow",color:P.amber}]} height={240}/>
          )}
        </ChartCard>

        <ChartCard title="Cash Flow by Source" subtitle="All entries grouped by transaction type" className="lg:col-span-2">
          {cashBySource.length===0?<Empty/>:(
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cashBySource} margin={{top:5,right:10,left:0,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="source" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={fmt}/>
                <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10}}/>
                <Bar dataKey="Inflow" fill={P.emerald} radius={[4,4,0,0]}/>
                <Bar dataKey="Outflow" fill={P.rose} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ══ SECTION 8: STATUTORY ══ */}
      {statByInv.length>0&&(
        <>
          <SH icon={FileText} title="Statutory Deductions" color={P.rose}/>
          <ChartCard title="PF + ESI + LWF + PT per Invoice" subtitle="Scroll for many invoices"
            scrollable minScrollWidth={Math.max(500,statByInv.length*100)}>
            <HScrollBar data={statByInv} xKey="invoice" barWidth={22}
              bars={[{key:"Co. PF",color:P.indigo},{key:"Co. ESI",color:P.sky},{key:"LWF",color:P.amber},{key:"PT",color:P.rose}]} height={240}/>
          </ChartCard>
        </>
      )}

      <div className="text-center py-4 text-[11px] text-gray-300">
        Analytics · {fy.label} · {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}
      </div>
    </div>
  );
}