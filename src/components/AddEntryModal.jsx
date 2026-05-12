import React, { useState } from "react";
import supabase from "../lib/supabaseClient";

const AddEntryModal = ({
  isOpen,
  onClose,
  newEntry,
  setNewEntry,
  onSave,
  banks,
  remainingBalance,
}) => {
  const [showAddBank, setShowAddBank] = useState(false);

  const [newBank, setNewBank] = useState({
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "",
    bank_code: "",
  });

  if (!isOpen) return null;

  // 🔥 SAVE NEW BANK
  const handleAddBank = async () => {
    if (!newBank.bank_name || !newBank.account_number) {
      alert("Fill required fields");
      return;
    }

    const { data, error } = await supabase
      .from("bank_master")
      .insert([newBank])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Error saving bank");
      return;
    }

    // ✅ auto select new bank
    setNewEntry({
      ...newEntry,
      bank_id: data.id,
      bank_code: data.bank_code,
      entity: "Verto India Pvt Ltd",
    });

    setShowAddBank(false);
    window.refreshBanks?.(); // 🔥 ADD THIS LINE
  };

  return (
    <>
      {/* MAIN MODAL */}
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-white p-4 rounded w-96">
          <h2 className="text-lg font-bold mb-3">Add Bank Entry</h2>

          {/* ENTITY */}
          <input
            placeholder="Entity"
            className="w-full border p-2 mb-2"
            value={newEntry.entity || ""}
            onChange={(e) =>
              setNewEntry({ ...newEntry, entity: e.target.value })
            }
          />

          {/* DATE */}
          <input
            type="date"
            className="w-full border p-2 mb-2"
            value={newEntry.dateOfBankBal || ""}
            onChange={(e) =>
              setNewEntry({
                ...newEntry,
                dateOfBankBal: e.target.value,
              })
            }
          />
          {/* TRANSACTION MODE */}

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Transaction Type
            </label>

            <select
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={newEntry.transaction_mode || "credit"}
              onChange={(e) =>
                setNewEntry({
                  ...newEntry,
                  transaction_mode: e.target.value,
                })
              }
            >
              <option value="credit">Credit (+ Add Money)</option>

              <option value="debit">Debit (- Reduce Money)</option>

              <option value="total_update">Total Balance Update</option>
            </select>
          </div>

          {/* AMOUNT */}
          <input
            type="text"
            placeholder={
              newEntry.transaction_mode === "total_update"
                ? "Enter Actual Bank Balance"
                : "Enter Amount"
            }
            className="w-full border p-2 mb-2"
            value={newEntry.amount || ""}
            onChange={(e) => {
              const val = e.target.value;

              if (/^\d*\.?\d*$/.test(val)) {

                setNewEntry({ ...newEntry, amount: val });
              }
            }}
          />

          {/* BANK SELECT */}
          <select
            className="w-full border p-2 mb-2"
            value={newEntry.bank_id || ""}
            onChange={(e) => {
              if (e.target.value === "ADD_NEW") {
                setShowAddBank(true);
                return;
              }

              const selectedBank = banks.find((b) => b.id === e.target.value);

              setNewEntry({
                ...newEntry,
                bank_id: selectedBank?.id,
                bank_code: selectedBank?.bank_code,
                entity: selectedBank?.entity || "Verto India Pvt Ltd",
              });
            }}
          >
            <option value="">Select Bank</option>
            <option value="ADD_NEW">➕ Add Bank</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bank_name}
              </option>
            ))}
          </select>

          {/* REMARKS */}
          <input
            placeholder="Remarks"
            className="w-full border p-2 mb-2"
            value={newEntry.remarks || ""}
            onChange={(e) =>
              setNewEntry({
                ...newEntry,
                remarks: e.target.value,
              })
            }
          />

          {/* BUTTONS */}
          <div className="flex justify-end gap-2">
            <button onClick={onClose}>Cancel</button>
            <button
              className="bg-blue-600 text-white px-3 py-1 rounded"
              onClick={() => {
                if (!newEntry.bank_id) {
                  alert("Select Bank First");
                  return;
                }

                if (!newEntry.amount || Number(newEntry.amount) <= 0) {
                  alert("Enter valid amount");
                  return;
                }

                onSave();
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 ADD BANK MODAL */}
      {showAddBank && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-5 rounded w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Add New Bank</h2>

            <input
              placeholder="Bank Name"
              className="w-full border p-2 mb-2"
              onChange={(e) =>
                setNewBank({
                  ...newBank,
                  bank_name: e.target.value,
                })
              }
            />

            <input
              placeholder="Account Number"
              className="w-full border p-2 mb-2"
              onChange={(e) =>
                setNewBank({
                  ...newBank,
                  account_number: e.target.value,
                })
              }
            />

            <input
              placeholder="IFSC Code"
              className="w-full border p-2 mb-2"
              onChange={(e) =>
                setNewBank({
                  ...newBank,
                  ifsc_code: e.target.value,
                })
              }
            />

            <input
              placeholder="Branch Name"
              className="w-full border p-2 mb-2"
              onChange={(e) =>
                setNewBank({
                  ...newBank,
                  branch_name: e.target.value,
                })
              }
            />

            <input
              placeholder="Bank Code (HDFC01)"
              className="w-full border p-2 mb-2"
              onChange={(e) =>
                setNewBank({
                  ...newBank,
                  bank_code: e.target.value,
                })
              }
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddBank(false)}>Cancel</button>
              <button
                className="bg-green-600 text-white px-3 py-1 rounded"
                onClick={handleAddBank}
              >
                Save Bank
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddEntryModal;
