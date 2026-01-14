# 🚀 COMPLETE SETUP, DEBUG & DEPLOYMENT GUIDE

**From Zero to Production in 30 Minutes**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Setup Backend (15 min)](#phase-1-setup-backend)
3. [Phase 2: Setup Frontend (5 min)](#phase-2-setup-frontend)
4. [Phase 3: First Run & Testing (10 min)](#phase-3-first-run--testing)
5. [Debugging Guide](#debugging-guide)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Deployment Guide](#deployment-guide)

---

## Prerequisites

### Software Requirements

| Software | Version | Download Link | Status |
|----------|---------|---------------|--------|
| **Node.js** | 20+ | https://nodejs.org | Check: `node -v` |
| **npm** | 10+ | (comes with Node) | Check: `npm -v` |
| **PostgreSQL** | 16+ | https://www.postgresql.org/download | Check: `psql --version` |
| **Git** | Latest | https://git-scm.com | Optional |

### Quick Check

```bash
# Run these commands to verify:
node -v        # Should show: v20.x.x or higher
npm -v         # Should show: 10.x.x or higher
psql --version # Should show: psql (PostgreSQL) 16.x
```

**❌ If any command fails:**
- Node.js missing → Install from nodejs.org
- PostgreSQL missing → Install from postgresql.org

---

## Phase 1: Setup Backend

**Time: ~15 minutes**

### Step 1.1: Install PostgreSQL (if not installed)

#### Windows:
1. Download: https://www.postgresql.org/download/windows/
2. Run installer
3. **Important**: Remember the password you set for user `postgres`
4. Keep default port: `5432`
5. Complete installation

#### Verify Installation:
```bash
# Open Command Prompt or PowerShell
psql --version
# Should show: psql (PostgreSQL) 16.x
```

---

### Step 1.2: Create Database

#### Option A: Using pgAdmin (GUI)
1. Open pgAdmin (installed with PostgreSQL)
2. Connect to server (use your password)
3. Right-click "Databases" → Create → Database
4. Name: `agribank_crm`
5. Click "Save"

#### Option B: Using Command Line
```bash
# Open Command Prompt
psql -U postgres
# Enter your PostgreSQL password

# In psql prompt:
CREATE DATABASE agribank_crm;
\q
```

#### Verify Database Created:
```bash
psql -U postgres -l
# Should see 'agribank_crm' in the list
```

---

### Step 1.3: Create Backend `.env` File

```bash
# Navigate to backend folder
cd E:\Final-main\backend

# Copy .env.example to .env
copy .env.example .env
```

#### Edit `.env` file:

**Open `E:\Final-main\backend\.env` in Notepad and update:**

```env
# DATABASE CONNECTION
# Replace YOUR_PASSWORD with your actual PostgreSQL password
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/agribank_crm?schema=public"

# JWT SECRET (IMPORTANT: Change this to a random string in production!)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long-change-this-in-production"

# SERVER CONFIGURATION
PORT=3001
NODE_ENV=development

# CORS - Frontend URL
FRONTEND_URL=http://localhost:3000

# FILE UPLOAD
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# INTEREST RATE (Default)
DEFAULT_INTEREST_RATE=6.5
```

**🔴 CRITICAL: Replace `YOUR_PASSWORD` with your actual PostgreSQL password!**

**Example:**
If your password is `admin123`, then:
```
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/agribank_crm?schema=public"
```

---

### Step 1.4: Install Backend Dependencies

```bash
# Make sure you're in backend folder
cd E:\Final-main\backend

# Install all dependencies
npm install

# This will install:
# - Express, Prisma, bcryptjs, JWT
# - Excel parsing (xlsx), file upload (multer)
# - Validation (zod), cron jobs (node-cron)
# Takes ~3-5 minutes depending on internet speed
```

**✅ Success indicators:**
- No error messages
- `node_modules` folder created
- Message: "added XXX packages"

**❌ If errors occur:**
- Check Node.js version: `node -v` (must be 20+)
- Try: `npm cache clean --force` then `npm install` again
- Check internet connection

---

### Step 1.5: Run Database Migrations

```bash
# Still in E:\Final-main\backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates all database tables)
npm run prisma:migrate

# If prompted for migration name, press Enter (uses default name)
```

**✅ Success indicators:**
```
✔ Generated Prisma Client
✔ Database connection established
✔ Migration applied successfully
```

**❌ Common errors:**

**Error: "Can't reach database server"**
- Solution: Check PostgreSQL is running (Services → PostgreSQL)
- Verify password in `.env` file

**Error: "Database does not exist"**
- Solution: Create database manually (Step 1.2)

---

### Step 1.6: Seed Database with Demo Data

```bash
# Seed creates:
# - 5 organizations
# - 20 demo users (4 per organization)
# - Default interest rate settings
# - Bank accounts

npm run prisma:seed
```

**✅ Success output:**
```
🌱 Starting database seeding...

📦 Creating organization: Agribank Chi nhánh Hà Nội...
  ✓ Organization created: ORG001
  ✓ Admin user created: admin_org001 (password: admin123)
  ✓ User created: user1_org001 (password: admin123)
  ... (20 users total)
  ✓ Bank account created: 123456789
  ✓ Interest rate set: 6.5%

✅ Seeding completed successfully!

📋 LOGIN CREDENTIALS (5 Organizations):

🏢 Agribank Chi nhánh Hà Nội
   Username: admin_org001
   Password: admin123
   Code: ORG001

... (4 more organizations)
```

**💾 Save these credentials!** You'll need them to login.

---

### Step 1.7: Start Backend Server

```bash
# In E:\Final-main\backend
npm run dev
```

**✅ Success output:**
```
🚀 Server running on port 3001
✅ Prisma Client connected
📅 Cron jobs initialized
```

**✅ Test backend is working:**

Open new terminal and run:
```bash
curl http://localhost:3001/health
```

Or open browser: `http://localhost:3001/health`

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T...",
  "uptime": 123.45,
  "environment": "development",
  "database": "connected"
}
```

**🎉 Backend is ready!** Keep this terminal running.

---

## Phase 2: Setup Frontend

**Time: ~5 minutes**

### Step 2.1: Verify Frontend Dependencies

```bash
# Open NEW terminal window
cd E:\Final-main

# Check if node_modules exists
dir node_modules

# If node_modules doesn't exist, install:
npm install

# This installs: React, Vite, Axios, React Router, etc.
```

---

### Step 2.2: Verify `.env` File

```bash
# Check if .env exists
type .env
```

**Should contain:**
```env
VITE_API_URL=http://localhost:3001/api
VITE_ENV=development
```

**If file doesn't exist:**
```bash
copy .env.example .env
```

---

### Step 2.3: Start Frontend Server

```bash
# In E:\Final-main
npm run dev
```

**✅ Success output:**
```
VITE v6.2.0  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**🎉 Frontend is ready!**

---

## Phase 3: First Run & Testing

**Time: ~10 minutes**

### Step 3.1: Open Browser

1. Open browser: **http://localhost:3000**
2. You should see **Login page**

**✅ Good signs:**
- Page loads without errors
- Login form visible
- No console errors (F12 → Console)

**❌ If blank page:**
- Check browser console (F12)
- Check frontend terminal for errors
- Verify frontend is running on port 3000

---

### Step 3.2: Login Test

**Use these credentials (from seed data):**
```
Username: admin_org001
Password: admin123
```

**Click "Đăng nhập"**

**✅ Success:**
- Page redirects to Dashboard
- You see loading spinner briefly
- Dashboard loads with statistics

**❌ If error:**
- Check console (F12) for error messages
- Check Network tab (F12) → Should see POST request to `/api/auth/login`
- If 401 error → Wrong credentials
- If network error → Backend not running

---

### Step 3.3: Test Dashboard

**Once logged in, verify:**

- [ ] **Dashboard loads** with statistics
- [ ] **Sidebar** shows navigation items
- [ ] **No console errors** (F12 → Console tab)

**Check these numbers make sense:**
- Total Projects: Should show some number
- Total Budget: Should show currency
- Bank Balance: Should show 0 or some amount

---

### Step 3.4: Test Excel Upload

1. **Navigate to "Dự án" (Projects) page**
2. **Click "📤 Upload Excel" button**

**Create test Excel file:**
```
Column A: Họ và tên
Column B: CCCD
Column C: Số tiền

Row 2: Nguyễn Văn A | 123456789 | 1000000
Row 3: Trần Thị B | 987654321 | 2000000
```

3. **Select your test Excel file**
4. **Verify:**
   - [ ] Upload progress shows
   - [ ] Preview modal appears
   - [ ] Data displays correctly in preview

5. **Click "Nhập dữ liệu"**
6. **Verify:**
   - [ ] Success message appears
   - [ ] Transactions list updates

---

### Step 3.5: Test Transaction Actions

1. **Go to "Giao dịch" (Transactions) page**
2. **Click on a transaction** to open details
3. **Test "Xác nhận chi trả":**
   - [ ] Status changes to "Đã giải ngân"
   - [ ] Bank balance decreases
   - [ ] No errors in console

---

### Step 3.6: Test Bank Balance

1. **Go to "Số dư" (Bank Balance) page**
2. **Click "Nạp tiền"**
3. **Enter amount: 5000000, note: "Test deposit"**
4. **Verify:**
   - [ ] Transaction appears in history
   - [ ] Current balance increases
   - [ ] Running balance is correct

---

### Step 3.7: Test Multi-Tenancy

1. **Logout** (click user icon → Logout)
2. **Login with different org:**
   ```
   Username: admin_org002
   Password: admin123
   ```
3. **Verify:**
   - [ ] Cannot see projects from ORG001
   - [ ] Separate data per organization
   - [ ] Dashboard shows different statistics

**✅ If all tests pass → System is working correctly!**

---

## Debugging Guide

### 🔍 How to Debug Issues

#### Step 1: Check Browser Console

**Open DevTools: F12 (Chrome/Edge) or Ctrl+Shift+I**

**Console Tab:**
- Look for red errors
- Common errors:
  - `401 Unauthorized` → Token expired, login again
  - `Network Error` → Backend not running
  - `CORS error` → Backend CORS misconfigured

**Network Tab:**
- Filter by "XHR" or "Fetch"
- Look at API requests:
  - Should see `/api/auth/login`, `/api/projects`, etc.
  - Status codes: 200 = OK, 401 = Unauthorized, 500 = Server Error
- Click on a request → Preview tab → See response data

---

#### Step 2: Check Backend Logs

**In backend terminal, look for:**

**✅ Good logs:**
```
POST /api/auth/login 200 45ms
GET /api/projects 200 12ms
POST /api/transactions/:id/status 200 89ms
```

**❌ Bad logs:**
```
Error: Invalid token
PrismaClientKnownRequestError: ...
TypeError: Cannot read property ...
```

**If you see errors:**
- Read the error message carefully
- Check the file and line number
- Look up error on Google/Stack Overflow

---

#### Step 3: Use Debugging Tools

**Backend Debugging:**

```typescript
// Add console.logs in backend code
console.log('🔍 User data:', user);
console.log('🔍 Request body:', req.body);
console.log('🔍 Query result:', result);

// In routes/auth.ts, for example:
router.post('/login', async (req: AuthRequest, res) => {
  console.log('🔍 Login attempt:', req.body.username);
  const user = await prisma.user.findUnique({ ... });
  console.log('🔍 User found:', user ? 'YES' : 'NO');
  // ...
});
```

**Frontend Debugging:**

```typescript
// Add console.logs in App.tsx
const loadAllData = async () => {
  console.log('🔍 Loading data...');
  try {
    const projectsData = await api.projects.getAll();
    console.log('🔍 Projects loaded:', projectsData.length);
    // ...
  } catch (error) {
    console.error('❌ Load failed:', error);
  }
};
```

---

#### Step 4: Check Database

```bash
# Open Prisma Studio (Database GUI)
cd E:\Final-main\backend
npm run prisma:studio
```

**Opens browser at: http://localhost:5555**

**Verify:**
- [ ] Organizations table has 5 rows
- [ ] Users table has 20 rows
- [ ] Projects table has your uploaded projects
- [ ] Transactions table has your transactions
- [ ] BankAccounts table has accounts

**If data is missing:**
- Re-run seed: `npm run prisma:seed`
- Check if migrations ran: `npm run prisma:migrate`

---

## Common Issues & Solutions

### Issue 1: Backend Won't Start

**Error:** `Error: Cannot find module '@prisma/client'`

**Solution:**
```bash
cd E:\Final-main\backend
npm install
npm run prisma:generate
```

---

**Error:** `Can't reach database server`

**Solution:**
1. Check PostgreSQL is running:
   - Windows: Services → PostgreSQL → Status should be "Running"
   - Or restart: `net start postgresql-x64-16` (adjust version)

2. Check `.env` file:
   - Verify `DATABASE_URL` has correct password
   - Verify database name is `agribank_crm`

3. Test connection:
   ```bash
   psql -U postgres -d agribank_crm
   # If connects → database OK
   # If fails → fix database setup
   ```

---

**Error:** `Port 3001 already in use`

**Solution:**
```bash
# Find and kill process on port 3001
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Or change port in .env:
PORT=3002
```

---

### Issue 2: Frontend Shows Blank Page

**Check 1: Console Errors**
- Open F12 → Console
- Look for JavaScript errors
- Common: `Cannot find module` → Missing dependency

**Solution:**
```bash
cd E:\Final-main
npm install
```

---

**Check 2: Vite Build Issues**

**Solution:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

### Issue 3: Login Fails

**Error in console: `401 Unauthorized`**

**Check 1: Verify credentials**
- Username: `admin_org001` (all lowercase)
- Password: `admin123` (exact match)

**Check 2: Backend logs**
- Look for login attempt logs
- Check if user was found in database

**Check 3: Database seeded?**
```bash
cd E:\Final-main\backend
npm run prisma:studio
# Check Users table has admin_org001
```

**Solution if no users:**
```bash
npm run prisma:seed
```

---

**Error: `Network Error`**

**Solution:**
- Backend not running → Start backend: `cd backend && npm run dev`
- Wrong API URL → Check frontend `.env` has `VITE_API_URL=http://localhost:3001/api`
- Restart frontend after changing .env

---

### Issue 4: CORS Error

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:**

Check backend `.env`:
```env
FRONTEND_URL=http://localhost:3000
```

Check backend `src/index.ts` has CORS configured:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

**Restart backend after changes.**

---

### Issue 5: Excel Upload Fails

**Error:** `Only Excel files allowed`

**Solution:**
- File must end with `.xlsx` or `.xls`
- Check file is not corrupted
- File size must be under 10MB (check `MAX_FILE_SIZE` in backend .env)

---

**Error:** `Failed to parse Excel file`

**Solution:**
- Check Excel columns match expected format:
  - Column A: "Họ và tên" or "name"
  - Column B: "CCCD" or "cccd"
  - Column C: "Số tiền" or "amount"

- Use provided template (if available) or match exact column names

---

### Issue 6: Transactions Not Showing

**Check 1: Network tab**
- F12 → Network → Filter "XHR"
- Look for `/api/transactions` request
- Status 200? → Data returned but not displaying
- Status 500? → Backend error, check backend logs

**Check 2: Database**
```bash
npm run prisma:studio
# Check Transactions table
# Should have rows with your organizationId
```

**Check 3: Multi-tenancy filter**
- Make sure logged in user's organizationId matches transactions
- Try different organization login

---

### Issue 7: Database Migration Fails

**Error:** `Migration failed to apply`

**Solution 1: Reset database**
```bash
cd E:\Final-main\backend

# Reset database (⚠️ DELETES ALL DATA)
npm run prisma:migrate:reset

# Seed again
npm run prisma:seed
```

**Solution 2: Manual reset**
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Drop database
DROP DATABASE agribank_crm;

-- Recreate
CREATE DATABASE agribank_crm;

\q
```

Then re-run migrations:
```bash
npm run prisma:migrate
npm run prisma:seed
```

---

### Issue 8: Railway Deployment - Prisma Schema Not Found

**Error:** `Error: Could not find Prisma Schema that is required for this command.`

**Cause:** Railway is running build commands from the root directory, but Prisma schema is in `backend/prisma/schema.prisma`.

**Solution 1: Set Root Directory (Recommended)**
1. In Railway dashboard, go to your backend service
2. Click "Settings" tab
3. Find "Root Directory" section
4. Set value to: `backend`
5. Save and redeploy

**Solution 2: Update Build Command**
If Root Directory setting is not available, update the Build Command:
```
cd backend && npm install && npm run build && npx prisma migrate deploy --schema=prisma/schema.prisma && npx prisma db seed --schema=prisma/schema.prisma
```

And update Start Command:
```
cd backend && npm start
```

**Solution 3: Verify File Structure**
Make sure your repository has this structure:
```
your-repo/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma  ← Must exist here
│   ├── package.json
│   └── src/
└── (other files)
```

**After fixing:** Redeploy the service in Railway.

---

### Issue 9: Railway Deployment - DATABASE_URL Not Found During Build

**Error:** `Error: Environment variable not found: DATABASE_URL` during build phase

**Cause:** Prisma migrate is running during build phase, but DATABASE_URL is only available at runtime on Railway.

**Solution:**
1. **Update Build Command** (remove migrate/seed from build):
   - Go to Railway → Backend Service → Settings → Build Command
   - Change from: `npm install && npm run build && npx prisma migrate deploy && npx prisma db seed`
   - To: `npm install && npm run build`

2. **Update Start Command** (run migrate/seed on startup):
   - Go to Railway → Backend Service → Settings → Start Command
   - Change from: `npm start`
   - To: `npm run start:prod`

3. **Verify Environment Variables:**
   - Make sure `DATABASE_URL=${{Postgres.DATABASE_URL}}` is set in Variables tab
   - Railway automatically injects this when PostgreSQL service is connected

**Why this works:**
- Build phase runs before database is available
- Start phase has access to DATABASE_URL
- The `start:prod` script runs migrations and seed before starting the server

**After fixing:** Redeploy the service in Railway.

---

### Issue 10: Railway Deployment - DATABASE_URL is Empty String

**Error:** `Error validating datasource 'db': You must provide a nonempty URL. The environment variable 'DATABASE_URL' resolved to an empty string.`

**Cause:** DATABASE_URL environment variable exists but is empty, usually because:
1. PostgreSQL service reference is incorrect
2. PostgreSQL service is not connected to backend service
3. Service name in reference doesn't match actual service name

**Solution 1: Verify PostgreSQL Service Connection**
1. Go to Railway project dashboard
2. Check that PostgreSQL service shows "Active" status
3. Click on PostgreSQL service → Settings → Check service name
4. Go back to backend service → Variables
5. Verify DATABASE_URL uses correct service name:
   - If PostgreSQL service is named "Postgres": `${{Postgres.DATABASE_URL}}`
   - If named "PostgreSQL": `${{PostgreSQL.DATABASE_URL}}`
   - If named something else: `${{YourServiceName.DATABASE_URL}}`

**Solution 2: Reconnect Services**
1. Go to PostgreSQL service → Settings
2. Look for "Service Connections" or "Connected Services"
3. Ensure backend service is listed
4. If not, Railway should auto-connect, but you may need to redeploy

**Solution 3: Manual DATABASE_URL Setup**
1. Go to PostgreSQL service → Variables tab
2. Find `DATABASE_URL` variable (Railway creates this automatically)
3. Copy the full connection string
4. Go to backend service → Variables tab
5. Add or update `DATABASE_URL` with the copied value directly (not using `${{...}}` syntax)
6. Format should be: `postgresql://user:password@host:port/database`

**Solution 4: Check Service Deployment Order**
1. Ensure PostgreSQL service is fully deployed first
2. Wait for PostgreSQL to show "Active" status
3. Then deploy or redeploy backend service
4. Railway needs PostgreSQL to be ready before injecting DATABASE_URL

**Solution 5: Use Environment Check Script**
The application now includes an environment check script that will:
- Validate all required environment variables before starting
- Show which variables are missing or empty
- Provide helpful error messages

If you see the check script errors, follow its troubleshooting tips.

**After fixing:** Redeploy the backend service in Railway.

**📖 Xem hướng dẫn chi tiết từng bước:** Xem file `RAILWAY_DATABASE_URL_FIX.md` trong repository.

---

### Issue 11: Railway Deployment - Can't Reach Database Server

**Error:** `P1001: Can't reach database server at 'postgres.railway.internal:5432'`

**Cause:** Backend service is trying to connect to PostgreSQL before it's fully ready, or there's a network connectivity issue.

**Solution 1: Wait for PostgreSQL Service**
1. Go to Railway project dashboard
2. Check PostgreSQL service status
3. Ensure it shows "Active" (not "Deploying" or "Failed")
4. Wait 1-2 minutes after PostgreSQL shows "Active"
5. Then redeploy backend service

**Solution 2: Check Service Connection**
1. Go to PostgreSQL service → Settings
2. Verify backend service is listed in "Connected Services"
3. If not, Railway should auto-connect, but you may need to redeploy

**Solution 3: Verify DATABASE_URL**
1. Go to backend service → Variables
2. Check DATABASE_URL value
3. It should use internal hostname: `postgres.railway.internal` or `postgres.railway.app`
4. If using external hostname, Railway services should use internal hostname for better connectivity

**Solution 4: Retry Logic (Already Implemented)**
The application now includes automatic retry logic:
- Waits for database connection with exponential backoff
- Retries up to 10 times
- Shows helpful error messages if all retries fail
- The `wait-for-db.js` script runs before migrations

**Solution 5: Redeploy Both Services**
1. Stop backend service (if running)
2. Redeploy PostgreSQL service
3. Wait for PostgreSQL to be "Active"
4. Redeploy backend service

**After fixing:** The retry script will automatically wait for database. If it still fails after all retries, check PostgreSQL service logs.

---

## Deployment Guide

### Option 1: Railway Full Stack (Recommended for Beginners)

**Deploy cả Backend và Database trên Railway - Đơn giản nhất!**

**Why Railway Full Stack:**
- ✅ Setup cực kỳ đơn giản (1 click cho database)
- ✅ Tự động connect services
- ✅ Tất cả trong 1 platform
- ✅ Free tier: $5 credit/month, 512MB database
- ✅ Auto HTTPS
- ✅ GitHub integration

**📖 Detailed Guide:** See `RAILWAY_FULL_DEPLOYMENT.md` for complete step-by-step instructions.

**Why Railway:**
- ✅ Easy deployment (click-based)
- ✅ Free PostgreSQL database
- ✅ Automatic HTTPS
- ✅ GitHub integration
- ✅ No credit card for free tier

---

#### Step 1: Prepare Code

```bash
# Make sure all code is committed
cd E:\Final-main
git init
git add .
git commit -m "Initial commit - Ready for deployment"
```

---

#### Step 2: Push to GitHub

1. Create repository on GitHub:
   - Go to https://github.com/new
   - Name: `agribank-crm`
   - Public or Private (your choice)
   - Click "Create repository"

2. Push code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/agribank-crm.git
git branch -M main
git push -u origin main
```

---

#### Step 3: Deploy Backend on Railway

1. **Sign up Railway:** https://railway.app (use GitHub account)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `agribank-crm` repository
   - Railway will auto-detect Node.js project

3. **Add PostgreSQL Database:**
   - In project dashboard, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway creates database automatically
   - **Wait for PostgreSQL service to fully deploy** (check status shows "Active")
   - **Important:** Note the service name (usually "Postgres" or "PostgreSQL")

4. **Connect PostgreSQL to Backend Service:**
   - **Critical Step:** Click on your **PostgreSQL service** (not the backend service)
   - Go to "Settings" tab
   - Scroll down to "Connect" or "Service Connections" section
   - Make sure your backend service is listed as connected
   - If not connected, Railway should auto-connect, but you can manually verify

5. **Configure Environment Variables:**
   - **Important:** Click on your **backend service** (e.g., "agribank-crm" or your service name), NOT the Postgres database
   - Go to "Variables" tab (or "Environment Variables")
   - **Check if DATABASE_URL already exists** (Railway may auto-inject it)
   - If DATABASE_URL is missing or empty, add it manually:
   
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   
   **Important Notes:**
   - Replace `Postgres` with your actual PostgreSQL service name if different
   - The format is: `${{ServiceName.DATABASE_URL}}`
   - If your PostgreSQL service is named "PostgreSQL", use: `${{PostgreSQL.DATABASE_URL}}`
   - You can check the service name in the PostgreSQL service's "Settings" → "Name"
   
   - Add other required variables:
   
   ```env
   JWT_SECRET=your-production-secret-change-this-min-32-chars
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app  # Will set this later
   ```
   
   **Verify DATABASE_URL:**
   - After adding, click on the variable to see its resolved value
   - It should show a PostgreSQL connection string (not empty)
   - If it shows empty or `${{Postgres.DATABASE_URL}}` literally, the reference is wrong

6. **Configure Root Directory and Build Command:**
   - **Still in the same backend service** (same place where you added Variables)
   - Go to "Settings" tab (you'll see tabs like: Deployments, Metrics, Variables, Settings, etc.)
   - **IMPORTANT:** Scroll down to find "Root Directory" section
   - Set "Root Directory": `backend` (this tells Railway to use the backend folder as the working directory)
   - Scroll down to find "Build Command" section
   - Set "Build Command": `npm install && npm run build` (migrations will run on startup)
   - Set "Start Command": `npm run start:prod` (this runs migrations and seed before starting server)
   
   **Alternative (if Root Directory setting is not available):**
   - If you can't find "Root Directory" setting, use these commands instead:
   - Set "Build Command": `cd backend && npm install && npm run build`
   - Set "Start Command": `cd backend && npm run start:prod`
   
   **Note:** The `start:prod` script automatically runs:
   - `prisma generate` - Generate Prisma Client
   - `prisma migrate deploy` - Apply database migrations
   - `prisma db seed` - Seed initial data
   - `node dist/index.js` - Start the server

7. **Deploy:**
   - Click "Deploy"
   - Wait ~5 minutes for deployment

8. **Get Backend URL:**
   - **Cách 1: Từ Settings (Khuyến nghị)**
     - Vào backend service → **"Settings"** tab
     - Scroll xuống phần **"Domains"** hoặc **"Networking"**
     - Tìm **"Public Domain"** hoặc **"Generate Domain"**
     - Click **"Generate Domain"** nếu chưa có
     - Copy URL (ví dụ: `https://agribank-backend-production.up.railway.app`)
   
   - **Cách 2: Từ Service Overview**
     - Vào backend service (click vào service name)
     - Ở phần trên cùng, bạn sẽ thấy URL
     - Hoặc click vào icon **"Open"** hoặc **"Visit"**
   
   - **Cách 3: Từ Deployments**
     - Vào **"Deployments"** tab
     - Click vào deployment mới nhất
     - URL sẽ hiển thị ở đó
   
   **Lưu ý:** 
   - URL sẽ có dạng: `https://[service-name].up.railway.app`
   - API base URL sẽ là: `https://[service-name].up.railway.app/api`
   - Railway tự động tạo HTTPS domain

8. **Test Backend:**
   - Open: `https://your-backend-url.railway.app/health`
   - Should see: `{"status":"healthy"}`

---

#### Step 4: Deploy Frontend on Vercel

1. **Sign up Vercel:** https://vercel.com (use GitHub account)

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite

3. **Configure Environment Variables:**
   - Before clicking "Deploy", add environment variables:
   - Click "Environment Variables"
   - Add:
     ```
     Name: VITE_API_URL
     Value: https://your-backend-url.railway.app/api
     ```

4. **Deploy:**
   - Click "Deploy"
   - Wait ~2 minutes

5. **Get Frontend URL:**
   - Copy URL (e.g., `https://agribank-crm.vercel.app`)

6. **Update Backend FRONTEND_URL:**
   - Go back to Railway → Your backend service
   - Update `FRONTEND_URL` variable to your Vercel URL
   - Redeploy backend

---

#### Step 5: Test Production

1. **Open your Vercel URL:**
   - Should see login page

2. **Login:**
   ```
   Username: admin_org001
   Password: admin123
   ```

3. **Test all features:**
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Excel upload works
   - [ ] Transaction actions work
   - [ ] Bank operations work
   - [ ] Multi-tenancy works

---

### Option 2: Supabase Database + Railway/Render Backend

**Why Supabase:**
- ✅ Free tier: 500MB database, 2GB bandwidth
- ✅ Built-in connection pooling
- ✅ Full-featured dashboard
- ✅ Automatic backups
- ✅ Better for production scaling

**Setup:**
1. Create Supabase project: https://supabase.com
2. Get database connection string
3. Deploy backend on Railway/Render (same as Option 1)
4. Use Supabase connection string instead of Railway PostgreSQL

**📖 Detailed Guide:** See `SUPABASE_DEPLOYMENT_GUIDE.md` in repository.

---

### Option 3: Render (Alternative)

**Similar to Railway:**
- Free tier available
- PostgreSQL included
- HTTPS automatic

**Differences:**
- Cold starts on free tier (15s delay after inactivity)
- Slightly slower than Railway

**Steps are similar to Railway above.**

---

### Option 4: VPS (Advanced)

**For advanced users only:**

**Requires:**
- Linux knowledge
- SSH access
- Nginx configuration
- PM2 process manager
- Domain name (optional)

**Not recommended for beginners.**

---

## Final Checklist

### Local Development ✅

- [ ] PostgreSQL installed and running
- [ ] Database `agribank_crm` created
- [ ] Backend `.env` file created with correct password
- [ ] Backend dependencies installed (`npm install`)
- [ ] Database migrated (`npm run prisma:migrate`)
- [ ] Database seeded (`npm run prisma:seed`)
- [ ] Backend running on port 3001
- [ ] Frontend dependencies installed
- [ ] Frontend `.env` file exists
- [ ] Frontend running on port 3000
- [ ] Can login with `admin_org001` / `admin123`
- [ ] Dashboard loads correctly
- [ ] Excel upload works
- [ ] Transactions work
- [ ] Bank operations work
- [ ] Multi-tenancy works

### Production Deployment ✅

- [ ] Code pushed to GitHub
- [ ] Backend deployed on Railway/Render
- [ ] PostgreSQL database created
- [ ] Database migrations ran
- [ ] Database seeded
- [ ] Environment variables set
- [ ] Backend URL working (test /health endpoint)
- [ ] Frontend deployed on Vercel
- [ ] Frontend environment variables set
- [ ] CORS configured correctly
- [ ] Production login works
- [ ] All features tested in production

---

## 🎉 SUCCESS!

If all checklists are complete:
- ✅ **Local development** working
- ✅ **Production deployment** working
- ✅ **All features** tested

**Your Agribank CRM system is ready for production use!**

---

## 📞 Need Help?

### Common Resources:
- **PostgreSQL docs:** https://www.postgresql.org/docs/
- **Prisma docs:** https://www.prisma.io/docs/
- **Railway docs:** https://docs.railway.app/
- **Vercel docs:** https://vercel.com/docs

### Debugging Resources:
- **Check browser console:** F12 → Console tab
- **Check network requests:** F12 → Network tab
- **Check database:** `npm run prisma:studio`
- **Check backend logs:** Terminal where backend is running

### Error Messages:
- Google the exact error message
- Check Stack Overflow
- Read the error stack trace carefully

---

**Last Updated:** 2026-01-14
**Version:** 1.0.0
**Status:** ✅ Complete & Production Ready
