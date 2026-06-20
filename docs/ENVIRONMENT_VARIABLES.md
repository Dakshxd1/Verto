# Environment Variables Reference

## Configuration & Environment Setup

Complete reference for every environment variable used in the application.

---

## Environment Variable Overview

```
Frontend (.env file)
├── Supabase Configuration
├── Feature Flags
├── Performance Settings
├── Debug Options
└── API Configuration
```

---

## Supabase Configuration

### `VITE_SUPABASE_URL`

**Purpose**: Supabase project URL endpoint

**Type**: string (URL)

**Required**: ✅ Yes

**Default**: None (must be set)

**Current Value**:
```
https://exykcukcvjdkrlbmxzdx.supabase.co
```

**Set In**: `.env` file

**Used In**:
- `src/lib/supabaseClient.js` - Client initialization
- All API calls through supabase client

**Effect**: 
- Without this: App cannot connect to database
- Wrong URL: All database queries fail with connection error

**Where to Find**:
1. Supabase Dashboard
2. Settings > API
3. Copy "Project URL"

---

### `VITE_SUPABASE_KEY`

**Purpose**: Supabase anonymous public key

**Type**: string (JWT-like)

**Required**: ✅ Yes

**Default**: None (must be set)

**Current Value**:
```
sb_publishable_w3oXYlTqJVX09MiQGZN3Xw_gtk6R4R1
```

**Set In**: `.env` file

**Used In**:
- `src/lib/supabaseClient.js` - Client authentication
- All API requests include this key

**Effect**:
- Without this: Authentication fails, no database access
- Wrong key: "Unauthorized" errors on all queries

**Security**:
⚠️ **PUBLIC KEY** - Safe to commit (used in frontend)
- Different from Service Role Key (keep secret!)
- Row-level security (RLS) policies protect data

**Where to Find**:
1. Supabase Dashboard
2. Settings > API
3. Copy "Anon Key"

---

## Feature Flags

### `VITE_DEBUG`

**Purpose**: Enable debug logging and development tools

**Type**: boolean (`true` | `false`)

**Default**: `false`

**Set In**: `.env`, `.env.development`, `.env.production`

**Values**:
```env
# Development
VITE_DEBUG=true

# Production
VITE_DEBUG=false
```

**Used In**:
- Global logging statements throughout components
- `window.supabase` object exposure
- Console warnings and errors

**Effect**:
- `true`: Verbose console logs, extra validation checks
- `false`: Minimal logging, smaller bundle

**When to Enable**:
- Local development
- Troubleshooting issues
- Testing new features

---

### `VITE_ENABLE_ANALYTICS`

**Purpose**: Enable analytics tracking

**Type**: boolean

**Default**: `true`

**Used In**:
- Analytics dashboard initialization
- Event tracking

**Effect**:
- `true`: Track user events, populate analytics
- `false`: Disable tracking

---

### `VITE_SESSION_POLL_INTERVAL`

**Purpose**: Interval for session validation polling

**Type**: integer (milliseconds)

**Default**: `3000` (3 seconds)

**Set In**: `.env`

**Used In**:
- `src/context/AuthContext.jsx` - Session polling
- Multi-device detection

**Code Location**:
```javascript
sessionCheckIntervalRef.current = setInterval(() => {
  validateSession();
}, VITE_SESSION_POLL_INTERVAL);
```

**Effect**:
- `3000`: Poll every 3 seconds (default)
- `5000`: Poll every 5 seconds (less frequent)
- `1000`: Poll every 1 second (more frequent, higher load)

**Performance Impact**:
⚠️ **Reduces polling frequency for better performance**:
- Decreases network calls
- Reduces database load
- Slightly delayed multi-device detection

---

## Debug & Development Options

### `VITE_LOG_LEVEL`

**Purpose**: Minimum log level to display

**Type**: string (`debug` | `info` | `warn` | `error`)

**Default**: `info`

**Values**:
```env
VITE_LOG_LEVEL=debug  # Log everything
VITE_LOG_LEVEL=info   # Info and above
VITE_LOG_LEVEL=warn   # Warnings and errors only
VITE_LOG_LEVEL=error  # Errors only
```

**Used In**:
- Global logging utility
- Console output filtering

---

### `VITE_ENABLE_PERFORMANCE_MONITORING`

