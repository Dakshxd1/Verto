import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Export dashboard data to Excel exactly as shown on screen.
 * Columns match the dashboard table: Invoice Date, Impact Month, Department,
 * Client Name, Invoice Value, Verto Fee, Not Recvd Amt, Delay Days,
 * OS Amt Difference, CN / Bad Debt, Invoice Entity, GST, Type, TDS, Status
 */
export const exportToExcel = (data, fileName = "Dashboard_Export") => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Map data to match the exact dashboard column order and formatting
  const exportData = data.map((row) => ({
    "Invoice Date": row.invDate || "",
    "Impact Month": row.impactMonth || "",
    "Department": row.dept || "",
    "Client Name": row.client || "",
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

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths to match dashboard proportions
  const colWidths = [
    { wch: 14 },  // Invoice Date
    { wch: 14 },  // Impact Month
    { wch: 16 },  // Department
    { wch: 28 },  // Client Name
    { wch: 16 },  // Invoice Value
    { wch: 14 },  // Verto Fee
    { wch: 16 },  // Not Recvd Amt
    { wch: 12 },  // Delay Days
    { wch: 18 },  // OS Amt Difference
    { wch: 16 },  // CN / Bad Debt
    { wch: 28 },  // Invoice Entity
    { wch: 14 },  // GST
    { wch: 10 },  // Type
    { wch: 14 },  // TDS
    { wch: 12 },  // Status
  ];
  worksheet["!cols"] = colWidths;

  // Style header row: bold, background color, borders
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "059669" }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          bottom: { style: "thin", color: { rgb: "047857" } },
        },
      };
    }
  }

  // Freeze header row
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  // Apply number formatting for currency columns
  const currencyCols = [4, 5, 6, 8, 9, 11, 13]; // E, F, G, I, J, L, N (0-indexed)
  const centerCols = [7, 12, 14]; // H, M, O (Delay Days, Type, Status)

  for (let row = 1; row <= range.e.r; row++) {
    for (let col of currencyCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].t = "n"; // number type
        worksheet[cellRef].z = '"₹"#,##0.00'; // currency format
        worksheet[cellRef].s = {
          alignment: { horizontal: "right", vertical: "center" },
          font: { sz: 11 },
        };
      }
    }
    for (let col of centerCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { sz: 11 },
        };
      }
    }
    // Default alignment for text columns
    const textCols = [0, 1, 2, 3, 10]; // A, B, C, D, K
    for (let col of textCols) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          alignment: { horizontal: "left", vertical: "center" },
          font: { sz: 11 },
        };
      }
    }
  }

  // Add auto-filter to header row
  worksheet["!autofilter"] = { ref: worksheet["!ref"] };

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

  // Generate and save file
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${fileName}_${timestamp}.xlsx`);
};