# Table Usage Mapping

## Database Tables & Component Relationships

Complete reference for every database table: purpose, columns, usage, components, and queries.

---

## Core Financial Tables

### 1. `invoices`

**Purpose**: Store all invoices created in the system

**Primary Key**: `id` (UUID)

**Columns**:
- `invoice_number` (text) - Unique invoice identifier
- `entity_id` (UUID) - FK to entities_master
- `client_name` (text) - Client name
- `invoice_value` (numeric) - Invoice amount
- `invoice_date` (date) - Invoice creation date
- `description` (text) - Invoice description
- `created_by` (text) - User email
- `created_at` (timestamp) - Server timestamp
- `updated_at` (timestamp) - Last modification

**Foreign Keys**:
- `entity_id` → entities_master(id)

**Operations Used**:
- **INSERT**: AddInvoiceModal creates invoice
- **SELECT**: Dashboard fetches for display
- **UPDATE**: Edit existing invoice
- **DELETE**: Soft delete (admin only)

**Components Using**:
- Dashboard.jsx
- AddInvoiceModal.jsx
- ProfitCenterPL.jsx
- Analyticsdashboard.jsx
- BankReco.jsx
- AuditLogPage.jsx

**Related Tables**:
- payments_received (one-to-many)
- bounce_back (one-to-many)
- credit_note_bad_debt (one-to-many)
- interest_penalty (one-to-many)

**Real-time Subscriptions**: Yes
- Used by Dashboard for live updates

**Query Examples**:
```sql
-- Get all invoices
SELECT * FROM invoices ORDER BY created_at DESC;

-- Get outstanding invoices
SELECT * FROM outstanding_invoice_view 
WHERE outstanding > 0;

-- Get invoices for specific client
SELECT * FROM invoices 
WHERE client_name = 'ABC Corp';

-- Get invoices by date range
SELECT * FROM invoices 
WHERE invoice_date BETWEEN '2024-06-01' AND '2024-06-30';
```

---

### 2. `payments_received`

**Purpose**: Track payments received against invoices

**Primary Key**: `id` (UUID)

**Columns**:
- `invoice_id` (UUID) - FK to invoices
- `payment_date` (date) - When payment received
- `payment_amount` (numeric) - Amount received
- `reference_number` (text) - Bank ref, cheque #, etc.
- `payment_method` (text) - cash, cheque, transfer, etc.
- `created_by` (text) - User email
- `created_at` (timestamp)
- `notes` (text) - Optional notes

**Foreign Keys**:
- `invoice_id` → invoices(id)

**Operations Used**:
- **INSERT**: AddPaymentReceivedModal records payment
- **SELECT**: Dashboard, reports
- **UPDATE**: Modify payment details
- **DELETE**: Remove payment

**Components Using**:
- Dashboard.jsx
- AddPaymentReceivedModal.jsx
- PaymentHistoryDrawer.jsx
- AuditLogPage.jsx

**Related Tables**:
- invoices (many-to-one)
- outstanding_invoice_view (used in calculations)

**Real-time Subscriptions**: Yes

**Query Examples**:
```sql
-- Get payments for invoice
SELECT * FROM payments_received 
WHERE invoice_id = '123';

-- Get total received
SELECT SUM(payment_amount) FROM payments_received 
WHERE invoice_id = '123';

-- Get recent payments
SELECT * FROM payments_received 
ORDER BY payment_date DESC LIMIT 100;
```

---

### 3. `payment_made_manual`

**Purpose**: Track manual payments made by company

**Primary Key**: `id` (UUID)

**Columns**:
- `reference_id` (text) - Reference number
- `entity_id` (UUID) - FK to entities_master
- `payment_to` (text) - Payee name
- `amount` (numeric) - Payment amount
- `payment_date` (date) - Payment date
- `payment_method` (text) - Payment method
- `created_by` (text) - User email
- `created_at` (timestamp)

**Foreign Keys**:
- `entity_id` → entities_master(id)

**Operations Used**:
- **INSERT**: AddPaymentMadeModal
- **SELECT**: Dashboard, BankReco
- **UPDATE**: Edit payment
- **DELETE**: Remove payment

**Components Using**:
- Dashboard.jsx
- AddPaymentMadeModal.jsx
- BankReco.jsx
- PaymentMadeHistoryDrawer.jsx

---

### 4. `bounce_back`

**Purpose**: Track bounced cheques or failed payments

**Primary Key**: `id` (UUID)

**Columns**:
- `invoice_id` (UUID) - FK to invoices
- `bounce_date` (date) - Date of bounce
- `reference_number` (text) - Cheque #, ref #
- `bounce_reason` (text) - Reason for bounce
- `created_by` (text) - User email
- `created_at` (timestamp)

