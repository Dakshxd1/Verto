# Verto Documentation Index

## Complete Documentation Hub

Welcome to Verto's comprehensive documentation. This index helps you find exactly what you need.

---

## 📚 Documentation Overview

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| [QUICK_START_GUIDE.md](#quick-start-guide) | Get started in 5 minutes | New developers | 10 min |
| [PROJECT_OVERVIEW.md](#project-overview) | Understand architecture & features | Everyone | 15 min |
| [FRONTEND_DOCUMENTATION.md](#frontend-documentation) | React components & hooks | Frontend developers | 30 min |
| [DATABASE_SCHEMA.md](#database-schema) | Database tables & relationships | Backend developers | 25 min |
| [API_DOCUMENTATION.md](#api-documentation) | API endpoints & integration | Backend/Full-stack | 20 min |
| [AUTH_FLOW.md](#authentication-flow) | Authentication & security | Security-conscious devs | 20 min |
| [FILE_DEPENDENCY_GRAPH.md](#file-dependency-graph) | Code dependencies | Code maintainers | 20 min |
| [DEPLOYMENT_GUIDE.md](#deployment-guide) | Setup & deployment | DevOps/Deployment team | 25 min |

---

## 🚀 Quick Start Guide

**[→ QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)**

### Get Started Immediately

- ✅ Clone repository and install dependencies (5 min)
- ✅ Configure environment variables
- ✅ Start development server
- ✅ Login and create first invoice
- ✅ Learn keyboard shortcuts
- ✅ Understand roles and permissions

**Best for:** First-time setup, getting productive quickly

---

## 🏗️ Project Overview

**[→ PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)**

### Understand the Big Picture

- 📊 Business context and goals
- 🎯 Key features overview
- 🔗 Module relationships
- 📋 Permission matrix
- 🛠️ Technology stack (React, Supabase, Tailwind)
- 🗺️ Roadmap and future plans
- 📈 Success metrics

**Best for:** Understanding purpose, architecture decisions, business requirements

---

## ⚛️ Frontend Documentation

**[→ FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)**

### React Component Guide

**Components (40+):**
- Core: Dashboard, Analytics, Reports
- Financial: Invoices, Payments, Expense Management
- Employee: Internal Team, Payroll, Advances
- Admin: User Management, Audit Logs, Settings

**Context Providers:**
- AuthContext - User, role, session management
- SettingsContext - User preferences, shortcuts
- PermissionsContext - Role-based access control

**Custom Hooks:**
- useAuth - Current user info
- usePermissions - Permission checks
- useKeyboardShortcuts - Keyboard handler
- useInternGuard - Intern mode restriction

**UI Components:**
- Button, Card, Badge, BorderGlow
- Modal wrappers
- Form components

**Best for:** React development, understanding component architecture, finding UI patterns

---

## 🗄️ Database Schema

**[→ DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**

### Complete Database Reference

**Core Tables (25+):**
- Invoices, Payments, Payment Made
- Bounce Back, Credit Note Bad Debt
- Internal Team, Employee Payouts
- Client Advance Tracker, Credit Card Master

**Master Tables:**
- Bank Master, Clients Master
- Entities Master, Departments Master

**Views (5):**
- outstanding_invoice_view
- payment_received_full_view
- payment_made_view

**RPC Functions:**
- validate_session (multi-device detection)
- delete_employee_expense_complete (cascading)

**Relationships & Indexes:**
- Foreign key constraints
- Row-level security policies
- 40+ performance indexes

**Best for:** Database design, understanding data structure, writing SQL queries

---

## 🔌 API Documentation

**[→ API_DOCUMENTATION.md](API_DOCUMENTATION.md)**

### Supabase REST & Real-time APIs

**Endpoints:**
- Authentication (Sign in, Sign out, Token refresh)
- Financial (Invoices CRUD, Payments, Outstanding)
- Employee (Internal team, Payroll, Advances)
- Admin (Roles, Audit logs)

**Query Patterns:**
- Filtering (eq, gt, gte, lt, lte, like, in)
- Sorting and pagination
- Column selection and limits

**Real-time Subscriptions:**
- postgres_changes for invoices
- Invoice updates
- Payment notifications

**Error Handling:**
- HTTP status codes (200, 201, 400, 401, 403, 404)
- Error response format
- Troubleshooting guide

**Best for:** API integration, building features, working with Supabase

---

## 🔐 Authentication Flow

**[→ AUTH_FLOW.md](AUTH_FLOW.md)**

### Security & Session Management

**Authentication:**
- 5-step login flow
- Token lifecycle (access + refresh)
- JWT validation

**Authorization:**
- 4 roles: Admin, Manager, Employee, Intern
- 8 permission flags (Create, Edit, Delete, Export, etc.)
- Permission matrix

**Session Management:**
- 3-second validation polling
- Single device per user
- Midnight logout
- Session storage (DB + localStorage)

**Multi-device Detection:**
- Automatic kick-off if login elsewhere
- "We're Live!" popup display
- Session table with UNIQUE constraint

**Security:**
- Row-level security (RLS) policies
- Data protection measures
- Token signing (RS256)

**Troubleshooting:**
- Invalid credentials
- Session kicked
- Insufficient permissions
- Token expiry

**Best for:** Understanding security model, implementing auth features, debugging login issues

---

## 📦 File Dependency Graph

**[→ FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md)**

### Code Organization & Dependencies

**Import Structure:**
- Main entry point (main.jsx → App.jsx)
- Context provider hierarchy
- Component dependency trees
- Utility function usage

**Circular Dependency Analysis:**
- Verified safe imports
- Unidirectional dependency flow
- Best practices for new features

**Database Dependencies:**
- Invoice → Payments relationship
- Employee → Payouts chain
- Authentication dependencies

**Complete Tree:**
- Visual dependency hierarchy
- File-by-file import mapping
- Suggested import ordering

**Best for:** Understanding code structure, adding new features, refactoring, preventing circular deps

---

## 🚀 Deployment Guide

**[→ DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

### Environment Setup & Production Deployment

**Local Development:**
- System requirements (Node 18+, npm 8+)
- Installation steps
- Dev server setup
- Environment variables

**Deployment Options:**
1. **Vercel** (Recommended) - Global CDN, auto-deploy
2. **Netlify** - Alternative platform
3. **Docker** - Self-hosted containerization
4. **AWS S3 + CloudFront** - Custom infrastructure

**Database Setup:**
- Supabase project creation
- Schema deployment
- Data seeding
- Credential management

**Environment Variables:**
- Supabase config
- Feature flags
- Performance tuning
- Monitoring setup

**CI/CD Pipeline:**
- GitHub Actions workflow
- Automated testing, linting, building
- Auto-deploy on push to main

**Monitoring:**
- Error tracking (Sentry)
- Performance metrics
- Audit logs
- Health checks

**Troubleshooting:**
- Build failures
- Connection issues
- Environment variable problems
- Performance optimization

**Best for:** Deploying to production, setting up CI/CD, configuring environments

---

## 📋 How to Choose the Right Document

### I want to...

#### Get Started Immediately
→ [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)
- Clone repo, install, and run locally
- Create first invoice
- Learn basic shortcuts

#### Understand What Verto Does
→ [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- Learn business context
- See feature overview
- Understand architecture decisions

#### Build a React Feature
→ [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)
- Find existing components
- Learn context/hooks pattern
- Understand UI component library

#### Design a Database Feature
→ [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Review current tables
- Understand relationships
- See RPC functions

#### Call an API Endpoint
→ [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- Find endpoint reference
- See request/response examples
- Learn query patterns

#### Debug a Login Issue
→ [AUTH_FLOW.md](AUTH_FLOW.md)
- Understand session management
- Check permission matrix
- Find troubleshooting guide

#### Add a New Component
→ [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md)
- Understand import structure
- See dependency patterns
- Avoid circular dependencies

#### Deploy to Production
→ [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Choose deployment platform
- Set up environment variables
- Configure CI/CD

---

## 🎯 Reading Paths by Role

### Frontend Developer Path
1. **Start:** [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) (10 min)
2. **Understand:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) (15 min)
3. **Learn Components:** [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md) (30 min)
4. **Code Structure:** [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md) (20 min)
5. **Authentication:** [AUTH_FLOW.md](AUTH_FLOW.md) (20 min)

**Total:** ~95 minutes to be productive

### Backend Developer Path
1. **Start:** [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) (10 min)
2. **Understand:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) (15 min)
3. **Database Schema:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) (25 min)
4. **API Reference:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md) (20 min)
5. **Authentication:** [AUTH_FLOW.md](AUTH_FLOW.md) (20 min)

**Total:** ~90 minutes to be productive

### Full-Stack Developer Path
1. **Start:** [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) (10 min)
2. **Understand:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) (15 min)
3. **Frontend:** [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md) (30 min)
4. **Backend:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) (25 min)
5. **APIs:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md) (20 min)
6. **Security:** [AUTH_FLOW.md](AUTH_FLOW.md) (20 min)
7. **Code Structure:** [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md) (20 min)

**Total:** ~140 minutes to be fully productive

### DevOps/Infrastructure Path
1. **Start:** [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) (10 min)
2. **Overview:** [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) (15 min)
3. **Deployment:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) (25 min)
4. **Database Setup:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Schema section (10 min)
5. **Authentication:** [AUTH_FLOW.md](AUTH_FLOW.md) - Security section (10 min)

**Total:** ~70 minutes to deploy

---

## 🔍 Find Documentation by Topic

### Invoices & Payments
- Dashboard component → [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)
- Invoice database schema → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Invoice API endpoints → [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Employee & Payroll
- InternalTeamDetails component → [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)
- Employee tables → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Payroll APIs → [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Reports & Analytics
- Analyticsdashboard component → [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)
- Outstanding invoice view → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Report generation patterns → [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)

### User & Permissions
- Auth context → [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)
- User roles table → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Auth flow & permissions → [AUTH_FLOW.md](AUTH_FLOW.md)

### Keyboard Shortcuts
- useKeyboardShortcuts hook → [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)
- Shortcut defaults utility → [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md)
- Settings page → [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md)

### Audit & Logging
- Auditlog utility → [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md)
- Audit logs table → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- Audit log queries → [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Security & Authentication
- Complete auth flow → [AUTH_FLOW.md](AUTH_FLOW.md)
- Session management → [AUTH_FLOW.md](AUTH_FLOW.md)
- RLS policies → [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

### Development Setup
- Quick start → [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)
- Environment config → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Dependencies → [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md)

### Production Deployment
- Deployment options → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- CI/CD pipeline → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Health checks → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📞 Quick Reference

### Key Technologies
- **Frontend:** React 19, Vite 5, Tailwind CSS 3
- **Backend:** Supabase (PostgreSQL 14+)
- **Charting:** Recharts
- **Excel:** XLSX
- **Styling:** Framer Motion, Lucide Icons

### Development URLs
- **Local Dev:** http://localhost:5173
- **Supabase Dashboard:** https://app.supabase.com
- **Repository:** https://github.com/your-org/verto

### Important Files
- Configuration: `vite.config.js`, `tailwind.config.js`
- Entry: `src/main.jsx`, `src/App.jsx`
- Environment: `.env` (local only, not in git)
- Styling: `src/index.css`, `src/App.css`

### Key Directories
- Components: `src/components/` (40+ components)
- Hooks: `src/hooks/` (Custom React hooks)
- Context: `src/context/` (Global state)
- Utils: `src/utils/` (Helper functions)
- UI: `src/components/ui/` (Reusable UI elements)

---

## ✅ Documentation Quality Checklist

This documentation includes:

- ✅ Quick start guide for new developers
- ✅ Architecture overview with diagrams
- ✅ Complete component reference with 40+ components
- ✅ Database schema with 25+ tables
- ✅ API endpoints with examples
- ✅ Authentication and security flows
- ✅ Dependency analysis and import patterns
- ✅ Deployment guides for 4+ platforms
- ✅ CI/CD pipeline configuration
- ✅ Troubleshooting guides
- ✅ Keyboard shortcuts reference
- ✅ Role-based permission matrix
- ✅ Reading paths for different roles
- ✅ Topic-based quick lookup

---

## 🆘 Still Need Help?

### Check These First
1. Use browser search (`Ctrl+F`) to find a specific topic
2. See "How to Choose the Right Document" above
3. Look at "Reading Paths by Role" for your position

### Common Questions

**Q: I'm new to Verto, where should I start?**
A: Start with [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md), then read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

**Q: How do I add a new feature?**
A: Read [FRONTEND_DOCUMENTATION.md](FRONTEND_DOCUMENTATION.md) for components and [FILE_DEPENDENCY_GRAPH.md](FILE_DEPENDENCY_GRAPH.md) for structure

**Q: How do I deploy to production?**
A: Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**Q: How does authentication work?**
A: See [AUTH_FLOW.md](AUTH_FLOW.md) for complete details

**Q: What permissions does each role have?**
A: Check the permission matrix in [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) or detailed section in [AUTH_FLOW.md](AUTH_FLOW.md)

**Q: How do I debug a database issue?**
A: Review [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for table structure and relationships

**Q: What are the keyboard shortcuts?**
A: See [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) or press `Ctrl+?` in the app

---

## 📝 Documentation Maintenance

### Last Updated
- **Documentation Version:** 1.0
- **Verto Version:** Latest
- **Last Update:** 2024

### Contributing to Documentation
1. Edit relevant `.md` file
2. Update this index if adding new docs
3. Keep examples current with code
4. Submit pull request with documentation changes

---

**Start with [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) →**

*All documentation is in the `/DOCUMENTATION` folder*
