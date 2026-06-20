# Verto Quick Start Guide

## Get Started in 5 Minutes

---

## 1. Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Supabase Account** ([Sign up](https://app.supabase.com))
- **Code Editor** (VS Code recommended)

## 2. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/your-org/verto.git
cd verto

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

## 3. Configure Environment

**Edit `.env`:**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
VITE_DEBUG=true
```

**Get credentials from:**
1. Visit [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings > API
4. Copy Project URL and Anon Key

## 4. Start Development Server

```bash
npm run dev
```

**Output:**
```
  VITE v5.x.x  ready in 123 ms

  ➜  Local:   http://localhost:5173/
```

Visit http://localhost:5173 in your browser

## 5. Login with Test Credentials

| Field | Value |
|-------|-------|
| Email | `test@example.com` |
| Password | `test123456` |

> **Note:** Create test user first in Supabase Auth dashboard

---

## Project Structure

```
verto/
├── src/
│   ├── components/          ← React components
│   ├── context/             ← Global state (Auth, Settings)
│   ├── hooks/               ← Custom hooks
│   ├── lib/                 ← Supabase client
│   ├── pages/               ← Full pages
│   ├── utils/               ← Utility functions
│   ├── App.jsx              ← Main component
│   └── main.jsx             ← Entry point
├── public/                  ← Static assets
├── DOCUMENTATION/           ← All documentation
├── package.json             ← Dependencies
├── vite.config.js           ← Build config
└── tailwind.config.js       ← CSS config
```

---

## Common Tasks

### Create a New Invoice

1. Navigate to Dashboard
2. Click "Add Invoice" or press `Ctrl+I`
3. Fill out the form:
   - Select Entity and Client
   - Enter Invoice Amount
   - Set Collection Date
4. Click "Save"
5. Check Dashboard for the new invoice

### Upload Employee Payroll

1. Go to Dashboard
2. Click "Add Expense / Man"
3. Select Excel file with payroll data
4. Click "Upload"
5. View in "Expense Records View"

**Excel Template Columns:**
```
Emp Code | Name | Entity | Department | Amount | Month
```

### View Payment Status

1. Navigate to Dashboard
2. Check "Outstanding Invoices" section
3. See: Invoice, Amount, Paid, Outstanding
4. Click invoice to record payment

### Generate Reports

1. Go to "Analytics Dashboard" tab
2. Select date range
3. Choose report type (P&L, Bank Flow, Expenses)
4. Click "Export" for Excel download

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Add Invoice | `Ctrl + I` |
| Add Payment | `Ctrl + P` |
| Dashboard | `Ctrl + D` |
| Search/Command Palette | `Ctrl + K` |
| Help | `Ctrl + ?` |

**Customize shortcuts in Settings > Keyboard Shortcuts**

---

## Important Concepts

### Roles & Permissions

| Role | Can Create | Can Edit | Can Delete | Can Export |
|------|-----------|----------|-----------|-----------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ❌ | ✅ |
| Employee | ❌ | ❌ | ❌ | ❌ |
| Intern | ❌ | ❌ | ❌ | ❌ |

### Session Management

- Only one device can login per user at a time
- Automatic logout at midnight
- Session checked every 3 seconds
- Gets kicked out if login from another device

### Data Visibility

- Data filtered by permissions
- Row-level security enforced
- All changes audited and logged
- 30-day audit trail available

---

## Debugging

### Check Browser Console

Press `F12` to open developer tools and check for errors

### Common Errors

| Error | Solution |
|-------|----------|
| "Invalid credentials" | Check username/password |
| "Connection failed" | Verify Supabase URL & key |
| "Permission denied" | Check user role |
| "Session kicked" | Another device logged in |

### Enable Debug Mode

Set in `.env`:
```env
VITE_DEBUG=true
```

Then check Console for detailed logs

---

## Database Basics

### Access Supabase Dashboard

1. Visit [app.supabase.com](https://app.supabase.com)
2. Select project
3. Go to "SQL Editor" or "Table Editor"

### View Data

**Via Web UI:**
- Table Editor > Select table > View data

**Via SQL:**
```sql
SELECT * FROM invoices LIMIT 10;
```

### Add Test Data

```sql
INSERT INTO invoices (
  invoice_number, client_name, invoice_value, 
  invoice_date, entity_name
) VALUES (
  'TEST-001', 'Test Client', 100000, 
  TODAY(), 'Verto India'
);
```

---

## API Integration

### Fetch Data

```javascript
import { supabase } from './lib/supabaseClient'

const { data, error } = await supabase
  .from('invoices')
  .select('*')
  .limit(10)

if (error) console.error(error)
else console.log(data)
```

### Insert Data

```javascript
const { data, error } = await supabase
  .from('invoices')
  .insert([{
    invoice_number: 'INV-001',
    client_name: 'ABC Corp',
    invoice_value: 50000,
    invoice_date: '2026-06-01'
  }])