**Foreign Keys**:
- `invoice_id` → invoices(id)

**Operations Used**:
- **INSERT**: AddBounceBackModal
- **SELECT**: Bouncebackpage, Dashboard
- **UPDATE**: Update bounce status
- **DELETE**: Remove bounce record

**Components Using**:
- Bouncebackpage.jsx
- BounceHistoryDrawer.jsx
- AddBounceBackModal.jsx
- Dashboard.jsx

---

### 5. `credit_note_bad_debt`

**Purpose**: Record credit notes and bad debt write-offs

**Primary Key**: `id` (UUID)

**Columns**:
- `invoice_id` (UUID) - FK to invoices
- `amount` (numeric) - Credit/bad debt amount
- `reason` (text) - Reason (discount, bad debt, etc.)
- `cn_date` (date) - Credit note date
- `status` (text) - pending, approved, rejected
- `created_by` (text) - User email
- `created_at` (timestamp)

**Foreign Keys**:
- `invoice_id` → invoices(id)

**Operations Used**:
- **INSERT**: AddCNBadDebtModal
- **SELECT**: CNBadDebtRecordsPage, Dashboard
- **UPDATE**: Change status
- **DELETE**: Remove credit note

**Components Using**:
- CNBadDebtRecordsPage.jsx
- CNHistoryDrawer.jsx
- AddCNBadDebtModal.jsx
- Dashboard.jsx

---

## Employee & Payroll Tables

### 6. `internal_team`

**Purpose**: Store employee master data

**Primary Key**: `id` (UUID)

**Columns**:
- `emp_code` (text) - Employee ID
- `emp_name` (text) - Employee name
- `entity_id` (UUID) - FK to entities_master
- `department_id` (UUID) - FK to departments_master
- `email` (text) - Employee email
- `phone` (text) - Phone number
- `designation` (text) - Job title
- `salary` (numeric) - Base salary
- `status` (text) - active, inactive, terminated
- `created_by` (text) - User email
- `created_at` (timestamp)

**Foreign Keys**:
- `entity_id` → entities_master(id)
- `department_id` → departments_master(id)

**Operations Used**:
- **INSERT**: AddInternalTeamModal
- **SELECT**: InternalTeamDetails, reports
- **UPDATE**: Edit employee details
- **DELETE**: Remove employee (cascades)

**Components Using**:
- InternalTeamDetails.jsx
- AddInternalTeamModal.jsx
- ExpenseRecordsView.jsx

**Related Tables**:
- employee_expense_payouts (one-to-many)
- internal_team_cost_history (one-to-many)
- user_roles (may reference this table)

---

### 7. `employee_expense_payouts`

**Purpose**: Track employee expense payouts and salaries

**Primary Key**: `id` (UUID)

**Columns**:
- `emp_code` (text) - Employee code
- `emp_name` (text) - Employee name
- `entity_id` (UUID) - FK to entities_master
- `department_id` (UUID) - FK to departments_master
- `amount` (numeric) - Payout amount
- `month` (text) - Month of payout (YYYY-MM)
- `batch_id` (UUID) - FK to bulk_upload_batches
- `status` (text) - pending, approved, paid
- `created_by` (text) - User email
- `created_at` (timestamp)

**Foreign Keys**:
- `entity_id` → entities_master(id)
- `department_id` → departments_master(id)
- `batch_id` → bulk_upload_batches(id)

**Operations Used**:
- **INSERT (bulk)**: AddExpenseDetailsManModal imports Excel
- **SELECT**: ExpenseRecordsView, Analyticsdashboard
- **UPDATE**: Change status
- **DELETE**: Remove payout (cascades from batch)

**Components Using**:
- AddExpenseDetailsManModal.jsx
- ExpenseRecordsView.jsx
- Analyticsdashboard.jsx

---

### 8. `bulk_upload_batches`

**Purpose**: Track bulk Excel uploads for payroll/expenses

**Primary Key**: `batch_id` (UUID)

**Columns**:
- `batch_id` (UUID)
- `created_by` (text) - User email
- `file_name` (text) - Original Excel filename
- `row_count` (integer) - Number of rows uploaded
- `status` (text) - pending, completed, failed
- `created_at` (timestamp)
- `completed_at` (timestamp, nullable)

**Operations Used**:
- **INSERT**: AddExpenseDetailsManModal creates batch
- **SELECT**: View batch history
- **UPDATE**: Mark as completed
- **DELETE**: Clean up old batches

