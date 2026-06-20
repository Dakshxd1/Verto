# Verto API Documentation

## Complete Supabase API Reference

---

## API Overview

**Base URL:** `https://[PROJECT-ID].supabase.co`  
**Version:** v1  
**Authentication:** JWT Token via Supabase Auth  
**Response Format:** JSON  
**Rate Limit:** Standard Supabase limits (1000 req/min per user)

---

## Authentication Endpoints

### Supabase Built-in Auth

#### 1. Sign In

```
POST /auth/v1/token?grant_type=password

Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "email_confirmed_at": "2026-01-01T00:00:00Z",
    "app_metadata": {},
    "user_metadata": {},
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

#### 2. Get Current User

```
GET /auth/v1/user
Headers: Authorization: Bearer {access_token}

Response:
{
  "id": "user_id",
  "email": "user@example.com",
  "user_metadata": {}
}
```

#### 3. Refresh Token

```
POST /auth/v1/token?grant_type=refresh_token

Body:
{
  "refresh_token": "refresh_token"
}

Response:
{
  "access_token": "new_jwt_token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### 4. Sign Out

```
POST /auth/v1/logout
Headers: Authorization: Bearer {access_token}

Response:
{ "success": true }
```

---

## Core Financial APIs

### Invoice Management

#### Create Invoice

```
POST /rest/v1/invoices
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "invoice_number": "INV-2026-001",
  "entity_name": "Verto India Pvt Ltd",
  "client_name": "Client A",
  "ledger_name": "Client A Ledger",
  "invoice_value": 100000,
  "tds_percent": 5,
  "tds_amount": 5000,
  "verto_fee": 10000,
  "gst_amount": 1800,
  "gross_receivable": 106800,
  "net_receivable": 101800,
  "invoice_date": "2026-06-01",
  "impact_month": "2026-06",
  "expected_collection_date": "2026-06-15",
  "dept_code": "OS",
  "pay_head": "Service Revenue",
  "bank_id": 1,
  "invoice_description": "Monthly service charges"
}

Response:
{
  "id": 123,
  "invoice_number": "INV-2026-001",
  "created_at": "2026-06-01T10:30:00Z",
  ... [all fields]
}
```

#### Read Invoice

```
GET /rest/v1/invoices?invoice_number=eq.INV-2026-001
Headers: Authorization: Bearer {access_token}

Response:
[
  {
    "id": 123,
    "invoice_number": "INV-2026-001",
    ... [all fields]
  }
]
```

#### Query with Filters

```
GET /rest/v1/invoices?entity_name=eq.Verto%20India%20Pvt%20Ltd&invoice_date=gte.2026-06-01&invoice_date=lte.2026-06-30&select=*
Headers: Authorization: Bearer {access_token}

Query Operators:
  eq    - equals
  neq   - not equals
  gt    - greater than
  gte   - greater than or equal
  lt    - less than
  lte   - less than or equal
  like  - text pattern match
  in    - value in list
  order_by=invoice_date.desc  - sort descending
  limit=50                     - limit results
  offset=100                   - pagination
```

#### Update Invoice

```
PATCH /rest/v1/invoices?id=eq.123
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "invoice_value": 105000,
  "tds_percent": 5,
  "updated_at": "2026-06-02T10:30:00Z"
}

Response:
[
  {
    "id": 123,
    ... [updated fields]
  }
]
```

#### Delete Invoice

```
DELETE /rest/v1/invoices?id=eq.123
Headers: Authorization: Bearer {access_token}

Response:
[] (empty array on success)
```

---

### Payment Received APIs

#### Record Payment

```
POST /rest/v1/payments_received
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "invoice_id": 123,
  "amount_received": 50000,
  "payment_date": "2026-06-05",
  "bank_id": 1,
  "remarks": "Partial payment received"
}

Response:
{
  "id": 456,
  "invoice_id": 123,
  "payment_ref": "PR-050626-01",
  "amount_received": 50000,
  "payment_date": "2026-06-05",
  "created_at": "2026-06-05T14:20:00Z"
}
```

#### Fetch Payments for Invoice

```
GET /rest/v1/payments_received?invoice_id=eq.123
Headers: Authorization: Bearer {access_token}

Response:
[
  {
    "id": 456,
    "payment_ref": "PR-050626-01",
    "amount_received": 50000,
    ... [all fields]
  },
  {
    "id": 457,
    "payment_ref": "PR-050626-02",
    "amount_received": 30000,
    ...
  }
]
```

---

### Outstanding Invoice View API

#### Query Outstanding Invoices

```
GET /rest/v1/outstanding_invoice_view?outstanding=gt.0&order_by=invoice_date.desc
Headers: Authorization: Bearer {access_token}

Response:
[
  {
    "id": 123,
    "invoice_number": "INV-2026-001",
    "client_name": "Client A",
    "net_receivable": 100000,
    "total_collected": 50000,
    "outstanding": 50000,
    "expected_collection_date": "2026-06-15"
  }
]
```

---

## Employee & Payroll APIs

### Internal Team

#### Create Employee

```
POST /rest/v1/internal_team
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "emp_code": "EMP-2026-001",
  "name": "John Doe",
  "email": "john@company.com",
  "designation": "Senior Developer",
  "department": "Engineering",
  "entity": "Verto India Pvt Ltd",
  "ctc": 1200000,
  "pf": 150000,
  "esi": 50000,
  "doj": "2024-01-15",
  "cost_head_breakup": {
    "ops": 60,
    "temp": 20,
    "rec": 10,
    "projects": 10
  },
  "client_focus": [
    {"clientName": "Client A", "percentage": 50},
    {"clientName": "Client B", "percentage": 50}
  ]
}

Response:
{
  "id": 789,
  "emp_code": "EMP-2026-001",
  "created_at": "2026-06-01T09:00:00Z",
  ... [all fields]
}
```

#### Fetch Employee

```
GET /rest/v1/internal_team?emp_code=eq.EMP-2026-001
Headers: Authorization: Bearer {access_token}

Response:
[
  {
    "id": 789,
    "emp_code": "EMP-2026-001",
    "name": "John Doe",
    ... [all fields]
  }
]
```

#### Update Employee

```
PATCH /rest/v1/internal_team?id=eq.789
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "ctc": 1300000,
  "pf": 160000,
  "cost_head_breakup": {
    "ops": 70,
    "temp": 10,
    "rec": 10,
    "projects": 10
  }
}

Response:
[
  {
    "id": 789,
    "ctc": 1300000,
    ... [updated fields]
  }
]
```

---

### Bulk Payout Upload

#### Upload Bulk Payroll

```
POST /rest/v1/bulk_upload_batches
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "batch_code": "BATCH-2026-06-001",
  "file_name": "payroll_june_2026.xlsx",
  "upload_date": "2026-06-01T10:00:00Z",
  "uploaded_by": "admin@company.com"
}

Response:
{
  "id": 1001,
  "batch_code": "BATCH-2026-06-001",
  "file_name": "payroll_june_2026.xlsx",
  "created_at": "2026-06-01T10:00:00Z"
}
```

#### Insert Payroll Entries (Bulk)

```
POST /rest/v1/employee_expense_payouts
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
[
  {
    "emp_code": "EMP-2026-001",
    "employee_name": "John Doe",
    "entity": "Verto India Pvt Ltd",
    "department": "Engineering",
    "payment_description": "June Salary",
    "payment_amount": 100000,
    "income_tax_deducted": 12000,
    "net_payment": 88000,
    "month_of_pay": "2026-06",
    "date_of_pay": "2026-06-30",
    "entry_type": "bulk",
    "bulk_batch_id": 1001,
    "bulk_batch_code": "BATCH-2026-06-001"
  },
  {
    "emp_code": "EMP-2026-002",
    "employee_name": "Jane Smith",
    ...
  }
]

Response:
[
  {
    "id": 2001,
    "emp_code": "EMP-2026-001",
    "created_at": "2026-06-01T10:05:00Z",
    ... [all fields]
  },
  {
    "id": 2002,
    ...
  }
]
```

---

## Advance & Credit Card APIs

### Client Advance Tracker

#### Create Advance

```
POST /rest/v1/client_advance_tracker
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "client_name": "ABC Corp",
  "ledger_name": "ABC Corp Ledger",
  "date": "2026-06-01",
  "amount": 500000,
  "interest": 25000,
  "paid_back": 0,
  "pending_due": 525000,
  "status": "Pending",
  "remarks": "Q2 Advance"
}

Response:
{
  "id": 3001,
  "client_name": "ABC Corp",
  "pending_due": 525000,
  "created_at": "2026-06-01T11:00:00Z"
}
```

#### Fetch Active Advances

```
GET /rest/v1/client_advance_tracker?status=neq.Closed&order_by=date.desc
Headers: Authorization: Bearer {access_token}

Response:
[
  {
    "id": 3001,
    "client_name": "ABC Corp",
    "amount": 500000,
    "paid_back": 0,
    "pending_due": 525000,
    "status": "Pending"
  }
]
```

#### Update Advance (Partial Payment)

```
PATCH /rest/v1/client_advance_tracker?id=eq.3001
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "paid_back": 250000,
  "pending_due": 275000,
  "status": "Partially Paid"
}

Response:
[
  {
    "id": 3001,
    "paid_back": 250000,
    "pending_due": 275000,
    "status": "Partially Paid"
  }
]
```

---

### Credit Card Management

#### Add Credit Card

```
POST /rest/v1/credit_card_master
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "bank": "HDFC Bank",
  "card_last4": "5432",
  "issued_to": "John Doe",
  "billing_cycle_from": "01",
  "billing_cycle_to": "28",
  "payment_date": "30"
}

Response:
{
  "id": 4001,
  "bank": "HDFC Bank",
  "card_last4": "5432",
  "created_at": "2026-06-01T12:00:00Z"
}
```

#### Record Credit Card Bill

```
POST /rest/v1/credit_card_bills
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "card_master_id": 4001,
  "amount": 50000,
  "penalty": 500,
  "cash_back": 1000,
  "amount_payable": 49500,
  "status": "pending"
}

Response:
{
  "id": 4101,
  "card_master_id": 4001,
  "amount_payable": 49500,
  "created_at": "2026-06-01T12:30:00Z"
}
```

---

## Admin & Security APIs

### User Role Management

#### Assign User Role

```
POST /rest/v1/user_roles
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "email": "newuser@company.com",
  "role": "manager"
}

Response:
{
  "id": 5001,
  "email": "newuser@company.com",
  "role": "manager",
  "created_at": "2026-06-01T13:00:00Z"
}
```

#### Update User Role

```
PATCH /rest/v1/user_roles?email=eq.newuser@company.com
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "role": "admin"
}

Response:
[
  {
    "id": 5001,
    "email": "newuser@company.com",
    "role": "admin"
  }
]
```

#### Fetch All Users

```
GET /rest/v1/user_roles
Headers: Authorization: Bearer {access_token}

Response:
[
  {
    "id": 5001,
    "email": "admin@company.com",
    "role": "admin"
  },
  {
    "id": 5002,
    "email": "manager@company.com",
    "role": "manager"
  }
]
```

---

### Audit Logging

#### Fetch Audit Logs

```
GET /rest/v1/audit_logs?order_by=created_at.desc&limit=100
Headers: Authorization: Bearer {access_token}

Query Examples:
  ?user_email=eq.john@company.com          - Logs for user
  ?action=eq.INSERT                        - Only inserts
  ?category=eq.Invoice                     - Only invoice changes
  ?created_at=gte.2026-06-01              - Date range
```

#### Create Audit Entry

```
POST /rest/v1/audit_logs
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "action": "INSERT",
  "category": "Invoice",
  "description": "Created invoice INV-2026-001",
  "entity_id": 123,
  "entity_type": "invoices",
  "new_values": { "invoice_number": "INV-2026-001", ... },
  "user_email": "admin@company.com",
  "user_role": "admin"
}

Response:
{
  "id": 6001,
  "action": "INSERT",
  "created_at": "2026-06-01T13:30:00Z"
}
```

---

## RPC Function Endpoints

### Validate Session

```
POST /rest/v1/rpc/validate_session
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "p_email": "user@company.com",
  "p_token": "session_token_value"
}

Response:
[
  {
    "valid": true
  }
]
```

### Delete Employee Expense Complete

```
POST /rest/v1/rpc/delete_employee_expense_complete
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json

Body:
{
  "p_payout_id": 2001
}

Response:
[
  {
    "success": true,
    "message": "Deleted successfully"
  }
]
```

---

## Real-time Subscriptions

### Subscribe to Invoice Changes

```javascript
const subscription = supabase
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'invoices' },
    (payload) => {
      console.log('Invoice change:', payload);
    }
  )
  .subscribe();

// Unsubscribe
supabase.removeSubscription(subscription);
```

### Subscribe to Payments

```javascript
supabase
  .on(
    'postgres_changes',
    { 
      event: 'INSERT',
      schema: 'public',
      table: 'payments_received',
      filter: 'invoice_id=eq.123'
    },
    (payload) => {
      console.log('Payment received:', payload.new);
    }
  )
  .subscribe();
```

---

## Error Responses

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET request completed |
| 201 | Created | POST request created resource |
| 204 | No Content | DELETE successful |
| 400 | Bad Request | Invalid JSON payload |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Unique constraint violation |
| 500 | Server Error | Database error |

### Error Response Format

```json
{
  "code": "PGRST116",
  "message": "JSON object requested, multiple rows returned",
  "details": "Only one row should return",
  "hint": "Consider using limit=1"
}
```

---

## API Rate Limiting

**Limits:**
- 1000 requests per minute per user
- 50 concurrent connections
- Max request size: 100MB

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

---

## API Examples

### Complete Invoice Lifecycle

```javascript
// 1. Create invoice
const invoice = await supabase
  .from('invoices')
  .insert([{
    invoice_number: 'INV-2026-001',
    client_name: 'ABC Corp',
    invoice_value: 100000,
    invoice_date: '2026-06-01'
  }])
  .select();

// 2. Query outstanding
const outstanding = await supabase
  .from('outstanding_invoice_view')
  .select('*')
  .eq('invoice_number', 'INV-2026-001');

// 3. Record payment
const payment = await supabase
  .from('payments_received')
  .insert([{
    invoice_id: invoice.data[0].id,
    amount_received: 50000,
    payment_date: '2026-06-05'
  }])
  .select();

// 4. Check updated outstanding
const updated = await supabase
  .from('outstanding_invoice_view')
  .select('outstanding')
  .eq('invoice_number', 'INV-2026-001');

console.log('Outstanding:', updated.data[0].outstanding); // 50000
```

---

## Security Best Practices

1. **Always use HTTPS** for all API calls
2. **Store JWT tokens securely** (not in localStorage)
3. **Implement token refresh** before expiration
4. **Use RLS policies** for row-level security
5. **Validate input** on both frontend and backend
6. **Audit all changes** via audit_logs table
7. **Rotate credentials** regularly

---

## Pagination Pattern

```
GET /rest/v1/invoices?limit=50&offset=0
GET /rest/v1/invoices?limit=50&offset=50   // Page 2
GET /rest/v1/invoices?limit=50&offset=100  // Page 3
```

---

## Filtering & Querying

```
// Multiple conditions (AND)
GET /rest/v1/invoices?entity_name=eq.Verto&status=eq.active

// OR conditions (use logical operators)
GET /rest/v1/invoices?or=(status.eq.active,status.eq.pending)

// Range queries
GET /rest/v1/invoices?invoice_date=gte.2026-06-01&invoice_date=lte.2026-06-30

// Text search
GET /rest/v1/invoices?client_name=like.%ABC%

// Ordering
GET /rest/v1/invoices?order_by=invoice_date.desc,id.asc

// Select specific columns
GET /rest/v1/invoices?select=id,invoice_number,client_name
```

---

*For frontend integration examples, see FRONTEND_DOCUMENTATION.md*  
*For database schema details, see DATABASE_SCHEMA.md*
