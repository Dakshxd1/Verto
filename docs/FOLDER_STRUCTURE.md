# Folder Structure & Architecture

## Complete Project Directory Hierarchy

This document details every folder, its purpose, major files, dependencies, and usage patterns within the Verto financial dashboard project.

---

## Root Directory Structure

```
verto/
├── src/                          # Source code
├── public/                       # Static assets
├── docs/                         # Technical documentation (this folder)
├── DOCUMENTATION/                # High-level user documentation
├── dist/                         # Build output
├── node_modules/                 # Dependencies
├── .git/                         # Version control
├── .gitignore                    # Git ignore rules
├── index.html                    # HTML entry point
├── package.json                  # Project metadata & dependencies
├── package-lock.json             # Locked dependency versions
├── vite.config.js                # Vite build configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.cjs            # PostCSS configuration
├── eslint.config.js              # ESLint rules
├── README.md                     # Project README
├── QUESTIONS.md                  # Project questions document
└── temp.jsx                      # Temporary file
```

---

## `/src` - Application Source Code

### **Purpose**
Contains all React components, contexts, hooks, utilities, and configuration code.

### **Structure**
```
src/
├── components/                   # React components (40+)
├── context/                      # Context providers (3)
├── hooks/                        # Custom React hooks (3)
├── lib/                          # Library initialization
├── pages/                        # Full-page components (2)
├── utils/                        # Utility functions (7+)
├── assets/                       # Images, icons, media
├── App.jsx                       # Main application component
├── main.jsx                      # React entry point
├── App.css                       # App-level styles
├── index.css                     # Global styles
```

---

## `/src/components` - React Components (40+)

### **Purpose**
Houses all React components: page components, modals, drawers, UI elements, and view components.

### **File Organization**

#### Core Page Components
| File | Purpose | Dependencies |
|------|---------|--------------|
| `Dashboard.jsx` | Main dashboard view | supabase, useAuth, usePermissions, charts |
| `Analyticsdashboard.jsx` | Analytics & reporting | supabase, Recharts, exportToExcel |
| `BankReco.jsx` | Bank reconciliation view | supabase, Recharts |
| `InternalTeamDetails.jsx` | Employee management | supabase, useAuth, modals |
| `InternalCost.jsx` | Internal cost tracking | supabase |
| `LedgerPage.jsx` | Ledger view | supabase |
| `PettyCashPage.jsx` | Petty cash management | supabase |
| `ProfitCenterPL.jsx` | Profit center P&L | supabase, Recharts |
| `ClientPL.jsx` | Client P&L | supabase, Recharts |
| `Financeregisterpage.jsx` | Finance register | supabase |
| `Statutorypayoutpage.jsx` | Statutory payout | supabase |
| `Bouncebackpage.jsx` | Bounce back tracking | supabase |
| `CNBadDebtRecordsPage.jsx` | Credit note & bad debt | supabase |
| `Auditlogpage.jsx` | Audit log view | supabase, filtering |
| `AgingReport.jsx` | Aging report | supabase |

#### Modal Components (Data Entry)
| File | Purpose | Tables Used |
|------|---------|-------------|
| `AddInvoiceModal.jsx` | Create invoices | invoices |
| `AddPaymentReceivedModal.jsx` | Record payments received | payments_received |
| `AddPaymentMadeModal.jsx` | Record payments made | payment_made_manual |
| `AddExpenseDetailsModal.jsx` | Add expense details | employee_expense_payouts |
| `AddExpenseDetailsManModal.jsx` | Bulk employee expenses | employee_expense_payouts, bulk_upload_batches |
| `AddInternalTeamModal.jsx` | Add/edit employees | internal_team |
| `AddBounceBackModal.jsx` | Record bounce back | bounce_back |
| `AddCNBadDebtModal.jsx` | Credit note/bad debt | credit_note_bad_debt |
| `AddInterestPenaltyModal.jsx` | Add interest/penalty | invoices |
| `AddStatutoryPayoutModal.jsx` | Statutory payout | statutory_payout |

#### Drawer Components (View/Detail)
| File | Purpose | Usage |
|------|---------|-------|
| `InvoiceDetailsDrawer.jsx` | View invoice details | Dashboard |
| `PaymentHistoryDrawer.jsx` | View payment history | Dashboard |
| `PaymentMadeHistoryDrawer.jsx` | View payment made history | Dashboard |
| `BounceHistoryDrawer.jsx` | View bounce history | Bouncebackpage |
| `CNHistoryDrawer.jsx` | View credit note history | CNBadDebtRecordsPage |