**Related Tables**:
- employee_expense_payouts (one-to-many, cascade)

---

### 9. `internal_team_cost_history`

**Purpose**: Track historical cost changes for employees

**Primary Key**: `id` (UUID)

**Columns**:
- `internal_team_id` (UUID) - FK to internal_team
- `cost` (numeric) - Cost at this point in time
- `changed_by` (text) - User email
- `changed_at` (timestamp)
- `reason` (text) - Reason for change

**Foreign Keys**:
- `internal_team_id` → internal_team(id)

**Operations Used**:
- **INSERT**: Auto-logged on salary/cost change
- **SELECT**: View cost history

---

## Master Data Tables

### 10. `bank_master`

**Purpose**: Store bank information

**Columns**:
- `id` (UUID)
- `bank_name` (text) - Bank name
- `ifsc_code` (text) - IFSC code
- `account_number` (text, optional)
- `branch` (text, optional)

**Operations Used**:
- **SELECT**: Fetch for dropdowns in modals

**Components Using**:
- AddInvoiceModal.jsx
- AddPaymentReceivedModal.jsx

---

### 11. `clients_master`

**Purpose**: Store client/customer information

**Columns**:
- `id` (UUID)
- `client_name` (text) - Unique client name
- `email` (text, optional)
- `phone` (text, optional)
- `address` (text, optional)
- `gst_number` (text, optional)
- `created_at` (timestamp)

**Operations Used**:
- **SELECT**: Fetch for client search in modals
- **INSERT**: Create new client from modal

**Components Using**:
- AddInvoiceModal.jsx
- AddPaymentReceivedModal.jsx

**Search Pattern**: Used with search input in ClientSearchInput component

---

### 12. `entities_master`

**Purpose**: Store company entities

**Columns**:
- `id` (UUID)
- `entity_name` (text) - Entity name
- `gst_number` (text)
- `pan_number` (text)
- `address` (text)

**Operations Used**:
- **SELECT**: Fetch for entity selection in modals

**Components Using**:
- AddInvoiceModal.jsx
- AddInternalTeamModal.jsx
- All financial entry modals

---

### 13. `departments_master`

**Purpose**: Store organization departments

**Columns**:
- `id` (UUID)
- `dept_code` (text) - Department code
- `dept_name` (text) - Department name

**Operations Used**:
- **SELECT**: Fetch for department dropdown

**Components Using**:
- AddInternalTeamModal.jsx
- AddExpenseDetailsManModal.jsx
- Filters

---

## Advance & Credit Card Tables

### 14. `client_advance_tracker`

**Purpose**: Track advances given to clients

**Columns**:
- `id` (UUID)
- `client_name` (text)
- `advance_amount` (numeric)
- `advance_date` (date)
- `status` (text)

**Components Using**:
- Clientadvancetracker.jsx
- Addadvanceloanmodal.jsx

---

### 15. `credit_card_master`

**Purpose**: Store credit card master records

**Columns**:
- `id` (UUID)
- `card_number` (text, masked)
- `holder_name` (text)
- `entity_id` (UUID)
- `limit` (numeric)
- `status` (text)

**Components Using**:
- Addcreditcardmodal.jsx
- Creditcardtracker.jsx

---

### 16. `credit_card_bills`

**Purpose**: Track credit card bills

**Columns**:
- `id` (UUID)
- `card_id` (UUID) - FK
- `bill_amount` (numeric)
- `bill_date` (date)
- `due_date` (date)
- `status` (text)

---

## Authentication & Security Tables

### 17. `user_roles`

**Purpose**: Map users to roles for authorization

**Primary Key**: `email` (text)

**Columns**:
- `email` (text) - User email
- `role` (text) - admin, manager, employee, intern
- `assigned_by` (text) - Admin email
- `assigned_at` (timestamp)

**Operations Used**:
- **SELECT**: Fetch user role on login (AuthContext)
- **INSERT**: Assign role to new user
- **UPDATE**: Change user role
- **DELETE**: Remove user access

**Query Examples**:
```sql
-- Get user role
SELECT role FROM user_roles WHERE email = 'user@example.com';

-- Get all admins
SELECT * FROM user_roles WHERE role = 'admin';
```

**Components Using**:
- AuthContext.jsx (fetches on login)
- UserManagement.jsx (admin management)

---

### 18. `sessions`

**Purpose**: Track active user sessions for multi-device detection

**Columns**:
- `id` (UUID)
- `email` (text) - User email
- `session_token` (text) - Unique token
- `status` (text) - active, inactive
- `device_info` (text) - Browser/device info
- `created_at` (timestamp)

