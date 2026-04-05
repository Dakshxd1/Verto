import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (data) => {
  const formattedData = data.map((row) => ({
    "Invoice No": row.id,
    Client: row.client,
    Department: row.dept,
    Entity: row.entity,
    "Invoice Value": row.invValue,
    GST: row.gst,
    TDS: row.tds,
    Outstanding: row.notRecvd,
    "Delay Days": row.delayDays,
    Status:
      row.gstMismatch || row.tdsMismatch ? "Mismatch" : "OK",
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const file = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  saveAs(file, "Finance_Report.xlsx");
};