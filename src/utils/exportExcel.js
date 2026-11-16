import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// First word of the client name, e.g. "Blink Digital Pvt Ltd" -> "Blink"
const getFirstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

/**
 * Columns: Invoice Number, Invoice Date, Impact Month, Department,
 * Client Name, Client First Name, Ledger Name, Invoice Value, Verto Fee,
 * Not Recvd Amt, Delay Days, OS Amt Difference, CN / Bad Debt,
 * Invoice Entity, GST, Type, TDS, Status
 */
export const exportToExcel = (data, fileName = "Dashboard_Export") => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  const exportData = data.map((row) => ({
    "Invoice Number": row.invoice_number || row.id || "",
    "Invoice Date": row.invDate || "",
    "Impact Month": row.impactMonth || "",
    "Department": row.dept || "",
    "Client Name": row.client || "",
    "Client First Name": getFirstName(row.client),   // ← ADDED
    "Ledger Name": row.ledger_name || "",
    "Invoice Value": row.invValue ?? 0,
    "Verto Fee": row.vertoFee ?? 0,
    "Not Recvd Amt": row.notRecvd ?? 0,
    "Delay Days": row.delayDays ?? 0,
    "OS Amt Difference": row.osDiff ?? 0,
    "CN / Bad Debt": row.cnBadDebt ?? 0,
    "Invoice Entity": row.entity || "",
    "GST": row.gst ?? 0,
    "Type": row.dept === "Outsourcing" ? "OS" : "Normal",
    "TDS": row.tds ?? 0,
    "Status": row.is_completed
      ? "Completed"
      : row.gstMismatch || row.tdsMismatch
      ? "Mismatch"
      : "Active",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  worksheet["!cols"] = [
    { wch: 18 }, // Invoice Number
    { wch: 14 }, // Invoice Date
    { wch: 14 }, // Impact Month
    { wch: 16 }, // Department
    { wch: 28 }, // Client Name
    { wch: 18 }, // Client First Name   ← ADDED
    { wch: 28 }, // Ledger Name
    { wch: 16 }, // Invoice Value
    { wch: 14 }, // Verto Fee
    { wch: 16 }, // Not Recvd Amt
    { wch: 12 }, // Delay Days
    { wch: 18 }, // OS Amt Difference
    { wch: 16 }, // CN / Bad Debt
    { wch: 28 }, // Invoice Entity
    { wch: 14 }, // GST
    { wch: 10 }, // Type
    { wch: 14 }, // TDS
    { wch: 12 }, // Status
  ];

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "059669" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: { bottom: { style: "thin", color: { rgb: "047857" } } },
      };
    }
  }

  worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  // Indexes shifted +1 again because Client First Name is now column F (5)
  const currencyCols = [7, 8, 9, 11, 12, 14, 16]; // H,I,J,L,M,O,Q
  const centerCols = [10, 15, 17];                // K,P,R
  const textCols = [0, 1, 2, 3, 4, 5, 6, 13];     // A–G, N

  for (let row = 1; row <= range.e.r; row++) {
    for (let col of currencyCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].t = "n";
        worksheet[cellRef].z = '"₹"#,##0.00';
        worksheet[cellRef].s = { alignment: { horizontal: "right", vertical: "center" }, font: { sz: 11 } };
      }
    }
    for (let col of centerCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { alignment: { horizontal: "center", vertical: "center" }, font: { sz: 11 } };
      }
    }
    for (let col of textCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { alignment: { horizontal: "left", vertical: "center" }, font: { sz: 11 } };
      }
    }
  }

  worksheet["!autofilter"] = { ref: worksheet["!ref"] };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${fileName}_${timestamp}.xlsx`);
};