```

### Listen for Changes (Real-time)

```javascript
supabase
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'invoices' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe()
```

---

## File Editing Tips

### Modal Components

Adding a new data entry modal:

1. Create file: `src/components/AddXxxModal.jsx`
2. Import: `supabase`, `useAuth`, `Auditlog`
3. Create form with validation
4. On submit: INSERT + AUDIT LOG
5. Add to `App.jsx` tab

### Page Components

Creating a new page:

1. Create file: `src/components/XxxPage.jsx`
2. Fetch data: `supabase.from('table').select()`
3. Add to navigation in `App.jsx`
4. Test permissions via `usePermissions()`

### UI Components

Reusable UI elements in `src/components/ui/`:

```javascript
import { Button } from './ui/button'

<Button variant="primary" size="lg" onClick={handleClick}>
  Click Me
</Button>
```

---

## Performance Tips

- Use keyboard shortcuts (`Ctrl+I` vs clicking)
- Limit date ranges when filtering large datasets
- Use "Export" for offline analysis
- Clear browser cache if app feels slow

---

## Getting Help

### Documentation

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Architecture overview
- [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md) - React components
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database tables
- [AUTH_FLOW.md](AUTH_FLOW.md) - Authentication
- [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md) - Dependencies
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment

### Keyboard Shortcut Help

Press `Ctrl + ?` in app to see all shortcuts

### Error Messages

- Check browser console (`F12`)
- Look for red error badges in form fields
- Review audit logs for failed operations

### Ask for Help

1. Check documentation first
2. Search existing GitHub issues
3. Check browser console for error details
4. Ask team member or post issue

---

## Next Steps

1. ✅ Set up local development
2. ✅ Login and explore dashboard
3. ✅ Create test invoice
4. ✅ Try keyboard shortcuts
5. ✅ Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for architecture
6. ✅ Read [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md) for components
7. ✅ Make your first code change!

---

## Code First Changes

### Example: Add a New Button

1. Open `src/components/Dashboard.jsx`
2. Find the JSX section
3. Add button:
   ```javascript
   <Button 
     variant="primary" 
     onClick={() => alert('Hello!')}>
     My New Button
   </Button>
   ```
4. Save (`Ctrl+S`)
5. See live update in browser

### Example: Add Keyboard Shortcut

1. Open `src/utils/shortcutDefaults.js`
2. Add to `SHORTCUT_ACTIONS`:
   ```javascript
   { id: "myAction", label: "My Action", default: "ctrl+m" }
   ```
3. Add to `DEFAULT_SHORTCUT_MAP`:
   ```javascript
   myAction: "ctrl+m"
   ```
4. Listen in component:
   ```javascript
   window.addEventListener('shortcut', (e) => {
     if (e.detail[0] === 'myAction') doSomething()
   })
   ```

---

## Useful Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run linter (code quality)
npm run lint

# Preview production build locally
npm run preview

# Run tests
npm run test
```

---

## File Naming Conventions

```
✅ Components: PascalCase (Dashboard.jsx, AddInvoiceModal.jsx)
✅ Utilities: camelCase (exportExcel.js, popupManager.js)
✅ Hooks: camelCase starting with "use" (useAuth.js)
✅ Styles: kebab-case or component name (index.css, BorderGlow.css)
✅ Constants: UPPER_CASE (SHORTCUT_ACTIONS, EXPORT_ACTIONS)
```

---

## Development Workflow

```
1. Create feature branch
   git checkout -b feature/my-feature

2. Make changes
   - Edit files
   - Test in browser
   - Check console for errors

3. Commit changes
   git add .
   git commit -m "Add feature description"

4. Push to GitHub
   git push origin feature/my-feature

5. Create Pull Request
   - Describe changes
   - Request review
   - Address feedback

6. Merge to main
   - Auto-deploys to production
```

---

## Deployment

### Deploy to Production

1. Make changes in feature branch
2. Create Pull Request
3. Get approval
4. Merge to `main`
5. GitHub Actions automatically deploys!

**View deployment status:**
- GitHub: Actions tab
- Vercel: Deployments
- Live site updates in 2-5 minutes

---

## Resources

- **React Docs:** https://react.dev
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS:** https://tailwindcss.com
- **Vite:** https://vitejs.dev
- **Recharts:** https://recharts.org
- **Framer Motion:** https://www.framer.com/motion/

---

## Success Metrics

You're ready to contribute when you can:

- ✅ Start dev server and login
- ✅ Create invoice and payment
- ✅ Understand basic component structure
- ✅ Make a simple code change
- ✅ Find relevant documentation
- ✅ Submit a pull request

---

**Happy coding! 🚀**

*For detailed information, see documentation files in `/DOCUMENTATION` folder*
