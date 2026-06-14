// ── Invoice Export Utilities ────────────────────────────────────────────────
// 1. exportInvoiceLedgerXlsx  — full ledger Excel with all related transactions
// 2. exportInvoicePDF         — branded Verto invoice PDF (print-to-PDF via hidden iframe)
// Both are pure frontend — no server calls, no extra deps beyond SheetJS (xlsx)
// which is already available: import * as XLSX from 'xlsx'
// ────────────────────────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "./auditLog";

const INR = (val) =>
  `₹ ${Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt)
    ? d
    : dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

// ── 1. EXCEL LEDGER EXPORT ───────────────────────────────────────────────────
// invoiceData  : the full invoice object (all columns from DB)
// ledgerRows   : already-computed ledger array from LedgerPage state
// osPayouts    : raw OS payout rows
// paymentsRaw  : raw payments_received rows (optional, for extra sheet)
// cnsRaw       : raw credit_note_bad_debt rows
// bbRaw        : raw bounce_back rows
export function exportInvoiceLedgerXlsx({
  invoiceData,
  ledgerRows,
  osPayouts = [],
  paymentsRaw = [],
  cnsRaw = [],
  bbRaw = [],
}) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Invoice Summary ────────────────────────────────────────────
  const summaryData = [
    ["INVOICE SUMMARY — VERTO FINANCIAL SUITE", ""],
    ["", ""],
    ["Invoice Number", invoiceData.invoice_number || invoiceData.id || ""],
    ["Client", invoiceData.client_name || ""],
    ["Entity", invoiceData.entity_name || ""],
    ["Department", invoiceData.dept_name || ""],
    ["Pay Head", invoiceData.pay_head || ""],
    ["Invoice Date", fmtDate(invoiceData.invoice_date)],
    ["Impact Month", fmtDate(invoiceData.impact_month)],
    ["Month of Payout", invoiceData.month_of_payout || ""],
    ["Status", invoiceData.status || ""],
    ["Employee Count", invoiceData.employee_count || 0],
    ["", ""],
    ["— INVOICE BREAKDOWN —", ""],
    ["Verto Fee", Number(invoiceData.verto_fee || 0)],
    ["GST", Number(invoiceData.gst || 0)],
    ["Invoice Value (Total)", Number(invoiceData.invoice_value || 0)],
    ["TDS", Number(invoiceData.tds || 0)],
    ["Receivable Amount", Number(invoiceData.receivable_amount || 0)],
    ["Amount Received", Number(invoiceData.amount_received || 0)],
    ["CN / Bad Debt", Number(invoiceData.cn_amount || 0)],
    ["", ""],
    ["— PAYROLL BREAKDOWN —", ""],
    ["Gross Value", Number(invoiceData.gross_value || 0)],
    ["Net In Hand", Number(invoiceData.net_in_hand || 0)],
    ["Co. PF", Number(invoiceData.co_pf || 0)],
    ["Co. ESI", Number(invoiceData.co_esi || 0)],
    ["LWF Tax", Number(invoiceData.lwf_tax || 0)],
    ["PT Tax", Number(invoiceData.pt_tax || 0)],
    ["Other Deductions", Number(invoiceData.other_ded || 0)],
    ["CTC", Number(invoiceData.ctc || 0)],
    ["", ""],
    ["Expected Collection Date", fmtDate(invoiceData.expected_collection_date)],
    ["Expected Outflow — In Hand", fmtDate(invoiceData.expected_outflow_in_hand)],
    ["Expected Outflow — PF", fmtDate(invoiceData.expected_outflow_pf)],
    ["Expected Outflow — ESI", fmtDate(invoiceData.expected_outflow_esi)],
    ["Expected Outflow — GST", fmtDate(invoiceData.expected_outflow_gst)],
    ["Expected Outflow — Tax", fmtDate(invoiceData.expected_outflow_tax)],
    ["Statutory Payout Date", fmtDate(invoiceData.statutory_payout_date)],
    ["Verto Fee Payout Date", fmtDate(invoiceData.verto_fee_payout_date)],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 32 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Invoice Summary");

  // ── Sheet 2: Full Ledger ─────────────────────────────────────────────────
  const ledgerHeader = [
    "Date",
    "Transaction Type",
    "Reference / Ref No",
    "Remarks",
    "Debit (↓)",
    "Credit (↑)",
    "Balance",
  ];
  const ledgerRows2 = (ledgerRows || []).map((row) => {
    const isCredit = row.amount < 0; // payments received are negative (reduce outstanding)
    return [
      fmtDate(row.date),
      row.type || "",
      row.ref || "",
      row.remarks || "",
      isCredit ? "" : Math.abs(row.amount),   // Debit = adds to balance (OS payout, CN, BB)
      isCredit ? Math.abs(row.amount) : "",   // Credit = reduces balance (payment received)
      Number(row.balance || 0),
    ];
  });

  const wsLedger = XLSX.utils.aoa_to_sheet([ledgerHeader, ...ledgerRows2]);
  wsLedger["!cols"] = [
    { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 40 },
    { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLedger, "Ledger");

  // ── Sheet 3: Payments Received ───────────────────────────────────────────
  if (paymentsRaw.length > 0) {
    const prHeader = [
      "Payment Date", "Amount Received", "Payment Ref", "Bank", "Remarks", "Recorded By",
    ];
    const prRows = paymentsRaw.map((p) => [
      fmtDate(p.payment_date),
      Number(p.amount_received || 0),
      p.payment_ref || "",
      p.bank_name || "",
      p.remarks || "",
      p.created_by_email || "",
    ]);
    const wsPR = XLSX.utils.aoa_to_sheet([prHeader, ...prRows]);
    wsPR["!cols"] = [
      { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 40 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPR, "Payments Received");
  }

  // ── Sheet 4: OS Payouts ──────────────────────────────────────────────────
  if (osPayouts.length > 0) {
    const osHeader = [
      "Payment Date", "Payout Month", "Ref No", "Pay Head", "Ledger Name",
      "Employee Count", "Amount Paid", "Bounce Back Amt", "Income Tax Ded",
      "Net Amount", "Billable?", "Bank", "Remarks", "Recorded By",
    ];
    const osRows = osPayouts.map((p) => {
      const bbAmt = Number(p.bounce_back_amount || 0);
      const itd = Number(p.income_tax_deducted || 0);
      const net = Math.max(Number(p.amount_paid || 0) - bbAmt - itd, 0);
      return [
        fmtDate(p.payment_date),
        fmtDate(p.payout_month),
        p.payout_ref_no || "",
        p.pay_head || "",
        p.ledger_name || "",
        p.employee_count || 0,
        Number(p.amount_paid || 0),
        bbAmt,
        itd,
        net,
        p.is_billable ? "Yes" : "No",
        p.bank_name || "",
        p.payment_details || p.remarks || "",
        p.created_by_email || "",
      ];
    });
    const wsOS = XLSX.utils.aoa_to_sheet([osHeader, ...osRows]);
    wsOS["!cols"] = [
      { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
      { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 10 }, { wch: 20 }, { wch: 35 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOS, "OS Payouts");
  }

  // ── Sheet 5: CN & Bad Debt ───────────────────────────────────────────────
  if (cnsRaw.length > 0) {
    const cnHeader = [
      "Issue Date", "Type", "Ref No", "Invoice No", "Amount",
      "Verto Fee CN", "GST CN", "TDS CN", "Pay CN",
      "ER PF", "EE PF", "ER ESIC", "EE ESIC",
      "LWF CN", "PT CN", "Other Ded CN",
      "Entity", "Bank", "Remarks", "Recorded By",
    ];
    const cnRows = cnsRaw.map((c) => [
      fmtDate(c.issue_date),
      c.type || "",
      c.reference_no || "",
      c.invoice_number || "",
      Number(c.amount || 0),
      Number(c.verto_fee_cn || 0),
      Number(c.gst_cn || 0),
      Number(c.tds_cn || 0),
      Number(c.pay_cn || 0),
      Number(c.er_pf || 0),
      Number(c.ee_pf || 0),
      Number(c.er_esic || 0),
      Number(c.ee_esic || 0),
      Number(c.lwf_cn || 0),
      Number(c.pt_cn || 0),
      Number(c.other_ded_cn || 0),
      c.entity || "",
      c.bank_name || "",
      c.remarks || "",
      c.created_by_email || "",
    ]);
    const wsCN = XLSX.utils.aoa_to_sheet([cnHeader, ...cnRows]);
    wsCN["!cols"] = Array(20).fill({ wch: 16 });
    XLSX.utils.book_append_sheet(wb, wsCN, "CN & Bad Debt");
  }

  // ── Sheet 6: Bounce Back ─────────────────────────────────────────────────
  if (bbRaw.length > 0) {
    const bbHeader = [
      "Bounce Date", "Amount", "Payment Ref", "Bank Details", "Remarks", "Recorded By",
    ];
    const bbRows = bbRaw.map((b) => [
      fmtDate(b.bounce_date),
      Number(b.amount || 0),
      b.payment_ref || "",
      b.bank_details || "",
      b.remarks || "",
      b.created_by_email || "",
    ]);
    const wsBB = XLSX.utils.aoa_to_sheet([bbHeader, ...bbRows]);
    wsBB["!cols"] = [
      { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBB, "Bounce Back");
  }

  // ── Download ─────────────────────────────────────────────────────────────
  const fileName = `Invoice_${invoiceData.invoice_number || invoiceData.id}_Ledger.xlsx`;
  XLSX.writeFile(wb, fileName);
  logExport({
    action:       EXPORT_ACTIONS.EXCEL,
    category:     "Invoice",
    description:  `Downloaded Invoice Ledger Excel — ${invoiceData.invoice_number || invoiceData.id}`,
    reference_no: invoiceData.invoice_number || null,
    client_name:  invoiceData.client_name    || null,
    amount:       invoiceData.invoice_value  || null,
    meta: { file: fileName, os_payouts: osPayouts.length, payments: paymentsRaw.length },
  });
}


// ── 2. PDF INVOICE (print-to-PDF via hidden iframe) ──────────────────────────
// invoiceData : full invoice object
// outstanding : current outstanding balance
// ledgerRows  : computed ledger array
export function exportInvoicePDF({ invoiceData, outstanding, ledgerRows = [] }) {
  const inv = invoiceData;
  const now = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const fmtNum = (v) =>
    Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const ledgerTable = ledgerRows.length
    ? `
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Reference</th><th>Remarks</th>
            <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${ledgerRows.map((r) => {
            const isCredit = r.amount < 0;
            return `<tr>
              <td>${fmtDate(r.date)}</td>
              <td><span class="badge badge-${r.type?.toLowerCase().replace(/[^a-z]/g, "-")}">${r.type || ""}</span></td>
              <td>${r.ref || "—"}</td>
              <td class="remarks">${r.remarks || "—"}</td>
              <td class="num">${!isCredit ? "₹ " + fmtNum(Math.abs(r.amount)) : ""}</td>
              <td class="num credit">${isCredit ? "₹ " + fmtNum(Math.abs(r.amount)) : ""}</td>
              <td class="num bal">₹ ${fmtNum(r.balance)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`
    : "<p class='no-data'>No ledger transactions recorded.</p>";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${inv.invoice_number || inv.id} — Verto</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; padding: 28px 32px; }
  
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
  .brand { display: flex; flex-direction: column; }
  .brand-name { font-size: 28px; font-weight: 900; letter-spacing: -0.04em; color: #2563eb; }
  .brand-sub { font-size: 9px; text-transform: uppercase; letter-spacing: 0.2em; color: #64748b; margin-top: 2px; }
  .doc-info { text-align: right; }
  .doc-title { font-size: 18px; font-weight: 700; color: #1e293b; }
  .doc-num { font-size: 13px; font-weight: 700; color: #2563eb; margin-top: 2px; }
  .doc-date { font-size: 10px; color: #64748b; margin-top: 4px; }

  /* Meta row */
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .meta-box { background: #f8faff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; font-weight: 600; margin-bottom: 3px; }
  .meta-val { font-size: 12px; font-weight: 700; color: #1e293b; }
  .meta-val.blue { color: #2563eb; }
  .badge-status { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .badge-status.paid { background: #ecfdf5; color: #059669; }
  .badge-status.pending { background: #fff7ed; color: #d97706; }
  .badge-status.partial { background: #eff6ff; color: #2563eb; }

  /* Financials */
  .financials { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .fin-section { background: #f8faff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
  .fin-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .fin-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
  .fin-row .label { color: #475569; font-size: 10.5px; }
  .fin-row .value { font-weight: 600; color: #1e293b; font-size: 10.5px; }
  .fin-row.total { border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 6px; }
  .fin-row.total .label { font-weight: 700; color: #1e293b; }
  .fin-row.total .value { font-weight: 800; color: #2563eb; font-size: 12px; }
  .fin-row.highlight .value { color: #059669; }
  .fin-row.debit .value { color: #dc2626; }

  /* Outstanding Banner */
  .outstanding { background: ${Number(outstanding || 0) <= 0 ? "#ecfdf5" : "#fff7ed"}; border: 2px solid ${Number(outstanding || 0) <= 0 ? "#6ee7b7" : "#fcd34d"}; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .outstanding-label { font-size: 12px; font-weight: 700; color: ${Number(outstanding || 0) <= 0 ? "#065f46" : "#92400e"}; }
  .outstanding-amount { font-size: 22px; font-weight: 900; color: ${Number(outstanding || 0) <= 0 ? "#059669" : "#d97706"}; }

  /* Ledger table */
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-bottom: 8px; padding-left: 2px; }
  .ledger-table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .ledger-table thead tr { background: #2563eb; }
  .ledger-table thead th { color: white; font-weight: 700; padding: 7px 8px; text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; }
  .ledger-table thead th.num { text-align: right; }
  .ledger-table tbody tr:nth-child(even) { background: #f8faff; }
  .ledger-table tbody tr:hover { background: #eff6ff; }
  .ledger-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .ledger-table td.num { text-align: right; font-family: 'Courier New', monospace; }
  .ledger-table td.credit { color: #059669; font-weight: 600; }
  .ledger-table td.bal { font-weight: 700; color: #1e293b; }
  .ledger-table td.remarks { color: #64748b; font-size: 9.5px; max-width: 200px; }
  .badge { font-size: 9px; padding: 1px 7px; border-radius: 20px; font-weight: 600; background: #eff6ff; color: #2563eb; white-space: nowrap; }

  /* Footer */
  .footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; }
  .footer .legal { max-width: 60%; line-height: 1.5; }
  .no-data { color: #94a3b8; font-style: italic; padding: 12px 0; }

  @media print {
    body { padding: 16px 20px; }
    @page { size: A4; margin: 12mm; }
    .ledger-table thead { display: table-header-group; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="brand">
    <span class="brand-name">VERTO</span>
    <span class="brand-sub">Financial Suite</span>
    <div style="margin-top:8px;font-size:10px;color:#64748b;">
      ${inv.entity_name || "Verto India Pvt Ltd"}
    </div>
  </div>
  <div class="doc-info">
    <div class="doc-title">Invoice Ledger</div>
    <div class="doc-num">${inv.invoice_number || inv.id}</div>
    <div class="doc-date">Generated: ${now}</div>
  </div>
</div>

<!-- Meta grid -->
<div class="meta-grid">
  <div class="meta-box">
    <div class="meta-label">Client</div>
    <div class="meta-val">${inv.client_name || "—"}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Department / Pay Head</div>
    <div class="meta-val">${inv.dept_name || ""}${inv.pay_head ? " · " + inv.pay_head : ""}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Status</div>
    <div class="meta-val">
      <span class="badge-status ${(inv.status || "").toLowerCase()}">${inv.status || "—"}</span>
    </div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Invoice Date</div>
    <div class="meta-val">${fmtDate(inv.invoice_date)}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Impact Month</div>
    <div class="meta-val">${fmtDate(inv.impact_month)}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Employee Count</div>
    <div class="meta-val blue">${inv.employee_count || 0}</div>
  </div>
</div>

<!-- Financials grid -->
<div class="financials">
  <!-- Invoice breakdown -->
  <div class="fin-section">
    <div class="fin-title">Invoice Breakdown</div>
    <div class="fin-row"><span class="label">Verto Fee</span><span class="value">₹ ${fmtNum(inv.verto_fee)}</span></div>
    <div class="fin-row"><span class="label">GST (18%)</span><span class="value">₹ ${fmtNum(inv.gst)}</span></div>
    <div class="fin-row total"><span class="label">Invoice Value</span><span class="value">₹ ${fmtNum(inv.invoice_value)}</span></div>
    <div class="fin-row debit"><span class="label">TDS Deducted</span><span class="value">— ₹ ${fmtNum(inv.tds)}</span></div>
    <div class="fin-row highlight"><span class="label">Receivable Amount</span><span class="value">₹ ${fmtNum(inv.receivable_amount)}</span></div>
    <div class="fin-row"><span class="label">Amount Received</span><span class="value">₹ ${fmtNum(inv.amount_received)}</span></div>
    <div class="fin-row debit"><span class="label">CN / Bad Debt</span><span class="value">₹ ${fmtNum(inv.cn_amount)}</span></div>
  </div>

  <!-- Payroll breakdown -->
  <div class="fin-section">
    <div class="fin-title">Payroll Breakdown</div>
    <div class="fin-row"><span class="label">Gross Value</span><span class="value">₹ ${fmtNum(inv.gross_value)}</span></div>
    <div class="fin-row"><span class="label">Net In Hand</span><span class="value">₹ ${fmtNum(inv.net_in_hand)}</span></div>
    <div class="fin-row"><span class="label">Co. PF</span><span class="value">₹ ${fmtNum(inv.co_pf)}</span></div>
    <div class="fin-row"><span class="label">Co. ESI</span><span class="value">₹ ${fmtNum(inv.co_esi)}</span></div>
    <div class="fin-row"><span class="label">LWF Tax</span><span class="value">₹ ${fmtNum(inv.lwf_tax)}</span></div>
    <div class="fin-row"><span class="label">PT Tax</span><span class="value">₹ ${fmtNum(inv.pt_tax)}</span></div>
    <div class="fin-row"><span class="label">Other Deductions</span><span class="value">₹ ${fmtNum(inv.other_ded)}</span></div>
    <div class="fin-row total"><span class="label">CTC</span><span class="value">₹ ${fmtNum(inv.ctc)}</span></div>
  </div>
</div>

<!-- Outstanding -->
<div class="outstanding">
  <div class="outstanding-label">${Number(outstanding || 0) <= 0 ? "✓ Invoice Fully Settled" : "Outstanding Balance"}</div>
  <div class="outstanding-amount">₹ ${fmtNum(Math.abs(outstanding))}</div>
</div>

<!-- Ledger table -->
<div class="section-title">Transaction Ledger</div>
${ledgerTable}

<!-- Footer -->
<div class="footer">
  <div class="legal">
    This document is a system-generated ledger statement from Verto Financial Suite.
    For any discrepancies, contact your Verto account manager.
  </div>
  <div style="text-align:right;">
    <div style="font-weight:700;color:#2563eb;">VERTO</div>
    <div>${inv.entity_name || "Verto India Pvt Ltd"}</div>
  </div>
</div>

</body>
</html>`;

  // Open in a new window and trigger print (browser's Save as PDF)
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow popups for this site to download the PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    logExport({
      action:       EXPORT_ACTIONS.PDF,
      category:     "Invoice",
      description:  `Downloaded Invoice PDF — ${inv.invoice_number || inv.id}`,
      reference_no: inv.invoice_number || null,
      client_name:  inv.client_name    || null,
      amount:       inv.invoice_value  || null,
      meta: { outstanding: Number(outstanding || 0), ledger_rows: ledgerRows.length },
    });
  }, 600);
}