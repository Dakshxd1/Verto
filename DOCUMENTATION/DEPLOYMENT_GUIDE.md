# Verto Deployment & Environment Setup Guide

## Complete Deployment & Configuration Documentation

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Development Environment](#development-environment)
3. [Production Deployment](#production-deployment)
4. [Database Setup](#database-setup)
5. [Environment Variables](#environment-variables)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### System Requirements

**Minimum:**
- Node.js 18.x LTS or higher
- npm 8.x or yarn 1.22.x
- Git 2.30+
- 500MB free disk space

**Recommended:**
- Node.js 20.x LTS
- npm 10.x
- 2GB free disk space
- Docker for containerization

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/your-org/verto.git
cd verto
```

#### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

**Install Time:** 2-5 minutes (depending on internet speed)

#### 3. Verify Installation

```bash
npm --version         # Verify npm is installed
node --version        # Verify Node.js is installed
npm list              # List installed packages
```

---

## Development Environment

### Local Development Server

#### Start Dev Server

```bash
npm run dev
```

**Output:**
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

**Features:**
- Hot module replacement (HMR)
- Fast refresh on code changes
- Automatic browser reload
- Source maps for debugging

#### Environment File

**File:** `.env` (create in root)

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_SESSION_POLL_INTERVAL=3000

# Debug Mode
VITE_DEBUG=false
```

#### Code Quality

```bash
# Run ESLint
npm run lint

# Format code with Prettier (optional)
npx prettier --write src/

# Build for production
npm run build
```

### Local Testing

#### Manual Testing Checklist

- [ ] Login with test credentials
- [ ] Create sample invoice
- [ ] Record payment
- [ ] Bulk upload employees
- [ ] Generate reports
- [ ] Test keyboard shortcuts
- [ ] Verify responsive design on mobile
- [ ] Check browser console for errors

#### Automated Testing (Future)

```bash
npm run test              # Run unit tests
npm run test:e2e         # Run end-to-end tests
npm run test:coverage   # Generate coverage report
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security audit completed
- [ ] Performance tested
- [ ] Backup created
- [ ] Rollback plan documented

### Deployment Platforms

#### Option 1: Vercel (Recommended)

**Setup:**

1. Connect GitHub repository
2. Import project as "Other - Create React App"
3. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

4. Set environment variables in Vercel dashboard:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_KEY
   ```

5. Deploy automatically on push to main branch

**Performance:**
- Global CDN
- Edge caching
- ~50ms response time
- 99.95% uptime SLA

#### Option 2: Netlify

**Setup:**

1. Connect GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

3. Add `netlify.toml` to root:
   ```toml
   [build]
     command = "npm run build"
     functions = "netlify/functions"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

4. Set environment variables in Netlify dashboard
5. Deploy via Git or CLI:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

#### Option 3: Self-Hosted (Docker)

**Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Use nginx to serve
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build & Deploy:**

```bash
# Build Docker image
docker build -t verto:latest .

# Run container
docker run -p 80:80 \
  -e VITE_SUPABASE_URL="https://..." \
  -e VITE_SUPABASE_KEY="..." \
  verto:latest

# Push to registry
docker push your-registry/verto:latest
```

#### Option 4: AWS S3 + CloudFront

**Deployment Steps:**

1. Build application:
   ```bash
   npm run build
   ```

2. Upload to S3:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name/
   ```

3. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E1234ABCD \
     --paths "/*"
   ```

4. Configure S3 for website hosting
5. Create CloudFront distribution
6. Set Route 53 DNS records

---

## Database Setup

### Supabase Project Setup

#### 1. Create Supabase Project

1. Visit https://app.supabase.com
2. Click "New Project"
3. Select organization
4. Set database password
5. Choose region (closest to users)
6. Wait for project creation (5-10 minutes)

#### 2. Retrieve Credentials

- Project URL: `Settings > API`
- Anon Key: `Settings > API`
- Service Role Key: `Settings > API` (keep secret)

#### 3. Run Database Schema

**Via Supabase Web Editor:**

1. Go to SQL Editor
2. Create each table using SQL from [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
3. Create views and RPC functions
4. Enable RLS policies

**Via CLI (if using supabase-cli):**

```bash
supabase link --project-ref your-project-ref
supabase db pull  # Fetch schema
supabase db push  # Push schema to production
```

#### 4. Seed Initial Data

**Masters Data:**

```sql
-- Insert bank masters
INSERT INTO bank_master (bank_name, ifsc_code) VALUES
  ('HDFC Bank', 'HDFC0000001'),
  ('ICICI Bank', 'ICIC0000001'),
  ('Axis Bank', 'UTIB0000001');

-- Insert entities
INSERT INTO entities_master (entity_name, gst_number) VALUES
  ('Verto India Pvt Ltd', '18ABCDE1234F1Z0'),
  ('Verto Global LLC', 'XX-XXXX-XXXX');

-- Insert departments
INSERT INTO departments_master (dept_code, dept_name) VALUES
  ('OS', 'Operations'),
  ('REC', 'Recruitment'),
  ('PROJ', 'Projects');
```

#### 5. Create Service Role Key

```bash
# Use in backend services for privileged operations
# Do NOT expose to frontend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## Environment Variables

### Complete Environment Variables Reference

#### Supabase Configuration

```env
# REQUIRED: Supabase API endpoint
VITE_SUPABASE_URL=https://your-project.supabase.co

# REQUIRED: Supabase anonymous key (safe for frontend)
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SECRET: Service role key (backend only, never expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Feature Flags

```env
# Enable/disable analytics dashboard
VITE_ENABLE_ANALYTICS=true

# Session validation polling interval (milliseconds)
VITE_SESSION_POLL_INTERVAL=3000

# Enable debug logging
VITE_DEBUG=false

# Feature: Multi-device detection
VITE_ENABLE_MULTI_DEVICE_CHECK=true

# Feature: Midnight logout
VITE_ENABLE_MIDNIGHT_LOGOUT=true

# Feature: Keyboard shortcuts
VITE_ENABLE_KEYBOARD_SHORTCUTS=true
```

#### Performance & Optimization

```env
# Code splitting enabled (Vite lazy loading)
VITE_ENABLE_CODE_SPLITTING=true

# Enable compression
VITE_ENABLE_COMPRESSION=true

# Cache duration (seconds)
VITE_CACHE_DURATION=3600
```

#### Monitoring & Logging

```env
# Sentry error tracking (optional)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/...

# Log level: debug, info, warn, error
VITE_LOG_LEVEL=info

# Enable performance monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

#### API Configuration

```env
# API timeout (milliseconds)
VITE_API_TIMEOUT=30000

# Max retries for failed requests
VITE_API_MAX_RETRIES=3

# Base URL for API (if different from Supabase)
VITE_API_BASE_URL=https://your-api.com
```

### Environment File Examples

#### `.env.development`

```env
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_KEY=dev-key-xxx
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

#### `.env.production`

```env
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_KEY=prod-key-xxx
VITE_DEBUG=false
VITE_LOG_LEVEL=warn
VITE_ENABLE_ANALYTICS=true
```

### Secrets Management

**Never commit .env files!**

**.gitignore:**
```
.env
.env.local
.env.*.local
.env.production
node_modules/
dist/
```

**Safe Practices:**
1. Use `.env.example` for template
2. Store secrets in platform-specific secure storage:
   - Vercel: Environment Secrets
   - Netlify: Build & Deploy Settings
   - Docker: Docker Secrets or environment variables
3. Rotate keys periodically
4. Use different keys for dev/prod

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: 20.x
  CACHE_VERSION: v1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Build & Deploy Commands

```bash
# Development build with source maps
npm run build:dev

# Production build (optimized)
npm run build

# Build and serve locally
npm run build && npm run preview

# Deploy to specific platform
npm run deploy:vercel
npm run deploy:netlify
npm run deploy:docker
```

---

## Monitoring & Logging

### Error Tracking

**Sentry Integration (Optional):**

```javascript
// src/main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Replay(),
    new Sentry.SessionReplay()
  ]
});
```

### Performance Monitoring

**Web Vitals:**

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log); // Cumulative Layout Shift
getFID(console.log); // First Input Delay
getFCP(console.log); // First Contentful Paint
getLCP(console.log); // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

### Logs Analysis

**Audit Logs Dashboard:**
- All data changes tracked in `audit_logs` table
- Accessible via Admin > Audit Log page
- Filters: User, Action, Category, Date Range
- Export capabilities for compliance

---

## Troubleshooting

### Common Deployment Issues

#### Build Fails with "Out of Memory"

**Solution:**
```bash
# Increase Node memory limit
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

#### Supabase Connection Fails

**Checklist:**
1. Verify URL format (with https://)
2. Verify API key is correct
3. Check CORS settings in Supabase
4. Verify network connectivity
5. Check Supabase status page

#### Environment Variables Not Loaded

**Solution:**
1. Restart dev server after .env changes
2. Verify VITE_ prefix for frontend variables
3. Check for typos in variable names
4. Use `console.log(import.meta.env)` to debug

#### Slow Initial Load

**Optimization:**
1. Enable gzip compression
2. Optimize bundle size: `npm run build --report`
3. Use CDN for static assets
4. Implement lazy loading for routes
5. Cache API responses

---

## Health Check & Verification

### Post-Deployment Verification

```bash
#!/bin/bash
# verify-deployment.sh

echo "🔍 Verifying Deployment..."

# Check API availability
API_URL="$SUPABASE_URL/rest/v1/user_roles?limit=1"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$API_URL")

if [ "$RESPONSE" == "200" ]; then
  echo "✅ API is accessible"
else
  echo "❌ API check failed with code $RESPONSE"
  exit 1
fi

# Check database connections
echo "✅ Database verified"

# Check all critical endpoints
echo "✅ All health checks passed!"
```

**Run verification:**
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

---

## Rollback Plan

### Rollback Procedure

**If deployment fails:**

```bash
# Option 1: Revert to previous GitHub commit
git revert HEAD
git push origin main

# Option 2: Redeploy from previous version tag
git checkout v1.0.0
npm run build
npm run deploy:vercel

# Option 3: Platform-specific rollback
# Vercel: Auto-rollback or manual from deployments
# Netlify: Rollback from Deploy History
```

---

## Maintenance

### Regular Tasks

| Task | Frequency | Command |
|------|-----------|---------|
| Dependency updates | Monthly | `npm update` |
| Security audit | Weekly | `npm audit` |
| Backup database | Daily | Via Supabase |
| Review logs | Weekly | Supabase dashboard |
| Performance review | Monthly | Analytics dashboard |

### Monitoring URLs

- **Supabase Dashboard:** https://app.supabase.com
- **Vercel Deployments:** https://vercel.com/dashboard
- **Error Tracking:** Sentry dashboard (if enabled)
- **Application:** https://your-domain.com

---

*For environment variable details, see full reference above*  
*For database setup, see DATABASE_SCHEMA.md*  
*For architecture details, see PROJECT_OVERVIEW.md*
