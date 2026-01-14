# 🔧 Troubleshooting: Application Failed to Respond

## ❌ Lỗi: "Application failed to respond"

Lỗi này xảy ra khi Railway không thể kết nối được với backend application của bạn.

---

## 🔍 Bước 1: Check Logs (Quan trọng nhất!)

### Cách xem logs trên Railway:

1. **Vào Railway Dashboard:**
   - Truy cập: https://railway.app
   - Chọn project của bạn

2. **Click vào Backend Service:**
   - Tìm service Node.js (không phải PostgreSQL)
   - Click vào service đó

3. **Vào Logs Tab:**
   - Click tab **"Logs"** ở trên cùng
   - Xem logs mới nhất

4. **Tìm lỗi:**
   - Scroll xuống để xem logs gần đây nhất
   - Tìm các dòng có `❌`, `Error`, `Failed`, `crash`
   - Copy toàn bộ error message

### Các lỗi thường gặp trong logs:

#### 1. **Port không đúng**
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Giải pháp:** Railway tự động set PORT, không cần hardcode

#### 2. **Database connection failed**
```
P1001: Can't reach database server
```
**Giải pháp:** Xem phần Database Connection bên dưới

#### 3. **Missing environment variables**
```
⚠️  DATABASE_URL: SET BUT EMPTY
```
**Giải pháp:** Xem phần Environment Variables

#### 4. **Build failed**
```
Error: TypeScript compilation failed
```
**Giải pháp:** Check build logs

#### 5. **Application crash on startup**
```
Error: Cannot find module '@prisma/client'
```
**Giải pháp:** Check dependencies

---

## 🔧 Bước 2: Verify Settings

### 1. Check Root Directory

1. Vào **Settings** tab
2. Tìm **"Root Directory"**
3. Phải set là: `backend`
4. Nếu không có, dùng alternative commands (xem bên dưới)

### 2. Check Build Command

**Settings** → **Build Command** phải là:
```
npm install && npm run build
```

**Nếu Root Directory không có, dùng:**
```
cd backend && npm install && npm run build
```

### 3. Check Start Command

**Settings** → **Start Command** phải là:
```
npm run start:prod
```

**Nếu Root Directory không có, dùng:**
```
cd backend && npm run start:prod
```

### 4. Check PORT

**QUAN TRỌNG:** Railway tự động inject PORT environment variable.

**KHÔNG hardcode port trong code!**

Check `backend/src/index.ts`:
```typescript
// ✅ ĐÚNG
const PORT = process.env.PORT || 3001;

// ❌ SAI (nếu hardcode)
const PORT = 3001;
```

---

## 🔧 Bước 3: Check Environment Variables

### Required Variables:

1. **DATABASE_URL:**
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   - Verify không empty
   - Click vào variable để xem resolved value

2. **JWT_SECRET:**
   ```env
   JWT_SECRET=your-production-secret-min-32-chars
   ```

3. **NODE_ENV:**
   ```env
   NODE_ENV=production
   ```

4. **PORT:**
   - Railway tự động set, KHÔNG cần add manually
   - Nếu add, có thể gây conflict

5. **FRONTEND_URL (optional):**
   ```env
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

### Verify Variables:

1. Vào **Variables** tab
2. Click vào từng variable để xem giá trị
3. Đảm bảo không có variable nào empty (trừ optional ones)

---

## 🔧 Bước 4: Check Database Connection

### Verify PostgreSQL Service:

1. **Check PostgreSQL Status:**
   - Vào PostgreSQL service
   - Status phải là **"Active"** (không phải "Deploying")

2. **Check DATABASE_URL:**
   - Vào backend service → Variables
   - Click vào `DATABASE_URL`
   - Phải hiển thị connection string (không empty)
   - Format: `postgresql://postgres:password@host:port/railway`

3. **Check Service Connection:**
   - Vào PostgreSQL service → Settings
   - Verify backend service được list trong "Connected Services"

### Test Database Connection:

Nếu có quyền truy cập terminal:
```bash
# Test connection
psql "postgresql://postgres:password@host:port/railway"
```

---

## 🔧 Bước 5: Common Fixes

### Fix 1: Port Configuration

**Vấn đề:** Application không listen đúng port

