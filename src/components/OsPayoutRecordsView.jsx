import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient.js";
import { usePerms } from "../context/PermissionsContext.jsx";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  Search,
  FileText,
  FileSpreadsheet,
  Users,
  IndianRupee,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  AlertTriangle,
  FolderOpen,
  X,
  CheckCircle2,
  Eye,
  CornerDownLeft,
  Lock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { logExport, EXPORT_ACTIONS } from "../utils/Auditlog.js";
import DateRangeFilter, {
  applyRange,
  fetchAllRows,
  rangeTag,
  rangeText,
  writeXlsx,
} from "./DateRangeFilter";

const OsPayoutRecordsView = ({ onClose, onChanged }) => {
  const { canEdit, canDelete, canExport, isIntern, role } = usePerms();
  const [loading, setLoading] = useState(true);
  const [bulkFolders, setBulkFolders] = useState([]);
  const [singleRecords, setSingleRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState("bulk");
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [expandedRows, setExpandedRows] = useState([]);
  const [expandingId, setExpandingId] = useState(null);
  const [deletingBatchId, setDeletingBatchId] = useState(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [banks, setBanks] = useState([]);

  // ── DATE RANGE ──
  const [range, setRange] = useState({ from: "", to: "" });

  // BB states
  const [bbRow, setBbRow] = useState(null);
  const [bbForm, setBbForm] = useState({});
  const [bbSaving, setBbSaving] = useState(false);
  const [bbErrors, setBbErrors] = useState({});
  const [drillRow, setDrillRow] = useState(null);
  const [drillData, setDrillData] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [bbMap, setBbMap] = useState({});

  // ── helpers ──
  const fmtCur = (v) => (v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—");
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";
  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const isLocked = (dateStr) => {
    if (!dateStr) return false;
    const rowDate = new Date(dateStr);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);
    return rowDate < cutoff;
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── FETCH ──
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data: banksData } = await supabase
        .from("bank_master")
        .select("id, bank_name")
        .order("bank_name");
      setBanks(banksData || []);

      if (range.from && range.to && range.from > range.to) {
        setBulkFolders([]);
        setSingleRecords([]);
        setBbMap({});
        return;
      }
      const hasRange = !!(range.from || range.to);

      // ── Bulk rows (paged, filtered by Date Paid) ──
      const bulkData = await fetchAllRows(() =>
        applyRange(
          supabase
            .from("os_payouts")
            .select(
              "bulk_batch_id, bulk_batch_code, bulk_file_name, bulk_upload_date, amount_paid, income_tax_deducted"
            )
            .eq("entry_type", "bulk")
            .not("bulk_batch_id", "is", null),
          "payment_date",
          range
        )
          .order("bulk_upload_date", { ascending: false })
          .order("id")
      );

      const grouped = {};
      bulkData.forEach((row) => {
        const key = row.bulk_batch_id;
        if (!grouped[key]) {
          grouped[key] = {
            batchId: key,
            batchCode: row.bulk_batch_code || `BATCH_${key}`,
            fileName: row.bulk_file_name || "Unknown File",
            uploadDate: row.bulk_upload_date,
            count: 0,
            totalAmount: 0,
            totalTax: 0,
            totalNet: 0,
          };
        }
        grouped[key].count++;
        const net =
          (parseFloat(row.amount_paid) || 0) -
          (parseFloat(row.income_tax_deducted) || 0);
        grouped[key].totalAmount += parseFloat(row.amount_paid) || 0;
        grouped[key].totalTax += parseFloat(row.income_tax_deducted) || 0;
        grouped[key].totalNet += net;
      });
      setBulkFolders(
        Object.values(grouped).sort(
          (a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0)
        )
      );

      // ── Manual rows: all rows in range, or latest 100 when no range ──
      const singleBase = () =>
        applyRange(
          supabase
            .from("os_payouts")
            .select(
              "*, clients_master(client_name), entity_master(entity_name), departments_master(dept_name), bank_master(bank_name), invoices(invoice_number)"
            )
            .eq("entry_type", "single"),
          "payment_date",
          range
        );

      let singleData;
      if (hasRange) {
        singleData = await fetchAllRows(() =>
          singleBase().order("created_at", { ascending: false }).order("id")
        );
      } else {
        const { data, error } = await singleBase()
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        singleData = data || [];
      }
      setSingleRecords(singleData);

      // ── Bounce-back totals, in chunks to keep the URL short ──
      const allIds = singleData.map((r) => r.id).filter(Boolean);
      const map = {};
      for (let i = 0; i < allIds.length; i += 100) {
        const { data: bbData } = await supabase
          .from("os_payout_bouncebacks")
          .select("os_payout_id, bb_amount, bb_emp_count")
          .in("os_payout_id", allIds.slice(i, i + 100));
        (bbData || []).forEach((b) => {
          if (!map[b.os_payout_id])
            map[b.os_payout_id] = { total_bb: 0, total_bb_emp: 0, count: 0 };
          map[b.os_payout_id].total_bb += parseFloat(b.bb_amount) || 0;
          map[b.os_payout_id].total_bb_emp += parseInt(b.bb_emp_count) || 0;
          map[b.os_payout_id].count += 1;
        });
      }
      setBbMap(map);
    } catch (err) {
      console.error(err);
      showToast("Failed to load records: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    collapseBatch();
    fetchRecords();
  }, [range.from, range.to]);

  // ── BATCH ──
  const loadBatch = async (batchId) => {
    setExpandingId(batchId);
    try {
      const { data } = await applyRange(
        supabase
          .from("os_payouts")
          .select(
            "*, clients_master(client_name), invoices(invoice_number), bank_master(bank_name)"
          )
          .eq("bulk_batch_id", batchId),
        "payment_date",
        range
      ).order("created_at", { ascending: true });
      setExpandedRows(data || []);
      setExpandedBatch(batchId);
    } catch (err) {
      console.error(err);
    } finally {
      setExpandingId(null);
    }
  };

  const collapseBatch = () => {
    setExpandedBatch(null);
    setExpandedRows([]);
  };

  const deleteBatch = async (batchId) => {
    setDeletingBatchId(batchId);
    try {
      const { data: payouts } = await supabase
        .from("os_payouts")
        .select("id")
        .eq("bulk_batch_id", batchId);

      const payoutIds = (payouts || []).map((p) => p.id);
      if (payoutIds.length > 0) {
        const { data: bbs } = await supabase
          .from("os_payout_bouncebacks")
          .select("id, bank_entry_id")
          .in("os_payout_id", payoutIds);

        const bbBankIds = (bbs || []).map((b) => b.bank_entry_id).filter(Boolean);
        const bbIds = (bbs || []).map((b) => b.id);

        if (bbIds.length > 0) {
          await supabase.from("os_payout_bouncebacks").delete().in("id", bbIds);
        }
        if (bbBankIds.length > 0) {
          await supabase.from("bank_entries").delete().in("id", bbBankIds);
        }

        await supabase
          .from("bank_entries")
          .delete()
          .eq("source_table", "os_payouts")
          .in("source_id", payoutIds);

        await supabase.from("os_payouts").delete().in("id", payoutIds);
      }

      await supabase.from("bulk_upload_batches").delete().eq("id", batchId);

      setConfirmDeleteBatch(null);
      if (expandedBatch === batchId) collapseBatch();
      showToast("Batch and all related entries deleted");
      fetchRecords();
      onChanged?.();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingBatchId(null);
    }
  };

  // ── SINGLE DELETE ──
  const deleteRow = async (id) => {
    const { data: bbs } = await supabase
      .from("os_payout_bouncebacks")
      .select("id, bank_entry_id")
      .eq("os_payout_id", id);

    const bbBankIds = (bbs || []).map((b) => b.bank_entry_id).filter(Boolean);
    const bbIds = (bbs || []).map((b) => b.id);

    if (bbIds.length > 0) {
      await supabase.from("os_payout_bouncebacks").delete().in("id", bbIds);
    }
    if (bbBankIds.length > 0) {
      await supabase.from("bank_entries").delete().in("id", bbBankIds);
    }

    await supabase
      .from("bank_entries")
      .delete()
      .eq("source_table", "os_payouts")
      .eq("source_id", id);

    await supabase.from("os_payouts").delete().eq("id", id);
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Delete this OS payout? All BB and bank entries will also be deleted.")) return;
    try {
      await deleteRow(id);
      setSingleRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("Deleted successfully");
      onChanged?.();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  const handleDeleteBulkRow = async (rowId) => {
    setConfirmDeleteRow(null);
    setDeletingBatchId(rowId);
    try {
      await deleteRow(rowId);
      setExpandedRows((prev) => prev.filter((r) => r.id !== rowId));
      setBulkFolders((prev) =>
        prev.map((f) => {
          if (f.batchId !== expandedBatch) return f;
          const deleted = expandedRows.find((r) => r.id === rowId);
          return {
            ...f,
            count: f.count - 1,
            totalAmount: f.totalAmount - Number(deleted?.amount_paid || 0),
            totalTax: f.totalTax - Number(deleted?.income_tax_deducted || 0),
            totalNet: f.totalNet - (Number(deleted?.amount_paid || 0) - Number(deleted?.income_tax_deducted || 0)),
          };
        })
      );
      showToast("Row deleted successfully");
      onChanged?.();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    } finally {
      setDeletingBatchId(null);
    }
  };

  // ── EDIT ──
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditData({
      amount_paid: row.amount_paid,
      income_tax_deducted: row.income_tax_deducted,
      payment_details: row.payment_details || "",
      pay_head: row.pay_head || "",
      employee_count: row.employee_count || "",
      payment_date: row.payment_date || "",
      bank_id: row.bank_id || "",
      remarks: row.remarks || "",
    });
  };

  const handleUpdate = async () => {
    try {
      const bankName = banks.find((b) => b.id === editData.bank_id)?.bank_name || null;
      const { error } = await supabase
        .from("os_payouts")
        .update({
          amount_paid: parseFloat(editData.amount_paid) || 0,
          income_tax_deducted: parseFloat(editData.income_tax_deducted) || 0,
          payment_details: editData.payment_details,
          pay_head: editData.pay_head || "",
          employee_count: parseInt(editData.employee_count) || 0,
          payment_date: editData.payment_date,
          bank_id: editData.bank_id || null,
          bank_name: bankName,
          remarks: editData.remarks,
        })
        .eq("id", editingId);
      if (error) throw error;
      showToast("Updated successfully");
      setEditingId(null);
      fetchRecords();
      onChanged?.();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ── EXPORT (per-batch, respects range) ──
  const exportBatch = async (batchId) => {
    try {
      const data = await fetchAllRows(() =>
        applyRange(
          supabase
            .from("os_payouts")
            .select("*, invoices(invoice_number)")
            .eq("bulk_batch_id", batchId),
          "payment_date",
          range
        )
          .order("created_at", { ascending: true })
          .order("id")
      );
      if (!data.length) {
        alert("No records to export in this date range");
        return;
      }
      const headers = [
        "Invoice Number",
        "Pay Head",
        "Payment Details",
        "Amount Paid",
        "Income Tax",
        "Net",
        "Employee Count",
        "Bank",
        "Date Paid",
        "Remarks",
      ];
      const rows = data.map((r) => [
        r.invoices?.invoice_number || "",
        r.pay_head || "",
        r.payment_details || "",
        r.amount_paid || 0,
        r.income_tax_deducted || 0,
        (r.amount_paid || 0) - (r.income_tax_deducted || 0),
        r.employee_count || 0,
        r.bank_name || "",
        r.payment_date || "",
        r.remarks || "",
      ]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = headers.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, "OS Bulk Upload");
      XLSX.writeFile(wb, `os_bulk_export_${new Date().toISOString().slice(0, 10)}${rangeTag(range)}.xlsx`);
      logExport({
        action: EXPORT_ACTIONS.EXCEL,
        category: "Expense",
        description: `Downloaded OS Bulk Excel (${data.length} rows)${rangeText(range)}`,
        meta: { batch_id: batchId, rows: data.length },
      });
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  // ── BB ──
  const openBbModal = (row) => {
    setBbRow(row);
    setBbForm({
      bb_date: new Date().toISOString().slice(0, 10),
      bb_amount: "",
      bb_emp_count: "",
      remarks: "",
    });
    setBbErrors({});
  };

  const saveBB = async () => {
    const errs = {};
    if (!bbForm.bb_amount || parseFloat(bbForm.bb_amount) <= 0)
      errs.bb_amount = "Must be > 0";
    if (!bbForm.bb_date) errs.bb_date = "Required";
    const bbAmt = parseFloat(bbForm.bb_amount) || 0;
    const existingBB = bbMap[bbRow.id]?.total_bb || 0;
    const maxBB = parseFloat(bbRow.amount_paid) || 0;
    if (bbAmt + existingBB > maxBB) {
      errs.bb_amount = `Total BB (₹${(bbAmt + existingBB).toLocaleString("en-IN")}) cannot exceed amount paid (₹${maxBB.toLocaleString("en-IN")})`;
    }
    if (Object.keys(errs).length > 0) {
      setBbErrors(errs);
      return;
    }

    setBbSaving(true);
    try {
      const { data: refData } = await supabase.rpc("generate_bb_ref");
      const bbRef = refData || `BB${Date.now().toString().slice(-4)}`;

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(-2);
      const { count: todayCount } = await supabase
        .from("bank_entries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", now.toISOString().slice(0, 10));
      const seq = String((todayCount || 0) + 1).padStart(2, "0");
      const bankRef = `BNK-${dd}${mm}${yy}-${seq}`;

      const bankId = bbRow.bank_id;
      const bankEntry = {
        bank_id: bankId,
        date: bbForm.bb_date,
        amount: bbAmt,
        type: "credit",
        flow_type: "os_bounce_back",
        entry_type: "os_bounce_back",
        source_table: "os_payout_bouncebacks",
        reference_no: bankRef,
        invoice_id: bbRow.invoice_id || null,
        invoice_number: bbRow.invoices?.invoice_number || null,
        entity: bbRow.entity_master?.entity_name || null,
        remarks: `OS Bounce Back - ${bbRef} - ${
          bbRow.payout_ref_no || bbRow.invoices?.invoice_number || ""
        }`,
        is_deleted: false,
      };

      const { data: savedBankEntry, error: beErr } = await supabase
        .from("bank_entries")
        .insert([bankEntry])
        .select()
        .single();
      if (beErr) throw beErr;

      const bbPayload = {
        bb_ref_no: bbRef,
        os_payout_id: bbRow.id,
        invoice_id: bbRow.invoice_id || null,
        invoice_number: bbRow.invoices?.invoice_number || null,
        client_id: bbRow.client_id || null,
        department_id: bbRow.department_id || null,
        entity_id: bbRow.entity_id || null,
        os_payout_date: bbRow.payment_date,
        bb_date: bbForm.bb_date,
        original_amount: parseFloat(bbRow.amount_paid) || 0,
        bb_amount: bbAmt,
        original_emp_count: parseInt(bbRow.employee_count) || 0,
        bb_emp_count: parseInt(bbForm.bb_emp_count) || 0,
        bank_entry_id: savedBankEntry.id,
        remarks: bbForm.remarks || "",
      };

      const { data: savedBB, error: bbErr } = await supabase
        .from("os_payout_bouncebacks")
        .insert([bbPayload])
        .select()
        .single();
      if (bbErr) throw bbErr;

      await supabase
        .from("bank_entries")
        .update({ source_id: savedBB.id })
        .eq("id", savedBankEntry.id);

      setBbRow(null);
      fetchRecords();
      onChanged?.();
      alert(
        `✅ Bounce Back ${bbRef} saved!\nBank credit entry ${bankRef} created for ₹${bbAmt.toLocaleString("en-IN")}`
      );
    } catch (err) {
      alert("Error saving BB: " + err.message);
    } finally {
      setBbSaving(false);
    }
  };

  const openDrilldown = async (row) => {
    setDrillRow(row);
    setDrillLoading(true);
    const { data } = await supabase
      .from("os_payout_bouncebacks")
      .select("*")
      .eq("os_payout_id", row.id)
      .order("created_at", { ascending: true });
    setDrillData(data || []);
    setDrillLoading(false);
  };

  const deleteBB = async (bb, parentRow) => {
    if (!window.confirm(`Delete BB ${bb.bb_ref_no} of ${fmtCur(bb.bb_amount)}?`)) return;
    try {
      if (bb.bank_entry_id) {
        await supabase.from("bank_entries").delete().eq("id", bb.bank_entry_id);
      }
      await supabase.from("os_payout_bouncebacks").delete().eq("id", bb.id);
      openDrilldown(parentRow);
      fetchRecords();
      onChanged?.();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // ── FILTER ──
  const filteredBulkFolders = bulkFolders.filter(
    (f) =>
      f.batchCode?.toLowerCase().includes(search.toLowerCase()) ||
      f.fileName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSingleRecords = singleRecords.filter((r) => {
    const text = `${r.invoices?.invoice_number || ""} ${r.clients_master?.client_name || ""} ${r.pay_head || ""} ${r.payment_details || ""} ${r.remarks || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  // ── Export every OS bulk batch currently shown, only rows inside the date range ──
  const exportAllBulkFiltered = async () => {
    try {
      const ids = new Set(filteredBulkFolders.map((f) => f.batchId));
      if (!ids.size) {
        alert("No batches to export");
        return;
      }
      const all = await fetchAllRows(() =>
        applyRange(
          supabase
            .from("os_payouts")
            .select("*, invoices(invoice_number)")
            .eq("entry_type", "bulk")
            .not("bulk_batch_id", "is", null),
          "payment_date",
          range
        )
          .order("bulk_upload_date", { ascending: false })
          .order("created_at", { ascending: true })
          .order("id")
      );
      const data = all.filter((r) => ids.has(r.bulk_batch_id));
      if (!data.length) {
        alert("No records to export in this date range");
        return;
      }
      const headers = [
        "Batch Code", "File Name", "Invoice Number", "Pay Head", "Payment Details",
        "Amount Paid", "Income Tax", "Net", "Employee Count", "Bank", "Date Paid", "Remarks",
      ];
      const rows = data.map((r) => [
        r.bulk_batch_code || "", r.bulk_file_name || "",
        r.invoices?.invoice_number || "", r.pay_head || "", r.payment_details || "",
        r.amount_paid || 0, r.income_tax_deducted || 0,
        (r.amount_paid || 0) - (r.income_tax_deducted || 0),
        r.employee_count || 0, r.bank_name || "", r.payment_date || "", r.remarks || "",
      ]);
      writeXlsx(
        headers, rows, "OS Bulk Uploads",
        `os_bulk_filtered_${new Date().toISOString().slice(0, 10)}${rangeTag(range)}.xlsx`
      );
      logExport({
        action: EXPORT_ACTIONS.EXCEL,
        category: "Expense",
        description: `Downloaded OS Bulk Excel (${data.length} rows)${rangeText(range)}`,
        meta: { rows: data.length, from: range.from || null, to: range.to || null },
      });
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  // ── Export the Manual tab exactly as shown (date range + search) ──
  const exportManualFiltered = () => {
    if (!filteredSingleRecords.length) {
      alert("No records to export");
      return;
    }
    const headers = [
      "Ref No", "Date Paid", "Invoice Number", "Client", "Pay Head", "Payment Details",
      "Amount Paid", "Bounce Back", "Income Tax", "Net", "Employee Count",
      "Bank", "Billable", "Remarks",
    ];
    const rows = filteredSingleRecords.map((r) => {
      const bb = bbMap[r.id]?.total_bb || 0;
      const net = Math.max(
        (parseFloat(r.amount_paid) || 0) - bb - (parseFloat(r.income_tax_deducted) || 0),
        0
      );
      return [
        r.payout_ref_no || "", r.payment_date || "", r.invoices?.invoice_number || "",
        r.clients_master?.client_name || "", r.pay_head || "", r.payment_details || "",
        r.amount_paid || 0, bb, r.income_tax_deducted || 0, net,
        r.employee_count || 0, r.bank_master?.bank_name || r.bank_name || "",
        r.is_billable ? "Yes" : "No", r.remarks || "",
      ];
    });
    writeXlsx(
      headers, rows, "OS Manual Entries",
      `os_manual_filtered_${new Date().toISOString().slice(0, 10)}${rangeTag(range)}.xlsx`
    );
    logExport({
      action: EXPORT_ACTIONS.EXCEL,
      category: "Expense",
      description: `Downloaded OS Manual Excel (${filteredSingleRecords.length} rows)${rangeText(range)}`,
      meta: { rows: filteredSingleRecords.length, from: range.from || null, to: range.to || null },
    });
  };

  // ── STATS ──
  const totalBulkCount = bulkFolders.reduce((s, f) => s + f.count, 0);
  const totalSingleCount = singleRecords.length;
  const totalRecords = totalBulkCount + totalSingleCount;

  const totalBulkAmount = bulkFolders.reduce((s, f) => s + f.totalAmount, 0);
  const totalSingleAmount = filteredSingleRecords.reduce((s, r) => s + (parseFloat(r.amount_paid) || 0), 0);
  const totalAmount = totalBulkAmount + totalSingleAmount;

  const totalBulkTax = bulkFolders.reduce((s, f) => s + f.totalTax, 0);
  const totalSingleTax = filteredSingleRecords.reduce((s, r) => s + (parseFloat(r.income_tax_deducted) || 0), 0);
  const totalTax = totalBulkTax + totalSingleTax;

  const netPayout = totalAmount - totalTax;
  const formatINR = (val) => `₹ ${Number(val).toLocaleString("en-IN")}`;

  // ── RENDER ──
  return (
    <div className="fixed inset-0 z-[999999] bg-[#f7f8fb] overflow-auto font-sans">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#eef3fa] hover:bg-[#dde9f7] flex items-center justify-center text-[#1e3a5f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-[#0f172a] text-[17px] font-semibold tracking-tight">
              OS Payout Records
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {bulkFolders.length} bulk batch{bulkFolders.length !== 1 ? "es" : ""} · {totalSingleCount} manual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#f0f2f5] rounded-lg p-0.5">
            {[
              { key: "bulk", label: "Bulk Uploads" },
              { key: "single", label: "Manual" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setViewTab(tab.key);
                  collapseBatch();
                }}
                className={`px-4 py-1.5 rounded-md text-[11.5px] font-semibold transition-all ${
                  viewTab === tab.key
                    ? "bg-white text-[#1e3a5f] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchRecords}
            className="w-9 h-9 rounded-xl bg-[#eef3fa] hover:bg-[#dde9f7] flex items-center justify-center text-[#1e3a5f] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice, client, pay head…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-[#f7f8fb] border border-slate-200 rounded-xl pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* DATE FILTER BAR */}
      <div className="px-6 pt-4 flex items-center justify-between flex-wrap gap-3">
        <DateRangeFilter
          label="Date Paid"
          from={range.from}
          to={range.to}
          onChange={setRange}
        />
        <div className="flex items-center gap-3">
          {viewTab === "single" && !(range.from || range.to) && singleRecords.length >= 100 && (
            <span className="text-[11px] text-amber-600">
              Showing latest 100 — choose dates to load all
            </span>
          )}
          {(range.from || range.to) && viewTab === "bulk" && (
            <span className="text-[11px] text-slate-500">
              Folders show only rows paid in this range
            </span>
          )}
          {canExport && (
            <button
              onClick={viewTab === "bulk" ? exportAllBulkFiltered : exportManualFiltered}
              className="h-9 px-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-semibold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export filtered
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="px-6 pt-5 grid grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: totalRecords, mono: false },
          { label: "Total Amount", value: formatINR(totalAmount), mono: true },
          { label: "Tax Deducted", value: formatINR(totalTax), mono: true },
          { label: "Net Payout", value: formatINR(netPayout), mono: true },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-5 py-3.5">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-[20px] font-semibold text-[#0f172a] mt-1 ${s.mono ? "font-mono" : ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div className="px-6 pt-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* BULK */}
            {viewTab === "bulk" && (
              <>
                {filteredBulkFolders.length > 0 ? (
                  filteredBulkFolders.map((folder) => (
                    <div
                      key={folder.batchId}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                        expandedBatch === folder.batchId
                          ? "border-emerald-300 shadow-lg shadow-emerald-100/50"
                          : "border-slate-200 hover:border-emerald-200"
                      }`}
                    >
                      <div
                        className={`px-5 py-4 cursor-pointer transition-colors ${
                          expandedBatch === folder.batchId ? "bg-emerald-50/30" : "hover:bg-slate-50"
                        }`}
                        onClick={() =>
                          expandedBatch === folder.batchId ? collapseBatch() : loadBatch(folder.batchId)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                expandedBatch === folder.batchId
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-[#eef3fa] text-[#1e3a5f]"
                              }`}
                            >
                              {expandedBatch === folder.batchId ? (
                                <FolderOpen className="w-5 h-5" />
                              ) : (
                                <FileSpreadsheet className="w-5 h-5" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h4 className="font-semibold text-[#0f172a] text-sm">{folder.batchCode}</h4>
                                <span className="text-[10px] bg-[#eef3fa] text-[#1e3a5f] px-2 py-0.5 rounded-full font-semibold">
                                  OS Bulk
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 truncate">📄 {folder.fileName}</p>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <span className="font-semibold">{folder.count}</span> records
                                </span>
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <IndianRupee className="w-3 h-3 text-slate-400" />
                                  <span className="font-semibold text-emerald-700">
                                    ₹{Number(folder.totalNet).toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-slate-400">net</span>
                                </span>
                                {folder.totalTax > 0 && (
                                  <span className="flex items-center gap-1.5 text-[11px] text-amber-600">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="font-semibold">
                                      ₹{Number(folder.totalTax).toLocaleString("en-IN")}
                                    </span>{" "}
                                    tax
                                  </span>
                                )}
                                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {fmtDateTime(folder.uploadDate)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {canExport && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportBatch(folder.batchId);
                                }}
                                className="w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                title="Export to Excel"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteBatch(
                                    confirmDeleteBatch === folder.batchId ? null : folder.batchId
                                  );
                                }}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                                  deletingBatchId === folder.batchId
                                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                }`}
                                title="Delete batch"
                                disabled={deletingBatchId === folder.batchId}
                              >
                                {deletingBatchId === folder.batchId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            <div className="text-slate-400">
                              {expandingId === folder.batchId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : expandedBatch === folder.batchId ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {confirmDeleteBatch === folder.batchId && (
                          <div
                            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs font-semibold text-red-700">
                              Delete all {folder.count} records + BB entries in this batch?
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => deleteBatch(folder.batchId)}
                                className="px-3 py-1.5 bg-red-600 text-white text-[11px] font-semibold rounded-lg hover:bg-red-700"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteBatch(null)}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {expandedBatch === folder.batchId && (
                        <div className="border-t border-emerald-100 overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-emerald-50/50 border-b border-emerald-100">
                                {[
                                  "Invoice",
                                  "Pay Head",
                                  "Details",
                                  "Amount",
                                  "Tax",
                                  "Net",
                                  "Emp",
                                  "Date",
                                  "Bank",
                                  "Remarks",
                                  "Edit",
                                  "Delete",
                                ].map((h) => (
                                  <th
                                    key={h}
                                    className={`px-3 py-2.5 text-[10px] font-medium text-emerald-800 uppercase tracking-wide whitespace-nowrap ${
                                      h === "Edit" || h === "Delete" ? "text-center" : "text-left"
                                    }`}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {expandedRows.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                    {row.invoices?.invoice_number || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                                    {row.pay_head || "—"}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {editingId === row.id ? (
                                      <input
                                        value={editData.payment_details}
                                        onChange={(e) => setEditData({ ...editData, payment_details: e.target.value })}
                                        className="w-[120px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                                      />
                                    ) : (
                                      <span className="text-slate-500 text-[11px] max-w-[140px] truncate block">
                                        {row.payment_details || "—"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {editingId === row.id ? (
                                      <input
                                        value={editData.amount_paid}
                                        onChange={(e) => setEditData({ ...editData, amount_paid: e.target.value })}
                                        className="w-[80px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                                      />
                                    ) : (
                                      <span className="font-mono text-[11px] font-medium text-[#0f172a]">
                                        ₹{Number(row.amount_paid).toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {editingId === row.id ? (
                                      <input
                                        value={editData.income_tax_deducted}
                                        onChange={(e) => setEditData({ ...editData, income_tax_deducted: e.target.value })}
                                        className="w-[70px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                                      />
                                    ) : (
                                      <span className="font-mono text-[11px] text-amber-700">
                                        ₹{Number(row.income_tax_deducted).toLocaleString("en-IN")}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-emerald-700">
                                    {editingId === row.id
                                      ? `₹${(Number(editData.amount_paid || 0) - Number(editData.income_tax_deducted || 0)).toLocaleString("en-IN")}`
                                      : `₹${(Number(row.amount_paid || 0) - Number(row.income_tax_deducted || 0)).toLocaleString("en-IN")}`}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {editingId === row.id ? (
                                      <input
                                        value={editData.employee_count}
                                        onChange={(e) => setEditData({ ...editData, employee_count: e.target.value })}
                                        className="w-[50px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all text-center"
                                      />
                                    ) : (
                                      <span className="text-slate-600 text-[11px]">{row.employee_count || "—"}</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                                    {editingId === row.id ? (
                                      <input
                                        type="date"
                                        value={editData.payment_date}
                                        onChange={(e) => setEditData({ ...editData, payment_date: e.target.value })}
                                        className="w-[110px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                                      />
                                    ) : (
                                      fmtDate(row.payment_date)
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 text-[10px] whitespace-nowrap">
                                    {editingId === row.id ? (
                                      <select
                                        value={editData.bank_id}
                                        onChange={(e) => setEditData({ ...editData, bank_id: e.target.value })}
                                        className="w-[100px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none"
                                      >
                                        <option value="">—</option>
                                        {banks.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            {b.bank_name}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      row.bank_master?.bank_name || "—"
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {editingId === row.id ? (
                                      <input
                                        value={editData.remarks}
                                        onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
                                        className="w-[100px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all"
                                      />
                                    ) : (
                                      <span className="text-slate-400 text-[10px] max-w-[100px] truncate italic block">
                                        {row.remarks || "—"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {canEdit && !isIntern && (
                                      editingId === row.id ? (
                                        <button
                                          onClick={async () => {
                                            await handleUpdate();
                                            await loadBatch(expandedBatch);
                                          }}
                                          className="h-7 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-semibold hover:bg-emerald-100 transition-colors whitespace-nowrap"
                                        >
                                          Save
                                        </button>
                                      ) : isLocked(row.payment_date) && role !== "admin" ? (
                                        <button
                                          disabled
                                          className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed mx-auto"
                                          title="Locked — entries older than 45 days can only be edited by an Admin."
                                        >
                                          <Lock className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => startEdit(row)}
                                          className="w-7 h-7 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 flex items-center justify-center hover:bg-amber-100 transition-colors mx-auto"
                                          title="Edit row"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                      )
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {canDelete && !isIntern && (
                                      confirmDeleteRow === row.id ? (
                                        <div className="flex items-center gap-1 justify-center">
                                          <button
                                            onClick={() => handleDeleteBulkRow(row.id)}
                                            className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
                                          >
                                            Yes
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteRow(null)}
                                            className="px-2 py-1 border border-gray-200 text-gray-500 text-[10px] rounded-lg hover:bg-gray-50 transition-colors"
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : isLocked(row.payment_date) && role !== "admin" ? (
                                        <button
                                          disabled
                                          className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed mx-auto"
                                          title="Locked — entries older than 45 days can only be deleted by an Admin."
                                        >
                                          <Lock className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteRow(row.id)}
                                          disabled={deletingBatchId === row.id}
                                          className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-colors ${
                                            deletingBatchId === row.id
                                              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                              : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                          }`}
                                          title="Delete row"
                                        >
                                          {deletingBatchId === row.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-3 h-3" />
                                          )}
                                        </button>
                                      )
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="px-5 py-2.5 bg-emerald-50/30 border-t border-emerald-100 flex items-center justify-between">
                            <p className="text-[11px] text-emerald-700 font-medium">
                              {expandedRows.length} record{expandedRows.length !== 1 ? "s" : ""} in this batch
                            </p>
                            <button
                              onClick={collapseBatch}
                              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800"
                            >
                              Collapse ↑
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 opacity-50" />
                    </div>
                    <p className="text-sm">
                      {search ? "No matching batches found" : "No OS bulk uploads yet"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* SINGLE */}
            {viewTab === "single" && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#f7f8fb] border-b border-slate-200">
                        {[
                          "Date",
                          "Invoice / Client",
                          "Pay Head",
                          "Details",
                          "Amount",
                          "Tax",
                          "Net",
                          "Emp",
                          "Bank",
                          "Bill",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-[11.5px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap ${
                              h === "Actions" ? "text-center" : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSingleRecords.map((row, idx) => {
                        const bb = bbMap[row.id] || { total_bb: 0, total_bb_emp: 0, count: 0 };
                        const netAmt = Math.max(
                          (parseFloat(row.amount_paid) || 0) -
                            bb.total_bb -
                            (parseFloat(row.income_tax_deducted) || 0),
                          0
                        );
                        const isEditing = editingId === row.id;
                        return (
                          <tr
                            key={row.id}
                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                              idx === filteredSingleRecords.length - 1 ? "border-b-0" : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-slate-600 text-[11.5px] whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editData.payment_date}
                                  onChange={(e) => setEditData({ ...editData, payment_date: e.target.value })}
                                  className="w-[110px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white"
                                />
                              ) : (
                                fmtDate(row.payment_date)
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {row.invoice_id ? (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                  <FileText size={10} />
                                  {row.invoices?.invoice_number || "Inv"}
                                </span>
                              ) : (
                                <span className="text-slate-700 text-[11.5px]">
                                  {row.clients_master?.client_name || "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[12.5px] whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  value={editData.pay_head || row.pay_head || ""}
                                  onChange={(e) => setEditData({ ...editData, pay_head: e.target.value })}
                                  className="w-[100px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white"
                                />
                              ) : (
                                row.pay_head || "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11.5px] max-w-[150px] truncate">
                              {isEditing ? (
                                <input
                                  value={editData.payment_details}
                                  onChange={(e) => setEditData({ ...editData, payment_details: e.target.value })}
                                  className="w-[140px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white"
                                />
                              ) : (
                                row.payment_details || "—"
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono font-medium text-[#0f172a] text-[12.5px]">
                              {isEditing ? (
                                <input
                                  value={editData.amount_paid}
                                  onChange={(e) => setEditData({ ...editData, amount_paid: e.target.value })}
                                  className="w-[90px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white"
                                />
                              ) : (
                                `₹ ${Number(row.amount_paid).toLocaleString("en-IN")}`
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-amber-700 text-[12.5px]">
                              {isEditing ? (
                                <input
                                  value={editData.income_tax_deducted}
                                  onChange={(e) => setEditData({ ...editData, income_tax_deducted: e.target.value })}
                                  className="w-[80px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white"
                                />
                              ) : (
                                `₹ ${Number(row.income_tax_deducted).toLocaleString("en-IN")}`
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-emerald-700 text-[12.5px] font-semibold">
                              {isEditing
                                ? `₹ ${(Number(editData.amount_paid || 0) - Number(editData.income_tax_deducted || 0)).toLocaleString("en-IN")}`
                                : `₹ ${netAmt.toLocaleString("en-IN")}`}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600 text-[11.5px]">
                              {isEditing ? (
                                <input
                                  value={editData.employee_count}
                                  onChange={(e) => setEditData({ ...editData, employee_count: e.target.value })}
                                  className="w-[50px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-[#1e3a5f] focus:bg-white text-center"
                                />
                              ) : (
                                row.employee_count > 0 ? row.employee_count : "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11.5px]">
                              {isEditing ? (
                                <select
                                  value={editData.bank_id}
                                  onChange={(e) => setEditData({ ...editData, bank_id: e.target.value })}
                                  className="w-[110px] border border-slate-200 bg-[#f7f8fb] rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none"
                                >
                                  <option value="">—</option>
                                  {banks.map((b) => (
                                    <option key={b.id} value={b.id}>{b.bank_name}</option>
                                  ))}
                                </select>
                              ) : (
                                row.bank_master?.bank_name || "—"
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  row.is_billable
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {row.is_billable ? "✓ Bill" : "No"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openDrilldown(row)}
                                  className="w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                                  title="View BB"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {!isIntern && (
                                  <button
                                    onClick={() => openBbModal(row)}
                                    className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"
                                    title="Add BB"
                                  >
                                    <CornerDownLeft className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canEdit && !isIntern && (
                                  isEditing ? (
                                    <button
                                      onClick={handleUpdate}
                                      className="h-8 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors"
                                    >
                                      Save
                                    </button>
                                  ) : isLocked(row.payment_date) && role !== "admin" ? (
                                    <button
                                      disabled
                                      className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed"
                                      title="Locked — entries older than 45 days can only be edited by an Admin."
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => startEdit(row)}
                                      className="w-8 h-8 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 flex items-center justify-center hover:bg-amber-100 transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                                {canDelete && !isIntern && (
                                  isEditing ? (
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  ) : isLocked(row.payment_date) && role !== "admin" ? (
                                    <button
                                      disabled
                                      className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center cursor-not-allowed"
                                      title="Locked — entries older than 45 days can only be deleted by an Admin."
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteSingle(row.id)}
                                      className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!filteredSingleRecords.length && (
                  <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      <FileText className="w-5 h-5 opacity-50" />
                    </div>
                    <p className="text-sm">
                      {search ? "No matching records found" : "No manual OS entries yet"}
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-100 px-5 py-2.5 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Showing{" "}
                    <span className="bg-[#eef3fa] text-[#1e3a5f] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                      {filteredSingleRecords.length}
                    </span>{" "}
                    records
                  </div>
                  <div className="text-[11px] text-slate-300">Manual entries</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BB MODAL */}
      {bbRow && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CornerDownLeft className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold">Add Bounce Back</h4>
                  <p className="text-white/70 text-xs">
                    {bbRow.invoices?.invoice_number || bbRow.payout_ref_no || "OS Payout"}
                    &nbsp;·&nbsp;Paid: {fmtCur(bbRow.amount_paid)}
                  </p>
                </div>
              </div>
              <button onClick={() => setBbRow(null)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(bbMap[bbRow.id]?.count || 0) > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs">
                  <p className="text-rose-700 font-semibold mb-1">Existing Bounce Backs:</p>
                  <div className="flex justify-between">
                    <span className="text-rose-600">Total BB so far</span>
                    <span className="font-bold text-rose-700">{fmtCur(bbMap[bbRow.id].total_bb)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600">Remaining</span>
                    <span className="font-bold text-emerald-700">
                      {fmtCur((parseFloat(bbRow.amount_paid) || 0) - (bbMap[bbRow.id]?.total_bb || 0))}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">OS Amount Paid</span>
                  <span className="font-bold text-gray-800">{fmtCur(bbRow.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>This Bounce Back</span>
                  <span className="font-bold">
                    −{bbForm.bb_amount ? fmtCur(parseFloat(bbForm.bb_amount) || 0) : "₹0"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1">
                  <span className="font-semibold text-gray-700">Net Approved (after this BB)</span>
                  <span className="font-bold text-emerald-600">
                    {fmtCur(
                      Math.max(
                        (parseFloat(bbRow.amount_paid) || 0) -
                          (bbMap[bbRow.id]?.total_bb || 0) -
                          (parseFloat(bbForm.bb_amount) || 0) -
                          (parseFloat(bbRow.income_tax_deducted) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                  BB Date *
                </label>
                <input
                  type="date"
                  value={bbForm.bb_date}
                  onChange={(e) => setBbForm((p) => ({ ...p, bb_date: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-gray-800 ${
                    bbErrors.bb_date ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
                  }`}
                />
                {bbErrors.bb_date && <p className="text-xs text-red-500 mt-1">{bbErrors.bb_date}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                    BB Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-rose-500 text-sm font-medium">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={bbForm.bb_amount}
                      onChange={(e) => {
                        setBbForm((p) => ({ ...p, bb_amount: e.target.value.replace(/[^0-9.]/g, "") }));
                        setBbErrors((p) => ({ ...p, bb_amount: "" }));
                      }}
                      className={`w-full border rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 text-gray-800 placeholder-gray-400 ${
                        bbErrors.bb_amount ? "border-red-400 bg-red-50" : "border-rose-200 bg-rose-50"
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {bbErrors.bb_amount && <p className="text-xs text-red-500 mt-1">{bbErrors.bb_amount}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                    BB Emp Count
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bbForm.bb_emp_count}
                    onChange={(e) => setBbForm((p) => ({ ...p, bb_emp_count: e.target.value.replace(/[^0-9]/g, "") }))}
                    className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Original: {bbRow.employee_count || 0}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={bbForm.remarks}
                  onChange={(e) => setBbForm((p) => ({ ...p, remarks: e.target.value }))}
                  className="w-full border border-gray-200 bg-white text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                  placeholder="Reason for bounce back..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
                💡 Saving will auto-create a <strong>Credit bank entry</strong> (flow: os_bounce_back).
              </div>
            </div>

            <div className="px-5 py-4 border-t flex gap-3">
              <button
                onClick={() => setBbRow(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveBB}
                disabled={bbSaving || isIntern}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bbSaving ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
                {bbSaving ? "Saving…" : "Save Bounce Back"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRILLDOWN MODAL */}
      {drillRow && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold">Bounce Back Breakdown</h4>
                <p className="text-white/70 text-xs">
                  {drillRow.invoices?.invoice_number || drillRow.payout_ref_no || "OS Payout"}
                  &nbsp;·&nbsp;Original: {fmtCur(drillRow.amount_paid)}
                </p>
              </div>
              <button onClick={() => setDrillRow(null)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {drillLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : drillData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No bounce backs found.</p>
              ) : (
                <>
                  {drillData.map((bb) => (
                    <div
                      key={bb.id}
                      className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-rose-700 text-sm">{bb.bb_ref_no}</span>
                          <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
                            {fmtDate(bb.bb_date)}
                          </span>
                          {bb.bb_emp_count > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {bb.bb_emp_count} emp
                            </span>
                          )}
                        </div>
                        {bb.remarks && <p className="text-xs text-gray-500 mt-0.5">{bb.remarks}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-rose-700">{fmtCur(bb.bb_amount)}</p>
                        {!isIntern && (
                          <button
                            onClick={() => deleteBB(bb, drillRow)}
                            className="text-[10px] text-red-400 hover:text-red-600 mt-0.5 flex items-center gap-0.5 ml-auto"
                          >
                            <Trash2 size={10} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">OS Amount Paid</span>
                      <span className="font-bold text-gray-800">{fmtCur(drillRow.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Total Bounce Back ({drillData.length})</span>
                      <span className="font-bold">
                        −
                        {fmtCur(drillData.reduce((s, b) => s + (parseFloat(b.bb_amount) || 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>TDS</span>
                      <span className="font-bold">−{fmtCur(drillRow.income_tax_deducted || 0)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1">
                      <span className="font-bold text-gray-700">Net Approved</span>
                      <span className="font-bold text-emerald-600 text-base">
                        {fmtCur(
                          Math.max(
                            (parseFloat(drillRow.amount_paid) || 0) -
                              drillData.reduce((s, b) => s + (parseFloat(b.bb_amount) || 0), 0) -
                              (parseFloat(drillRow.income_tax_deducted) || 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t flex gap-2">
              {!isIntern && (
                <button
                  onClick={() => {
                    setDrillRow(null);
                    openBbModal(drillRow);
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition flex items-center justify-center gap-2"
                >
                  <CornerDownLeft size={14} />
                  Add Another BB
                </button>
              )}
              <button
                onClick={() => setDrillRow(null)}
                className="flex-1 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999999]">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${
              toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OsPayoutRecordsView;