import React from "react";

const AddEntryModal = ({
  isOpen,
  onClose,
  newEntry,
  setNewEntry,
  onSave,
  banks,   // ✅ ADD THIS
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded w-96">
        <h2 className="text-lg font-bold mb-3">Add Bank Entry</h2>

        <input
          placeholder="Entity"
          className="w-full border p-2 mb-2"
          value={newEntry.entity}
          onChange={(e) => setNewEntry({ ...newEntry, entity: e.target.value })}
        />

        <input
          type="date"
          className="w-full border p-2 mb-2"
          value={newEntry.dateOfBankBal}
          onChange={(e) =>
            setNewEntry({ ...newEntry, dateOfBankBal: e.target.value })
          }
        />

        <input
          type="number"
          placeholder="Amount"
          className="w-full border p-2 mb-2"
          value={newEntry.amount}
          onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
        />

        <select
          className="w-full border p-2 mb-2"
          value={newEntry.bank_id || ""}
          onChange={(e) =>
            setNewEntry({ ...newEntry, bank_id: e.target.value })
          }
        >
          <option value="">Select Bank</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bank_name}
            </option>
          ))}
        </select>

        <input
          placeholder="Remarks"
          className="w-full border p-2 mb-2"
          value={newEntry.remarks}
          onChange={(e) =>
            setNewEntry({ ...newEntry, remarks: e.target.value })
          }
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEntryModal;