#### Specialized Components
| File | Purpose | Dependencies |
|------|---------|--------------|
| `SessionMonitor.jsx` | Monitor active session | AuthContext, supabase |
| `LivePopup.jsx` | "We're Live!" popup | AuthContext |
| `Myaccountpage.jsx` | User account settings | AuthContext |
| `Settingspage.jsx` | Application settings | SettingsContext, useKeyboardShortcuts |
| `CommandPalette.jsx` | Command palette UI | All modals, navigation |
| `ShortcutsHelp.jsx` | Keyboard shortcuts help | shortcutDefaults |
| `InternModeBanner.jsx` | Intern mode indicator | useInternGuard |
| `ExpenseRecordsView.jsx` | Expense records view | supabase |
| `InternalExpenseViewModal.jsx` | View expense details | supabase |
| `ViewPaymentModal.jsx` | View payment details | supabase |
| `ViewPaymentReceivedModal.jsx` | View received payment | supabase |

### **Subdirectories**

#### `/src/components/ui` - Reusable UI Components
```
ui/
├── Button.jsx            # Button component with variants
├── Card.jsx              # Card container
├── Badge.jsx             # Badge/tag component
├── BorderGlow.jsx        # Glowing border effect
└── BorderGlow.css        # Border glow styles
```

**Purpose**: Reusable UI elements shared across components

**Key Features**:
- Tailwind-based styling
- Consistent design system
- Variants for different states

#### `/src/components/advance` - Advance & Credit Card Features
```
advance/
├── Addadvanceloanmodal.jsx           # Add advance/loan
├── Addcreditcardmodal.jsx            # Add credit card
├── Advancecreditcardlockerpage.jsx   # CC locker view
├── Clientadvancetracker.jsx          # Client advance tracking
├── Creditcardtracker.jsx             # Credit card tracking
└── Employeeadvancetracker.jsx        # Employee advance tracking
```

**Purpose**: Isolated module for advance/credit card features

**Dependencies**: supabase, AuthContext, UI components

---

## `/src/context` - Global State Management

### **Purpose**
React Context providers for managing global application state.

### **Files**

#### `AuthContext.jsx`
**Purpose**: Authentication and session management

**State Variables**:
- `user` - Current logged-in user (email, id, etc.)
- `role` - User's role (admin, manager, employee, intern)
- `loading` - Auth initialization loading state
- `showLivePopup` - Toggle "We're Live!" popup
- `sessionKicked` - Indicates user kicked out from another device

**Functions**:
- `fetchRole(email)` - Fetch user role from `user_roles` table
- `validateSession()` - RPC call to `validate_session`
- `startSessionPolling()` - Poll session every 3 seconds

**Dependencies**: supabase, popupManager, React hooks

**Tables Used**: 
- `user_roles` - Role mapping
- `sessions` - Session validation via RPC

#### `SettingsContext.jsx`
**Purpose**: User preferences and application settings

**State Variables**:
- `settings` - All user preferences
- `shortcuts` - Custom keyboard shortcuts
- `shortcutsLoaded` - Whether shortcuts loaded from DB

**Key Settings**:
- Appearance: color mode, contrast, font size
- Dashboard: period, landing page, currency format
- Notifications: sound, desktop notifications
- Keyboard shortcuts: individual toggles
- Finance: number display, negative display

**Storage**: localStorage + user_shortcuts table

#### `PermissionsContext.jsx`
**Purpose**: Role-based access control

**Permission Flags**:
- `isAdmin`, `isManager`, `isEmployee`, `isIntern`
- `canSave`, `canEdit`, `canDelete`, `canExport`, `canImport`
- `canApprove`, `canBulkUpload`

**Derives From**: AuthContext.role

---

## `/src/hooks` - Custom React Hooks

### **Purpose**
Encapsulated React logic for reuse across components.

### **Files**

#### `useAuth.js`
**Purpose**: Access current user and authentication state

**Returns**: User object, role, loading, showLivePopup, sessionKicked

**Used By**: Nearly all components

#### `usePermissions.js`
**Purpose**: Permission checking and role-based logic

**Returns**: role, loading, isAdmin/Manager/Employee/Intern, can* flags

**Used By**: Modal components, Admin panels

#### `useKeyboardShortcuts.js`
**Purpose**: Register and handle keyboard shortcuts

**Listens For**: keydown events, custom events from CommandPalette

**Dispatches**: Custom window events for shortcuts

**Used By**: App.jsx (setup), CommandPalette (registration)

#### `useInternGuard.js`
**Purpose**: Restrict features for intern role

**Returns**: Component visibility flags

**Used By**: restricted feature components

---

## `/src/lib` - Library & Client Initialization

### **Purpose**
Third-party library initialization and configuration.

### **Files**

#### `supabaseClient.js`
**Purpose**: Supabase client initialization

**Exports**: Default supabase client instance

**Configuration**:
```javascript
- URL: https://exykcukcvjdkrlbmxzdx.supabase.co
- Anon Key: sb_publishable_w3oXYlTqJVX09MiQGZN3Xw_gtk6R4R1
```

**Global Access**: `window.supabase` for debugging

**Used By**: Almost all components & utils

#### `utils.js`
**Purpose**: General utility functions

**Functions**: Helper functions (validation, formatting, etc.)

---

## `/src/pages` - Full-Page Components

### **Purpose**
Top-level page components rendered at specific routes.

### **Files**

#### `Login.jsx`
**Purpose**: Authentication & login interface

**Features**: Email/password login, credential validation

**Dependencies**: supabase, AuthContext

#### `UserManagement.jsx`
**Purpose**: Admin user management interface

**Features**: User CRUD, role assignment

**Dependencies**: supabase, usePermissions

---

## `/src/utils` - Utility Functions

### **Purpose**
Reusable functions for common tasks.

### **Files**

| File | Purpose | Functions |
|------|---------|-----------|
| `popupManager.js` | Session popup management | initializeSession, shouldShowPopup, markPopupShown, clearSession |
| `Auditlog.js` | Audit logging | logExport, EXPORT_ACTIONS constants |
| `exportExcel.js` | Excel export | exportToExcel function |
| `Invoiceexport.js` | Invoice-specific export | Invoice export logic |
| `salarySlip.js` | Salary slip generation | Generate salary slip PDFs |
| `shortcutDefaults.js` | Keyboard shortcuts | SHORTCUT_ACTIONS, DEFAULT_SHORTCUT_MAP, comboToString |
| `createBankEntry.js` | Bank entry creation | createBankEntry logic |

---

## `/src/assets` - Static Assets

### **Purpose**
Images, icons, and media files.

### **Typical Contents**
- Company logos
- Favicon
- Default images
- Icon assets

---

## `/public` - Static Files

### **Purpose**
Files served as-is without processing.

### **Typical Contents**
- robots.txt
- sitemap.xml
- Public images
- Manifest files

---

## `/.git` - Version Control

### **Purpose**
Git repository history and configuration.

### **Files**
- `.git/config` - Repository configuration
- `.git/HEAD` - Current branch reference
- `.git/objects` - Compressed object database
- `.git/refs` - Branch and tag references

---

## `/dist` - Build Output

### **Purpose**
Compiled production build generated by Vite.

### **Contents**
- Bundled JavaScript
- CSS files
- Optimized images
- HTML file
- Source maps

### **Chunk Organization** (from vite.config.js)
```
vendor-react      - React & React-DOM
vendor-motion     - Framer Motion
vendor-supabase   - Supabase JS client
vendor-xlsx       - Excel library
vendor-charts     - Recharts
chunk-pl          - P&L components
chunk-cost        - Internal cost
chunk-bank        - Bank reconciliation
chunk-modals      - Data entry modals
chunk-advance     - Advance/CC features
```

---

## `/node_modules` - Dependencies

### **Purpose**
Installed npm packages.

### **Not Committed**: Listed in .gitignore

### **Managed By**: package.json and package-lock.json

---

## `/DOCUMENTATION` - User Documentation

### **Purpose**
High-level user-facing documentation (created by previous task).

### **Contents**
- PROJECT_OVERVIEW.md
- QUICK_START_GUIDE.md
- FRONTEND_DOCUMENTATION.md
- DATABASE_SCHEMA.md
- API_DOCUMENTATION.md
- AUTH_FLOW.md
- DEPLOYMENT_GUIDE.md

---

## `/docs` - Technical Handover Documentation

### **Purpose**
This folder - comprehensive technical documentation for developers.

### **Contents**
- FOLDER_STRUCTURE.md (this file)
- SYSTEM_FLOW.md
- COMPONENT_TREE.md
- CONTEXTS.md
- HOOKS.md
- UTILITIES.md
- TABLE_USAGE_MAPPING.md
- ENVIRONMENT_VARIABLES.md
- DEPENDENCIES.md
- diagrams/ (Mermaid diagrams)