**Purpose**: Enable performance monitoring and metrics

**Type**: boolean

**Default**: `false`

**Used In**:
- Performance tracking utilities
- Web Vitals measurement

**When to Enable**: 
- Before production deployment
- Performance testing

---

## API Configuration

### `VITE_API_TIMEOUT`

**Purpose**: API request timeout in milliseconds

**Type**: integer (milliseconds)

**Default**: `30000` (30 seconds)

**Set In**: `.env`

**Used In**:
- Supabase client initialization (if configured)
- Fetch timeouts

**Example**:
```env
VITE_API_TIMEOUT=30000  # 30 second timeout
VITE_API_TIMEOUT=60000  # 60 second timeout
```

**Effect**:
- Higher values: Wait longer for slow network
- Lower values: Faster error feedback, may fail on slow connections

---

### `VITE_API_MAX_RETRIES`

**Purpose**: Maximum retries for failed API requests

**Type**: integer

**Default**: `3`

**Used In**: Retry logic for network failures

**Example**:
```env
VITE_API_MAX_RETRIES=3  # Retry 3 times
VITE_API_MAX_RETRIES=5  # Retry 5 times
```

---

## Build & Optimization

### `VITE_ENABLE_CODE_SPLITTING`

**Purpose**: Enable code splitting for lazy loading

**Type**: boolean

**Default**: `true`

**Used In**: Vite build configuration

**Effect**:
- `true`: Generate separate chunks (smaller initial load)
- `false`: Single bundle (larger initial load)

---

### `VITE_ENABLE_COMPRESSION`

**Purpose**: Enable gzip compression for assets

**Type**: boolean

**Default**: `true`

**Used In**: Build configuration

**Effect**:
- `true`: Smaller file sizes, faster downloads
- `false`: Larger files, faster server response

---

## Environment File Examples

### `.env.development` (Local Development)

```env
# Supabase
VITE_SUPABASE_URL=https://exykcukcvjdkrlbmxzdx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_w3oXYlTqJVX09MiQGZN3Xw_gtk6R4R1

# Development Features
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Session
VITE_SESSION_POLL_INTERVAL=3000

# API
VITE_API_TIMEOUT=30000
VITE_API_MAX_RETRIES=3
```

### `.env.production` (Production Deployment)

```env
# Supabase
VITE_SUPABASE_URL=https://exykcukcvjdkrlbmxzdx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_w3oXYlTqJVX09MiQGZN3Xw_gtk6R4R1

# Production Features
VITE_DEBUG=false
VITE_LOG_LEVEL=warn
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Session
VITE_SESSION_POLL_INTERVAL=5000

# API
VITE_API_TIMEOUT=30000
VITE_API_MAX_RETRIES=3

# Build Optimization
VITE_ENABLE_CODE_SPLITTING=true
VITE_ENABLE_COMPRESSION=true
```

### `.env.staging` (Staging/Pre-prod)

```env
# Supabase (staging DB)
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_KEY=sb_staging_key_xyz

# Staging Features
VITE_DEBUG=true
VITE_LOG_LEVEL=info
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

---

## Environment Variable Usage in Code

### Reading Environment Variables

```javascript
// In any React component
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const debugMode = import.meta.env.VITE_DEBUG === 'true'

// In supabaseClient.js
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)
```

### Type Safety

```javascript
// Define types for environment variables
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_KEY: string
  VITE_DEBUG: string
  VITE_SESSION_POLL_INTERVAL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### Conditional Logic

```javascript
// Debug mode
if (import.meta.env.VITE_DEBUG === 'true') {
  console.log('Debug info:', data)
}

// Feature flags
if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
  trackEvent('page_view')
}

// Performance tuning
const pollInterval = parseInt(
  import.meta.env.VITE_SESSION_POLL_INTERVAL || '3000'
)
```

---

## Security Best Practices

### ✅ Safe to Commit
- `VITE_SUPABASE_URL` - Public URL
- `VITE_SUPABASE_KEY` - Anonymous public key (RLS protects data)
- `VITE_DEBUG`
- `VITE_ENABLE_ANALYTICS`

### ❌ NEVER Commit
- `SUPABASE_SERVICE_ROLE_KEY` - Secret key (backend only)
- API keys for third-party services
- Passwords or tokens

### Git Configuration

