# Verto Dashboard

A React + Vite financial dashboard for internal finance operations. Uses Supabase for Auth + Postgres, Tailwind CSS for styling, Framer Motion for animations, and Lucide icons.

## Features

- Authentication with Supabase
- Role lookup (from `user_roles` table)
- Dashboard, P&L, invoices and payments views
- Modals for creating/editing payments, invoices, expenses
- One-time "We're Live!" popup after login (session-based)
- Modern UI with Tailwind + glassmorphism styles

## Tech Stack

- React (v19)
- Vite
- Tailwind CSS
- Supabase (Auth + Postgres)
- Framer Motion
- Lucide React icons
- Recharts for charts

## Prerequisites

- Node.js 18+ recommended
- npm (or yarn)
- Supabase project (URL + API key)

## Quick start

1. Install dependencies

```bash
npm install
```

2. Configure Supabase credentials

The repository currently includes `src/lib/supabaseClient.js`. For security, replace hardcoded keys with environment variables. Create a `.env` in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-or-service-role-key
```

Then update `src/lib/supabaseClient.js` to use:

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)

export default supabase
```

3. Run the dev server

```bash
npm run dev
```

4. Build for production

```bash
npm run build
```

5. Preview production build locally

```bash
npm run preview
```

6. Lint

```bash
npm run lint
```

## Supabase / Database Requirements

The frontend reads and writes to several tables/views. At minimum, create the following in your Supabase/Postgres schema (adapt columns to your needs):

- `user_roles` (email TEXT, role TEXT)
- `internal_team` (name TEXT, designation TEXT, email TEXT)
- `bank_master`
- `bank_entries`
- `clients_master`
- `invoices`
- `payments_received`
- `advance_payments`

Also used views/tables (search `src/` for `.from("...")`):

- `outstanding_invoice_view`
- `payment_received_full_view`

If you alter the schema, update code queries accordingly.

## One-time "We're Live!" popup

This popup is shown once per browser session immediately after a fresh sign-in. Implementation:

- `src/utils/popupManager.js` — controls `sessionStorage` keys and session lifecycle.
- `src/context/AuthContext.jsx` — initializes a session on `SIGNED_IN`, uses `popupManager.shouldShowPopup()` and clears on sign out.
- `src/components/LivePopup.jsx` — animated popup UI; closing marks it shown for the session.

Note: `sessionStorage` means the popup won't reappear on refresh in the same tab; closing the tab or signing out resets it.

## Key files

- `src/pages/Login.jsx` — login screen (password visibility toggle included)
- `src/context/AuthContext.jsx` — authentication provider and role fetching
- `src/components/LivePopup.jsx` — the "We're Live!" popup
- `src/utils/popupManager.js` — session-based popup controller
- `src/lib/supabaseClient.js` — Supabase client (consider switching to env vars)
- `src/App.jsx` — main application and navigation

## Notes & Tips

- Replace any hardcoded Supabase keys with environment variables before sharing or deploying.
- To persist the popup across tabs, switch from `sessionStorage` to `localStorage` in `src/utils/popupManager.js`.
- Use the browser console to inspect `sessionStorage` keys `verto_session_id` and `verto_live_popup_shown` during login flow.

## Next steps I can help with

- Replace `src/lib/supabaseClient.js` with env-based code and add `.env.example`.
- Generate SQL DDL for the tables/views referenced in the project.
- Add a basic CONTRIBUTING or setup script for initializing Supabase schema.

If you'd like one of those, tell me which and I'll implement it.
