/**
 * salarySlip.js  –  pure JS, NO JSX, NO dynamic CDN import
 * Place at:  src/utils/salarySlip.js
 *
 * Exports
 *   printSalarySlip(row)               – opens one slip in a new tab → print/save
 *   downloadBulkSlipsZip(rows, label)  – packs all slips into a .zip download
 *
 * ZIP uses jszip loaded via a <script> tag injected at runtime (avoids Vite
 * import-analysis errors on CDN URLs).  Fallback: opens slips one by one.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
import { logExport, EXPORT_ACTIONS } from "./auditLog";

const fmtINR = (val) =>
    "\u20b9 " +
    Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  
  const fmtDate = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };
  
  const fmtMonthYear = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };
  
  const sanitize = (str) =>
    (str || "slip")
      .replace(/[^a-zA-Z0-9_\-.]/g, "_")
      .replace(/__+/g, "_")
      .replace(/^_|_$/g, "");
  
  // ---------------------------------------------------------------------------
  // Load JSZip via script tag (avoids Vite CDN import-analysis errors)
  // ---------------------------------------------------------------------------
  
  let _jszipPromise = null;
  
  function loadJSZip() {
    if (_jszipPromise) return _jszipPromise;
    _jszipPromise = new Promise((resolve, reject) => {
      if (window.JSZip) {
        resolve(window.JSZip);
        return;
      }
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = () => resolve(window.JSZip);
      script.onerror = () => reject(new Error("JSZip load failed"));
      document.head.appendChild(script);
    });
    return _jszipPromise;
  }
  
  // ---------------------------------------------------------------------------
  // Build slip HTML  (plain string – NO JSX)
  // ---------------------------------------------------------------------------
  
  export function buildSlipHTML(row) {
    const gross = Number(row.payment_amount || 0);
    const tax   = Number(row.income_tax_deducted || 0);
    const net   = Number(row.net_payment != null ? row.net_payment : gross - tax);
  
    const month      = fmtMonthYear(row.date_of_pay || row.created_at);
    const payDate    = fmtDate(row.date_of_pay);
    const deptName   = (row.departments_master && row.departments_master.dept_name) || row.dept_name || "\u2014";
    const entityName = (row.entity_master && row.entity_master.entity_name) || row.entity_name || "Verto";
    const slipNo     = (row.emp_code || "") + "\u2013" + (row.date_of_pay || row.created_at || "").slice(0, 10).replace(/-/g, "");
  
    const deductionRow = tax > 0
      ? '<div class="pay-row"><span class="pay-label">Income Tax (TDS)</span><span class="pay-amount deduction">' + fmtINR(tax) + '</span></div>'
      : '<div class="pay-row"><span class="pay-label" style="color:#94a3b8;font-style:italic;">No deductions</span><span class="pay-amount" style="color:#94a3b8;">\u20b9 0.00</span></div>';
  
    const payBadge = row.payment_description
      ? '<span class="pay-badge">' + row.payment_description + '</span>'
      : "";
  
    const remarksBlock = row.remarks
      ? '<div class="remarks-section"><div class="remarks-box"><div class="remarks-title">Remarks</div><div class="remarks-text">' + row.remarks + '</div></div></div>'
      : "";
  
    const css = [
      "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
      "body{font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:12px;color:#1e293b;background:#fff;padding:32px}",
      ".slip{max-width:720px;margin:0 auto;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden}",
      ".slip-header{background:#0f172a;padding:24px 28px 20px;display:flex;align-items:flex-start;justify-content:space-between}",
      ".brand-name{font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#e11d48;line-height:1}",
      ".brand-tagline{font-size:10px;font-weight:400;color:#f8fafc;margin-top:4px;letter-spacing:0.3px}",
      ".slip-title-block{text-align:right}",
      ".slip-title{font-size:13px;font-weight:600;color:#f8fafc;text-transform:uppercase;letter-spacing:1px}",
      ".slip-month{font-size:11px;color:#94a3b8;margin-top:3px}",
      ".slip-slipno{font-size:10px;color:#64748b;margin-top:3px;font-family:monospace}",
      ".meta-band{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 28px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}",
      ".meta-item label{display:block;font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:0.8px;color:#94a3b8;margin-bottom:3px}",
      ".meta-item span{font-size:12px;font-weight:600;color:#0f172a}",
      ".meta-item.mono span{font-family:'Courier New',monospace;font-size:11px;background:#eef3fa;color:#1e3a5f;padding:2px 8px;border-radius:5px}",
      ".section{padding:20px 28px}",
      ".section-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:1px solid #f1f5f9;padding-bottom:8px;margin-bottom:12px}",
      ".pay-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed #f1f5f9}",
      ".pay-row:last-child{border-bottom:none}",
      ".pay-label{font-size:11.5px;color:#475569;font-weight:400}",
      ".pay-badge{font-size:10px;font-weight:500;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:1px 8px;border-radius:20px;margin-left:8px}",
      ".pay-amount{font-size:12px;font-weight:600;font-family:'Courier New',monospace;color:#0f172a}",
      ".pay-amount.deduction{color:#b45309}",
      ".divider{height:1px;background:#e2e8f0;margin:0 28px}",
      ".net-box{margin:20px 28px;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:10px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between}",
      ".net-label{font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px}",
      ".net-sub{font-size:10px;color:#64748b;margin-top:2px}",
      ".net-amount{font-size:26px;font-weight:700;color:#f8fafc;font-family:'Courier New',monospace;letter-spacing:-0.5px}",
      ".remarks-section{padding:0 28px 20px}",
      ".remarks-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px}",
      ".remarks-title{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#92400e;margin-bottom:4px}",
      ".remarks-text{font-size:11px;color:#78350f}",
      ".slip-footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;display:flex;align-items:center;justify-content:space-between}",
      ".footer-note{font-size:9px;color:#94a3b8}",
      ".footer-stamp{font-size:9px;color:#cbd5e1;font-family:monospace}",
      "@media print{body{padding:12px}.slip{border:1.5px solid #ccc}}",
    ].join("\n");
  
    return (
      "<!DOCTYPE html>" +
      '<html lang="en">' +
      "<head>" +
      '<meta charset="UTF-8"/>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1.0"/>' +
      "<title>Salary Slip \u2013 " + (row.employee_name || row.emp_code) + "</title>" +
      '<link rel="preconnect" href="https://fonts.googleapis.com"/>' +
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>' +
      "<style>" + css + "</style>" +
      "</head>" +
      "<body>" +
      '<div class="slip">' +
  
        // HEADER
        '<div class="slip-header">' +
          "<div>" +
            '<div class="brand-name">VERTO</div>' +
            '<div class="brand-tagline">Empowered by Innovations</div>' +
          "</div>" +
          '<div class="slip-title-block">' +
            '<div class="slip-title">Salary / Payout Slip</div>' +
            '<div class="slip-month">' + month + "</div>" +
            '<div class="slip-slipno">' + slipNo + "</div>" +
          "</div>" +
        "</div>" +
  
        // META BAND
        '<div class="meta-band">' +
          '<div class="meta-item mono"><label>Emp Code</label><span>' + (row.emp_code || "\u2014") + "</span></div>" +
          '<div class="meta-item"><label>Employee Name</label><span>' + (row.employee_name || "\u2014") + "</span></div>" +
          '<div class="meta-item"><label>Designation</label><span>' + (row.designation || "\u2014") + "</span></div>" +
          '<div class="meta-item"><label>Department</label><span>' + deptName + "</span></div>" +
          '<div class="meta-item"><label>Entity</label><span>' + entityName + "</span></div>" +
          '<div class="meta-item"><label>Bank</label><span>' + (row.bank_name || "\u2014") + "</span></div>" +
        "</div>" +
  
        // EARNINGS
        '<div class="section">' +
          '<div class="section-title">Earnings</div>' +
          '<div class="pay-row">' +
            '<span class="pay-label">' + (row.pay_head || "Payout") + " " + payBadge + "</span>" +
            '<span class="pay-amount">' + fmtINR(gross) + "</span>" +
          "</div>" +
          '<div class="pay-row" style="background:#f8fafc;margin-top:6px;padding:8px 10px;border-radius:6px;border-bottom:none;">' +
            '<span class="pay-label" style="font-weight:600;color:#0f172a;">Gross Earnings</span>' +
            '<span class="pay-amount">' + fmtINR(gross) + "</span>" +
          "</div>" +
        "</div>" +
  
        '<div class="divider"></div>' +
  
        // DEDUCTIONS
        '<div class="section">' +
          '<div class="section-title">Deductions</div>' +
          deductionRow +
          '<div class="pay-row" style="background:#fff7ed;margin-top:6px;padding:8px 10px;border-radius:6px;border-bottom:none;">' +
            '<span class="pay-label" style="font-weight:600;color:#92400e;">Total Deductions</span>' +
            '<span class="pay-amount deduction">' + fmtINR(tax) + "</span>" +
          "</div>" +
        "</div>" +
  
        '<div class="divider"></div>' +
  
        // NET PAY
        '<div class="net-box">' +
          "<div>" +
            '<div class="net-label">Net Payout</div>' +
            '<div class="net-sub">Pay Date: ' + payDate + "</div>" +
          "</div>" +
          '<div class="net-amount">' + fmtINR(net) + "</div>" +
        "</div>" +
  
        remarksBlock +
  
        // FOOTER
        '<div class="slip-footer">' +
          '<div class="footer-note">This is a system-generated document. No signature required.</div>' +
          '<div class="footer-stamp">Generated: ' + new Date().toLocaleString("en-IN") + "</div>" +
        "</div>" +
  
      "</div>" +
      "</body>" +
      "</html>"
    );
  }
  
  // ---------------------------------------------------------------------------
  // Single slip  –  open in new tab → browser print/save dialog
  // ---------------------------------------------------------------------------
  
  export function printSalarySlip(row) {
    const html = buildSlipHTML(row);
    const win = window.open("", "_blank", "width=820,height=700");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = function () {
      setTimeout(function () {
        win.focus();
        win.print();
      }, 400);
    };
    logExport({
      action:      EXPORT_ACTIONS.SALARY_SLIP,
      category:    "Expense",
      description: `Downloaded Salary Slip — ${row.employee_name || row.emp_code}`,
      reference_no: row.emp_code || null,
      meta: { emp_code: row.emp_code, pay_head: row.pay_head, date_of_pay: row.date_of_pay },
    });
  }
  
  // ---------------------------------------------------------------------------
  // Bulk ZIP  –  one HTML file per employee, downloaded as a .zip
  // ---------------------------------------------------------------------------
  
  export async function downloadBulkSlipsZip(rows, label) {
    label = label || "batch";
  
    if (!rows || !rows.length) {
      alert("No records found for this batch.");
      return;
    }
  
    var JSZip;
    try {
      JSZip = await loadJSZip();
    } catch (e) {
      // Fallback: open slips one by one
      for (var i = 0; i < rows.length; i++) {
        printSalarySlip(rows[i]);
        await new Promise(function (r) { setTimeout(r, 600); });
      }
      return;
    }
  
    var zip = new JSZip();
    var now = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "_")
      .replace(/:/g, "-");
  
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      var html = buildSlipHTML(row);
      var empCode  = sanitize(row.emp_code || "UNK");
      var empName  = sanitize(row.employee_name || "Employee");
      var payDate  = sanitize((row.date_of_pay || row.created_at || "").slice(0, 10));
      var fileName = empCode + "_" + empName + "_" + payDate + ".html";
      zip.file(fileName, html);
    }
  
    var blob = await zip.generateAsync({ type: "blob" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href     = url;
    a.download = "Verto_Slips_" + sanitize(label) + "_" + now + ".zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    logExport({
      action:      EXPORT_ACTIONS.ZIP,
      category:    "Expense",
      description: `Downloaded Bulk Salary Slips ZIP — ${label} (${rows.length} employees)`,
      meta:        { batch: label, count: rows.length },
    });
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }