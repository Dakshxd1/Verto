# Questions for Backend Implementation

## Payment Received Module

### Client Code Mapping
**Question:** For the PayIn reference number format (PI-BL-021225-01), how should we generate the client code?

**Options:**
1. Create a mapping like `{'Acme Corp': 'AC', 'Globex': 'GL', ...}`
2. Extract first 2 letters from client name automatically (e.g., 'Acme Corp' → 'AC')
3. Allow users to define custom client codes in a settings/configuration page

**Current Implementation:** Using first 2 letters automatically (temporary solution)

**Status:** ⏳ Pending Decision

---

## Add Invoice Module

### 1. Client & Ledger Name Master Data
**Question:** The form specifies "Drop Down To take from Master Input" for Client and Ledger Name fields. How should this master data be managed?

**Options:**
1. Create a separate "Master Input" management page where users can add/edit clients and ledgers
2. Auto-populate from existing invoice data
3. Allow inline addition (add new client while creating invoice)
4. Import from external system/spreadsheet

**Current Implementation:** Using shared clients array with inline text input (can type or select)

**Status:** ⏳ Pending Decision

---

### 2. Impact Month Calculation Logic
**Question:** Impact Month has different logic based on department:
- OS: Payroll Month
- REC/TEMP: Month Candidate Joined

How should this be determined?

**Options:**
1. Auto-calculate based on Invoice Date
2. Manual dropdown selection
3. Separate date picker for "Candidate Joined Date" when REC/TEMP selected
4. Default to Invoice Date month, allow manual override

**Current Implementation:** Auto-calculated from Invoice Date, can be manually overridden

**Status:** ⏳ Pending Decision

---

### 3. Auto-Check Formula Timing
**Question:** When should auto-calculations (GST, Invoice Value, TDS, etc.) be performed?

**Options:**
1. Real-time as user types (immediate feedback)
2. On blur (when user leaves the field)
3. On form submission only
4. Manual "Calculate" button

**Current Implementation:** Real-time calculation as user types

**Status:** ⏳ Pending Decision

---

### 4. Department-Specific Calculation Rules
**Question:** Different departments have different calculation formulas:
- Rec/Temp/Proj: GST = 18% of Verto Fee, Invoice Value = Verto Fee + GST
- Ops: GST = 18% of (Verto Fee + Gross Value), Invoice Value = Verto Fee + Gross Value + GST

Should these rules be:
1. Hardcoded in frontend
2. Configurable via admin settings
3. Fetched from backend API
4. Stored in a configuration file

**Current Implementation:** Hardcoded in frontend with clear comments for future backend migration

**Status:** ⏳ Pending Decision

---

### 5. Expected Outflow Dates Logic
**Question:** Expected Outflow Dates (PF, ESI, GST, Tax Deducted) say "As per master due date". What determines these dates?

**Options:**
1. Fixed dates (e.g., PF always 15th of next month)
2. Configurable per client/entity
3. Calculated based on invoice date + payment terms
4. Manual entry for now, rules defined later

**Current Implementation:** Manual date pickers for now

**Status:** ⏳ Pending Decision

---

### 6. OS Department Extra Fields Validation
**Question:** When Department = OS, additional fields appear (Employee Count, Gross Value, Net In Hand, PF, ESI, LWF, PT, Other Ded, CTC). Should these be:
1. Required when OS is selected
2. Optional but recommended
3. Some required, some optional

**Current Implementation:** All required when Department = OS

**Status:** ⏳ Pending Decision

---

### 7. Bank Name & Account Number Master Data
**Question:** Bank details say "Drop Down To take from Master Input". Should this be:
1. Part of the same Master Input as clients
2. Separate bank accounts management page
3. Entity-specific (each entity has its own bank accounts)
4. Client-specific (each client has preferred bank accounts)

**Current Implementation:** Dropdown with common bank options, can type custom

**Status:** ⏳ Pending Decision

---

## Future Questions
<!-- Add more questions here as they come up -->