---

## Dependency Relationships Between Folders

```
┌─────────────────────────────────────────┐
│            main.jsx                     │
│  (src/ entry point)                     │
└────────────────┬────────────────────────┘
                 │
       ┌─────────┴──────────┐
       │                    │
   App.jsx          Context Providers
       │            (context/)
       │
    ┌──┴──┬────────┬──────┬────────┬──────┐
    │     │        │      │        │      │
Pages  Components Hooks  Utils  Context  Lib
(pages/)(components/) (hooks/)(utils/) (lib/)
    │        │        │       │         │
    │        │        │       │         │
    └────────┴────────┴───────┴─────────┘
             │
        ┌────┴───────┐
        │             │
    Supabase    Tailwind CSS
    (server)    (styling)
```

---

## Component Load Pattern

### **Lazy-Loaded Components** (React.lazy)
```javascript
// In App.jsx - loaded on-demand
const Dashboard = React.lazy(() => import("./components/Dashboard"))
const AnalyticsDashboard = React.lazy(() => import("./components/Analyticsdashboard"))
const InternalTeamDetails = React.lazy(() => import("./components/InternalTeamDetails"))
// ... etc
```

### **Statically-Imported Components** (immediate)
```javascript
// In App.jsx - always loaded
import AddInvoiceModal from "./components/AddInvoiceModal"
import AddPaymentReceivedModal from "./components/AddPaymentReceivedModal"
// ... etc
```

**Pattern**: Heavy page components are lazy-loaded; essential modals are static

---

## Files to Never Touch

⚠️ **Critical System Files**:
- `src/lib/supabaseClient.js` - Supabase credentials (hardcoded URL & key)
- `src/main.jsx` - React DOM rendering
- Context provider exports - Used everywhere

**Approach**: Always check usage before modifying

---

## File-to-Table Mapping

### Key Components → Database Tables

| Component | Primary Table | Secondary Tables |
|-----------|---------------|------------------|
| Dashboard | invoices | payments_received, bounce_back |
| AddInvoiceModal | invoices | entities_master, clients_master |
| AddPaymentReceivedModal | payments_received | invoices, advance_payments |
| InternalTeamDetails | internal_team | employee_expense_payouts |
| Analyticsdashboard | invoices | (all tables for analysis) |
| BankReco | payment_made_manual | invoices, payments_received |

---

## Performance Considerations

### Large Files (> 100KB)
- Dashboard.jsx - Complex rendering logic
- Analyticsdashboard.jsx - Multiple charts

### Memory-Heavy Operations
- Bulk Excel imports (AddExpenseDetailsManModal)
- Large data table rendering

### Optimization Techniques Used
1. **Code Splitting**: Manual chunks in vite.config.js
2. **Lazy Loading**: React.lazy for page components
3. **Memoization**: useMemo/useCallback in render-heavy components

---

## Key Usage Patterns

### Adding a New Feature
1. Create component in `src/components/`
2. If page-level: lazy-load in App.jsx
3. If modal: static import in App.jsx
4. Use existing contexts (AuthContext, SettingsContext)
5. Query via supabaseClient
6. Log to audit_logs if data-modifying

### Adding Utility Function
1. Create in `src/utils/filename.js`
2. Export named functions
3. Import in components as needed
4. Prefer stateless functions

### Adding Global State
1. Create context in `src/context/name.jsx`
2. Wrap App.jsx in provider in main.jsx
3. Export useContext hook for access
4. Use in any component

---

## Summary Table

| Folder | # Files | Purpose | Key Dependencies |
|--------|---------|---------|------------------|
| `/src/components` | 45+ | React components | supabase, context, UI |
| `/src/context` | 3 | Global state | supabase, React |
| `/src/hooks` | 3+ | Custom hooks | React, context |
| `/src/lib` | 2 | Initialization | supabase |
| `/src/pages` | 2 | Full pages | supabase, context |
| `/src/utils` | 7+ | Utilities | supabase, Excel |
| `/src/assets` | ? | Static files | None |
| `/public` | ? | Public files | None |

---

## Next Steps for Understanding

1. **Learn data flow**: Read [SYSTEM_FLOW.md](SYSTEM_FLOW.md)
2. **Understand components**: Read [COMPONENT_TREE.md](COMPONENT_TREE.md)
3. **Explore state management**: Read [CONTEXTS.md](CONTEXTS.md)
4. **Check dependencies**: Read [DEPENDENCIES.md](DEPENDENCIES.md)
