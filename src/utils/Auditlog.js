import supabase from "../lib/supabaseClient";

export const EXPORT_ACTIONS = {
  EXCEL:       "EXPORT_EXCEL",
  PDF:         "EXPORT_PDF",
  ZIP:         "EXPORT_ZIP",
  SALARY_SLIP: "EXPORT_SALARY_SLIP",
  TEMPLATE:    "EXPORT_TEMPLATE",
};

function getActorEmail() {
  return localStorage.getItem("verto_user_email") || "unknown";
}

export async function logExport({
  action,
  category,
  description,
  reference_no = null,
  client_name  = null,
  amount       = null,
  meta         = null,
}) {
  try {
    await supabase.from("audit_logs").insert([{
      action,
      category,
      actor_email:  getActorEmail(),
      description,
      reference_no: reference_no || null,
      client_name:  client_name  || null,
      amount:       amount != null ? Number(amount) : null,
      new_values:   meta || null,
      old_values:   null,
    }]);
  } catch {
    // never block the export for a logging failure
  }
}