**Constraints**:
- UNIQUE(email, status='active') - Only one active session per user

**Operations Used**:
- **INSERT**: Create session on login
- **SELECT**: Validate session via RPC
- **UPDATE**: Mark as inactive
- **DELETE**: Clean up old sessions

**RPC Function**: `validate_session(p_email, p_token)`
- Checks if token matches latest session for email
- Used by AuthContext every 3 seconds

---

### 19. `user_shortcuts`

**Purpose**: Store user-customized keyboard shortcuts

**Columns**:
- `email` (text)
- `shortcuts` (jsonb) - Map of action ID → key combo
- `updated_at` (timestamp)

**Operations Used**:
- **SELECT**: Load shortcuts on login
- **UPSERT**: Save custom shortcuts

**Components Using**:
- Settingspage.jsx
- useKeyboardShortcuts.js

---

## Audit & Logging Tables

### 20. `audit_logs`

**Purpose**: Log all data modifications for compliance

**Columns**:
- `id` (UUID)
- `action` (text) - INSERT, UPDATE, DELETE, EXPORT
- `category` (text) - INVOICE, PAYMENT, PAYROLL, etc.
- `actor_email` (text) - User who performed action
- `user_role` (text) - Role of user
- `description` (text) - Human-readable description
- `reference_no` (text) - Invoice ID, payment ID, etc.
- `client_name` (text) - If applicable
- `amount` (numeric) - If applicable
- `new_values` (jsonb) - New data
- `old_values` (jsonb) - Old data (for updates)
- `created_at` (timestamp)

**Operations Used**:
- **INSERT**: Log every action (called from components)
- **SELECT**: View audit trail (AuditLogPage)

**Security**: Row-level security ensures only admins see all logs

**Components Using**:
- AuditLogpage.jsx (view logs)
- All modals (INSERT logs)
- All export functions (INSERT logs)

---

## Database Views

### View: `outstanding_invoice_view`

**Purpose**: Calculate real-time outstanding balances

**Definition**:
```sql
SELECT 
  invoices.id,
  invoices.invoice_number,
  invoices.client_name,
  invoices.invoice_value,
  COALESCE(SUM(payments_received.payment_amount), 0) as total_paid,
  invoices.invoice_value - COALESCE(SUM(payments_received.payment_amount), 0) as outstanding
FROM invoices
LEFT JOIN payments_received ON invoices.id = payments_received.invoice_id
GROUP BY invoices.id
```

**Usage**:
- Dashboard displays outstanding
- AddPaymentReceivedModal filters unpaid invoices
- Reports calculate receivables

**Components Using**:
- Dashboard.jsx
- AddPaymentReceivedModal.jsx

---

## Table Usage Summary

| Table | Operations | Read-Heavy | Write-Heavy | Real-time |
|-------|-----------|-----------|-----------|-----------|
| invoices | CRUD + Subscribe | Yes | No | Yes |
| payments_received | CRUD + Subscribe | Yes | No | Yes |
| payment_made_manual | CRUD | Yes | No | No |
| bounce_back | CRUD | No | No | No |
| credit_note_bad_debt | CRUD | No | No | No |
| internal_team | CRUD | Yes | No | No |
| employee_expense_payouts | CRUD (bulk) | Yes | Yes | No |
| bulk_upload_batches | CR + Update | No | Yes | No |
| user_roles | SELECT + Insert | Yes | No | No |
| sessions | CRUD + RPC | Yes | Yes | No |
| audit_logs | INSERT + SELECT | Yes | Yes | No |
| Master tables | SELECT only | Yes | No | No |

---

## Query Performance Tips

### Indexed Columns (fast queries)
- `invoices.invoice_date`
- `invoices.entity_id`
- `payments_received.payment_date`
- `internal_team.emp_code`
- `audit_logs.created_at`
- `audit_logs.actor_email`

### Avoid N+1 Queries
```javascript
// Bad: Query inside loop
invoices.forEach(inv => {
  const payments = await supabase
    .from('payments_received')
    .select()
    .eq('invoice_id', inv.id)
})

// Good: Single query with joins
const { data } = await supabase
  .from('invoices')
  .select('*, payments_received(*)')
```

### Use Views for Complex Calculations
```javascript
// Instead of calculating in code
const { data } = await supabase
  .from('outstanding_invoice_view')
  .select()
  .gt('outstanding', 0)
```

---

## Next Steps

1. **Review environment variables**: [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)
2. **Check dependencies**: [DEPENDENCIES.md](DEPENDENCIES.md)
3. **View diagrams**: [diagrams/](diagrams/)
