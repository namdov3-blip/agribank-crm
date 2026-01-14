# ⚡ QUICK START - 5 Minutes to Running

## 🎯 Goal: Get system running in 5 minutes

---

## Prerequisites Check (1 minute)

```bash
# Run these 3 commands:
node -v        # Must show v20+
npm -v         # Must show v10+
psql --version # Must show PostgreSQL 16+
```

**❌ If any fails:** Install from links in COMPLETE_SETUP_GUIDE.md

---

## Database Setup (2 minutes)

### Step 1: Create Database
```bash
# Option A: Command Line
psql -U postgres
CREATE DATABASE agribank_crm;
\q

# Option B: pgAdmin GUI
# Right-click Databases → Create → Name: agribank_crm
```

### Step 2: Run Setup Script
```bash
cd E:\Final-main\backend
setup.bat
```

**Follow prompts:**
1. Edit `.env` → Change `YOUR_PASSWORD` to your PostgreSQL password
2. Press Enter to continue
3. Wait for installation (~3 minutes)

**✅ When you see:** "Setup Complete! ✅"

---

## Start Servers (30 seconds)

### Terminal 1: Backend
```bash
cd E:\Final-main\backend
npm run dev
```

**Wait for:** "🚀 Server running on port 3001"

### Terminal 2: Frontend (new terminal)
```bash
cd E:\Final-main
npm run dev
```

**Wait for:** "Local: http://localhost:3000"

---

## Test (30 seconds)

1. **Open:** http://localhost:3000
2. **Login:**
   ```
   Username: admin_org001
   Password: admin123
   ```
3. **See Dashboard?** ✅ SUCCESS!

---

## ❌ Quick Troubleshooting

### Backend Won't Start

**Error:** "Can't reach database"
```bash
# Check PostgreSQL running
# Windows: Services → PostgreSQL → Start

# Verify .env password is correct
notepad E:\Final-main\backend\.env
# Check DATABASE_URL line
```

**Error:** "Port 3001 in use"
```bash
# Kill process
netstat -ano | findstr :3001
taskkill /PID <NUMBER> /F
```

---

### Frontend Shows Blank

**Check Console (F12):**
- Red errors? → Read error message
- "Cannot find module" → Run `npm install`
- "Network Error" → Backend not running

**Solution:**
```bash
cd E:\Final-main
npm install
npm run dev
```

---

### Login Fails

**Error:** "401 Unauthorized"

**Check credentials:**
- Username: `admin_org001` (lowercase, underscore)
- Password: `admin123` (no spaces)

**Verify database seeded:**
```bash
cd E:\Final-main\backend
npm run prisma:studio
# Check Users table has admin_org001
```

**If empty:**
```bash
npm run prisma:seed
```

---

## 🎉 Next Steps

**If everything works:**
1. ✅ Read COMPLETE_SETUP_GUIDE.md for detailed features
2. ✅ Test Excel upload
3. ✅ Test transactions
4. ✅ Read deployment section when ready

**If problems persist:**
1. 📖 Read COMPLETE_SETUP_GUIDE.md → Debugging section
2. 🔍 Check specific error in guide
3. 📊 Use Prisma Studio to check database

---

## 📞 Emergency Checklist

**System not working? Check these:**

- [ ] PostgreSQL installed and running
- [ ] Database `agribank_crm` created
- [ ] Backend `.env` file exists with correct password
- [ ] Backend `node_modules` folder exists (ran `npm install`)
- [ ] Backend terminal shows "Server running"
- [ ] Frontend terminal shows "Local: http://localhost:3000"
- [ ] Browser at http://localhost:3000 shows login page
- [ ] No red errors in browser console (F12)

**If any ❌ → Check COMPLETE_SETUP_GUIDE.md for that specific step**

---

## 🎬 Video Tutorial Order

If you prefer step-by-step:

1. **Prerequisites** (COMPLETE_SETUP_GUIDE.md → Prerequisites)
2. **Database Setup** (COMPLETE_SETUP_GUIDE.md → Phase 1, Steps 1-2)
3. **Backend Setup** (Run `setup.bat` or follow Phase 1, Steps 3-7)
4. **Frontend Setup** (COMPLETE_SETUP_GUIDE.md → Phase 2)
5. **Testing** (COMPLETE_SETUP_GUIDE.md → Phase 3)

---

**Total Time:** 5-10 minutes for first-time setup

**After first setup:** 30 seconds to start both servers

---

## 📝 Daily Workflow

**Starting work:**
```bash
# Terminal 1
cd E:\Final-main\backend
npm run dev

# Terminal 2
cd E:\Final-main
npm run dev
```

**Stopping work:**
- Close both terminals or `Ctrl+C` in each

**No need to:**
- ❌ Reinstall dependencies
- ❌ Re-run migrations
- ❌ Re-seed database

**Unless you:**
- Add new dependencies → `npm install`
- Change database schema → `npm run prisma:migrate`
- Need fresh data → `npm run prisma:seed`

---

**Last Updated:** 2026-01-14