**Giải pháp:**
1. Check `backend/src/index.ts`:
   ```typescript
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

2. **KHÔNG hardcode port!** Railway sẽ tự động set PORT

### Fix 2: Missing Dependencies

**Vấn đề:** `node_modules` không đầy đủ

**Giải pháp:**
1. Check Build Command có `npm install`
2. Redeploy service
3. Check build logs để xem có lỗi install không

### Fix 3: Prisma Client Not Generated

**Vấn đề:** `@prisma/client` chưa được generate

**Giải pháp:**
- Script `start:prod` đã có `npx prisma generate`
- Check logs xem có chạy không
- Nếu không, add manually vào Start Command:
  ```
  npx prisma generate && npm run start:prod
  ```

### Fix 4: Database Migration Failed

**Vấn đề:** Migrations fail, app không start

**Giải pháp:**
1. Check logs xem migration error
2. Verify DATABASE_URL đúng
3. Check database connection
4. Có thể cần reset database (⚠️ mất data)

### Fix 5: Application Crash on Startup

**Vấn đề:** App start nhưng crash ngay

**Giải pháp:**
1. Check logs để xem error cụ thể
2. Common causes:
   - Missing environment variable
   - Database connection failed
   - Port conflict
   - Missing dependencies

---

## 🔧 Bước 6: Redeploy

Sau khi fix các issues:

1. **Redeploy Service:**
   - Vào **Deployments** tab
   - Click **"Redeploy"** hoặc **"Deploy"**
   - Hoặc push code mới lên GitHub (auto-deploy)

2. **Monitor Logs:**
   - Vào **Logs** tab
   - Xem real-time logs
   - Tìm messages:
     ```
     ✅ All required environment variables are set!
     ✅ Database connection successful!
     ✔ Generated Prisma Client
     🔄 Running database migrations...
     🌱 Seeding database...
     ✨ Starting server...
     🏦 Agribank CRM Backend Server Started 🚀
     🌐 Server running on: http://0.0.0.0:PORT
     ```

3. **Verify Health Endpoint:**
   - Đợi deployment xong (2-5 phút)
   - Test: `https://your-service.up.railway.app/health`
   - Phải trả về: `{"status":"healthy"}`

---

## 📋 Checklist Debug

Trước khi hỏi help, check:

- [ ] Logs có hiển thị error gì không?
- [ ] Root Directory = `backend`?
- [ ] Build Command đúng?
- [ ] Start Command đúng?
- [ ] DATABASE_URL không empty?
- [ ] PostgreSQL service "Active"?
- [ ] PORT không hardcode trong code?
- [ ] Dependencies đã install (check build logs)?
- [ ] Prisma Client đã generate?
- [ ] Migrations chạy thành công?
- [ ] Application start message trong logs?

---

## 🚨 Quick Fixes

### Nếu logs show "Port already in use":
```bash
# Remove PORT from environment variables
# Railway tự động set PORT
```

### Nếu logs show "DATABASE_URL empty":
```bash
# Check PostgreSQL service name
# Update: DATABASE_URL=${{CorrectServiceName.DATABASE_URL}}
```

### Nếu logs show "Cannot find module":
```bash
# Redeploy để reinstall dependencies
# Check build logs xem npm install có chạy không
```

### Nếu logs show "Database connection failed":
```bash
# Wait for PostgreSQL to be "Active"
# Check DATABASE_URL value
# Redeploy backend service
```

---

## 💡 Tips

1. **Luôn check logs trước:** Logs sẽ cho biết chính xác lỗi gì
2. **Monitor real-time:** Xem logs trong khi deploy
3. **Test health endpoint:** `/health` là cách nhanh nhất verify app
4. **Check deployment status:** Phải "Active" không phải "Failed"
5. **Redeploy sau khi fix:** Settings changes cần redeploy

---

## 📞 Still Not Working?

Nếu đã làm tất cả mà vẫn lỗi:

1. **Copy toàn bộ logs** (đặc biệt error messages)
2. **Screenshot settings** (Build Command, Start Command, Root Directory)
3. **List environment variables** (ẩn sensitive values)
4. **Check Railway status page:** https://status.railway.app
5. **Contact Railway support:** https://railway.app/help

---

## 📚 Related Guides

- **Getting Backend URL:** `HOW_TO_GET_RAILWAY_URL.md`
- **DATABASE_URL Issues:** `RAILWAY_DATABASE_URL_FIX.md`
- **Full Deployment:** `RAILWAY_FULL_DEPLOYMENT.md`

---

**Last Updated:** 2026-01-14
