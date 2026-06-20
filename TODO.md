## Task: Make every Bill field required except Penalty

- [x] Add `billErrors` state near the Bill modal state in `src/components/advance/Creditcardtracker.jsx`

- [ ] Add `validateBillForm()` validator for required fields (skip `penalty`)
- [ ] Wire validator into `saveBill()` and replace the old single-field check
- [ ] Reset errors on `openAddBill()` / `openEditBill()` and on Cancel close
- [ ] Update Bill modal JSX: add `*`, red borders, and inline error messages for required fields; exclude penalty validation

- [ ] Quick manual test: attempt saving with missing fields; ensure `0` passes for numeric required fields

