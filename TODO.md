# TODO - Department Reports

## Step 1 — Repo exploration
- [x] Read `src/App.jsx` to locate navigation + render switch.

## Step 2 — Create Dept reports page
- [x] Create `src/pages/DeptReports.jsx` with sectioned UI and department permission logic.

## Step 3 — Wire into sidebar + router-like switch
- [x] Add nav item `dept-reports` to `src/App.jsx`.
- [x] Render `<DeptReports />` when `activeTab === "dept-reports"`.
- [x] Allow `role === "employee"` to see `dept-reports` in sidebar.

## Step 4 — Verify permissions
- [ ] Confirm: Admin sees department dropdown + all data per selected department.
- [ ] Confirm: Department employee sees no dropdown and only their department data.

## Step 5 — Verify data correctness
- [ ] Confirm: Section 1 KPIs + table match `client_wise_pl_view` columns.
- [ ] Confirm: MoM growth calculations behave correctly for empty/one-month ranges.
- [ ] Confirm: Collections + Working capital KPIs use RPCs correctly.

## Step 6 — Verify Excel export
- [ ] Confirm Excel includes current filtered Department P&L table rows + correct headers.

## Step 7 — Build validation
- [ ] Run lint/build and fix any TS/ESLint/runtime errors.