```bash
# Add to .gitignore
.env                 # Ignore all local env files
.env.local
.env.*.local
!.env.example        # Include template

# Create template for team
cp .env .env.example
# Remove sensitive values from template
# Commit .env.example to git
git add .env.example
git commit -m "Add environment template"
```

---

## Environment Variable Access Patterns

### Pattern 1: Direct Access (Simple)
```javascript
const url = import.meta.env.VITE_SUPABASE_URL
```

### Pattern 2: With Defaults (Safe)
```javascript
const pollInterval = parseInt(
  import.meta.env.VITE_SESSION_POLL_INTERVAL || '3000'
)
```

### Pattern 3: Centralized Config (Recommended)
```javascript
// src/config.js
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_KEY,
  },
  debug: import.meta.env.VITE_DEBUG === 'true',
  sessionPollInterval: parseInt(
    import.meta.env.VITE_SESSION_POLL_INTERVAL || '3000'
  ),
}

// In components
import { config } from '../config'
const pollInterval = config.sessionPollInterval
```

---

## Troubleshooting Environment Variables

### Issue: "Cannot read property X of undefined"

**Cause**: Environment variable not set

**Solution**:
1. Check `.env` file exists
2. Verify variable name spelling (VITE_ prefix required)
3. Restart dev server after changing `.env`

### Issue: Environment variable shows as undefined

**Cause**: Variable doesn't start with `VITE_`

**Solution**: Vite only exposes variables starting with `VITE_`
```bash
# ✅ Correct
VITE_SUPABASE_URL=...

# ❌ Wrong (not exposed)
SUPABASE_URL=...
```

### Issue: Changes to `.env` not taking effect

**Solution**: 
```bash
# Restart dev server
npm run dev
# Or in VS Code: Kill terminal and restart
```

---

## Environment Variable in Different Contexts

### Development (`npm run dev`)
- Loads from `.env.development`
- Falls back to `.env`
- Vite watches for changes

### Production Build (`npm run build`)
- Loads from `.env.production`
- Falls back to `.env`
- Variables baked into bundle (no runtime change)

### Preview (`npm run preview`)
- Uses production build
- Simulates production environment

### Deployment Platforms

#### Vercel
```bash
# Set in Vercel dashboard
# Project > Settings > Environment Variables
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
```

#### Netlify
```bash
# Set in Netlify dashboard
# Site Settings > Build & Deploy > Environment
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
```

#### Docker
```dockerfile
# Pass as build args
ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL

# Or at runtime
docker run -e VITE_SUPABASE_URL=... app:latest
```

---

## Rotation & Updates

### Updating Environment Variables

```bash
# 1. Update .env
VITE_SUPABASE_URL=https://new-url.supabase.co

# 2. Restart dev server
npm run dev

# 3. Test application
# (Check browser console for errors)

# 4. Deploy to staging
# (Usually via CI/CD)

# 5. Deploy to production
# (Update in deployment platform)
```

### Rotating Secrets

```bash
# 1. Generate new Supabase key
#    (Supabase dashboard > Settings > API)

# 2. Update environment variables in deployment
#    (Vercel/Netlify dashboard)

# 3. Redeploy application
#    (Usually automatic via git)

# 4. Verify application works
#    (Check monitoring dashboards)

# 5. Invalidate old credentials
#    (In Supabase if needed)
```

---

## Summary Table

| Variable | Purpose | Required | Default | Env |
|----------|---------|----------|---------|-----|
| `VITE_SUPABASE_URL` | Database URL | ✅ | None | All |
| `VITE_SUPABASE_KEY` | Auth key | ✅ | None | All |
| `VITE_DEBUG` | Debug mode | ❌ | false | Dev |
| `VITE_LOG_LEVEL` | Log level | ❌ | info | Dev |
| `VITE_SESSION_POLL_INTERVAL` | Poll interval (ms) | ❌ | 3000 | All |
| `VITE_ENABLE_ANALYTICS` | Analytics | ❌ | true | All |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | Performance | ❌ | false | Prod |

---

## Next Steps

1. **Check dependencies**: [DEPENDENCIES.md](DEPENDENCIES.md)
2. **Review diagrams**: [diagrams/](diagrams/)
3. **Review system flows**: [SYSTEM_FLOW.md](SYSTEM_FLOW.md)
