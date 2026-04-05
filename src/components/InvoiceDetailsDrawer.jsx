import React from "react";
import { X, FileText, Calendar, Building2, Users } from "lucide-react";
import Card from "./ui/Card";
import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

const InvoiceDetailsDrawer = ({ invoice, isOpen, onClose }) => {
  const [details, setDetails] = useState(null);
  useEffect(() => {
    if (!invoice) return;

    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          clients_master(client_name),
          departments_master(dept_name),
          entity_master(entity_name)
        `
        )
        .eq("id", invoice.dbId)
        .single();

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

      setDetails(data);
    };

    fetchDetails();
  }, [invoice]);
  if (!isOpen || !invoice) return null;

  const formatCurrency = (val) =>
    `₹ ${Number(val || 0).toLocaleString("en-IN")}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Invoice Details
            </h2>
            <p className="text-xs text-gray-500">#{invoice.id}</p>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-gray-800" />
          </button>
        </div>

        {/* Info Cards */}
        <div className="space-y-4">
          <Card className="border-gray-200">
            <Card.Content className="p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase">Client</p>
              <p className="font-semibold flex items-center">
                <Users className="w-4 h-4 mr-2 text-gray-400" />
                {details?.clients_master?.client_name || invoice.client}
              </p>
            </Card.Content>
          </Card>

          <Card className="border-gray-200">
            <Card.Content className="p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase">Department</p>
              <p className="font-semibold">
                {details?.departments_master?.dept_name || invoice.dept}
              </p>
            </Card.Content>
          </Card>

          <Card className="border-gray-200">
            <Card.Content className="p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase">Entity</p>
              <p className="font-semibold flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                {details?.entity_master?.entity_name || invoice.entity}
              </p>
            </Card.Content>
          </Card>

          <Card className="border-gray-200">
            <Card.Content className="p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase">Invoice Value</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(details?.invoice_value || invoice.invValue)}
              </p>
            </Card.Content>
          </Card>

          <Card className="border-gray-200">
            <Card.Content className="p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase">Outstanding</p>
              <p className="text-lg font-bold text-rose-600">
                {formatCurrency(details?.receivable_amount || invoice.notRecvd)}
              </p>
            </Card.Content>
          </Card>

          <Card className="border-gray-200">
            <Card.Content className="p-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase">Delay Days</p>
              <p className="text-lg font-bold text-amber-600">
                {invoice.delayDays}
              </p>
            </Card.Content>
          </Card>
          {details?.departments_master?.dept_name === "Outsourcing" && (
            <Card className="border-amber-200 bg-amber-50">
              <Card.Content className="p-4 space-y-2">
                <p className="text-xs text-gray-500 uppercase">OS Details</p>

                <p>
                  <b>Employee Count:</b> {details.employee_count}
                </p>
                <p>
                  <b>Gross Value:</b> ₹ {details.gross_value}
                </p>
                <p>
                  <b>Net In Hand:</b> ₹ {details.net_in_hand}
                </p>
                <p>
                  <b>PF:</b> ₹ {details.co_pf}
                </p>
                <p>
                  <b>ESI:</b> ₹ {details.co_esi}
                </p>
                <p>
                  <b>CTC:</b> ₹ {details.ctc}
                </p>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsDrawer;
