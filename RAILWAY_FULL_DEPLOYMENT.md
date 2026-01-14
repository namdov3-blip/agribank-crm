# 🚀 Hướng Dẫn Deploy Full Stack trên Railway

## 📌 Tổng Quan

**Railway** cung cấp cả **backend hosting** và **PostgreSQL database** trong cùng một platform. Đây là cách đơn giản nhất để deploy full stack.

**Kiến trúc:**
- ✅ **Database:** Railway PostgreSQL
- ✅ **Backend API:** Railway Node.js Service
- ✅ **Frontend:** Vercel / Netlify (hoặc Railway nếu muốn)

---

## 🎯 Ưu Điểm của Railway Full Stack

| Feature | Railway PostgreSQL | Supabase |
|---------|-------------------|----------|
| **Setup** | ✅ Rất đơn giản (1 click) | ⚠️ Cần tạo project riêng |
| **Integration** | ✅ Tự động connect services | ⚠️ Manual connection string |
| **Free Tier** | ✅ 512MB database, $5 credit | ✅ 500MB database |
| **Connection** | ✅ Auto-inject DATABASE_URL | ⚠️ Manual setup |
| **Scaling** | ✅ Easy scaling | ✅ Auto-scaling |
| **Dashboard** | ⚠️ Basic | ✅ Full-featured |
| **Backup** | ⚠️ Manual | ✅ Automatic |
| **Cost** | 💰 Pay-as-you-go | 💰 Free tier generous |

**Kết luận:** Railway phù hợp nếu muốn **đơn giản, nhanh chóng**. Supabase phù hợp nếu cần **dashboard mạnh, backup tự động**.

---

## 📋 Hướng Dẫn Từng Bước

### Bước 1: Tạo Railway Project

1. **Đăng ký/Đăng nhập Railway:**
   - Truy cập: https://railway.app
   - Đăng nhập bằng GitHub account

2. **Tạo Project mới:**
   - Click **"New Project"**
   - Chọn **"Deploy from GitHub repo"**
   - Chọn repository `agribank-crm`
   - Railway sẽ tự động detect Node.js project

### Bước 2: Thêm PostgreSQL Database

1. **Trong Railway Project Dashboard:**
   - Click **"+ New"** button
   - Chọn **"Database"** → **"PostgreSQL"**
   - Railway tự động tạo PostgreSQL service

2. **Đợi PostgreSQL Deploy:**
   - Status sẽ chuyển từ "Deploying" → "Active"
   - Đợi 1-2 phút để PostgreSQL sẵn sàng
   - **Lưu ý:** Ghi lại tên service (thường là "Postgres" hoặc "PostgreSQL")

### Bước 3: Configure Backend Service

1. **Click vào Backend Service:**
   - Tìm service có icon Node.js (không phải PostgreSQL)
   - Click vào service đó

2. **Set Root Directory:**
   - Vào **Settings** tab
   - Tìm **"Root Directory"**
   - Set giá trị: `backend`
   - Click **"Save"**

3. **Configure Build Command:**
   - Vẫn trong **Settings** tab
   - Tìm **"Build Command"**
   - Set: `npm install && npm run build`
   - Click **"Save"**

4. **Configure Start Command:**
   - Tìm **"Start Command"**
   - Set: `npm run start:prod`
   - Click **"Save"**

### Bước 4: Configure Environment Variables

1. **Vào Variables Tab:**
   - Click **"Variables"** tab trong backend service

2. **Check DATABASE_URL:**
   - Railway có thể đã tự động inject `DATABASE_URL`
   - Nếu có, verify nó không empty
   - Nếu không có hoặc empty, thêm thủ công:

3. **Add DATABASE_URL (nếu cần):**
   - Click **"New Variable"**
   - **Name:** `DATABASE_URL`
   - **Value:** `${{Postgres.DATABASE_URL}}`
     - **Lưu ý:** Thay `Postgres` bằng tên PostgreSQL service của bạn
     - Nếu service tên "PostgreSQL" → `${{PostgreSQL.DATABASE_URL}}`
   - Click **"Add"**

4. **Add Other Variables:**
   ```env
   JWT_SECRET=your-production-secret-change-this-min-32-chars
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

5. **Verify DATABASE_URL:**
   - Click vào biến `DATABASE_URL`
   - Phải hiển thị connection string (không empty)
   - Format: `postgresql://postgres:password@host:port/railway`

### Bước 5: Deploy

1. **Railway sẽ tự động deploy:**
   - Sau khi save settings, Railway tự động trigger deployment
   - Hoặc click **"Deploy"** button nếu có

2. **Monitor Deployment:**
   - Vào **"Deployments"** tab
   - Xem logs để theo dõi quá trình
   - Đợi deployment hoàn tất (2-5 phút)

3. **Check Logs:**
   - Vào **"Logs"** tab
   - Tìm các messages:
     ```
     ✅ All required environment variables are set!
     ✅ Database connection successful!
     ✔ Generated Prisma Client
     🔄 Running database migrations...
     🌱 Seeding database...
     ✨ Starting server...
     ```

### Bước 6: Verify Deployment

1. **Get Backend URL:**
   - Vào **Settings** tab → **"Domains"** section
   - Copy URL (ví dụ: `https://agribank-backend-production.up.railway.app`)

2. **Test Health Endpoint:**
   - Mở browser: `https://your-backend-url.railway.app/health`
   - Phải thấy: `{"status":"healthy","database":"connected"}`

3. **Test API:**
   - Thử login endpoint: `POST https://your-backend-url.railway.app/api/auth/login`
   - Body: `{"username":"admin_org001","password":"admin123"}`

---

## 🔧 Troubleshooting

### Vấn đề 1: DATABASE_URL Empty

**Lỗi:** `DATABASE_URL: SET BUT EMPTY`

**Giải pháp:**
1. Check PostgreSQL service name
2. Update DATABASE_URL: `${{ServiceName.DATABASE_URL}}`
3. Verify service connection
4. Xem chi tiết: `RAILWAY_DATABASE_URL_FIX.md`

### Vấn đề 2: Can't Reach Database

**Lỗi:** `P1001: Can't reach database server`

**Giải pháp:**
1. Đợi PostgreSQL status "Active"
2. Redeploy backend service
3. Script `wait-for-db.js` sẽ tự động retry
4. Check PostgreSQL service logs

### Vấn đề 3: Build Fails

**Lỗi:** TypeScript errors hoặc missing dependencies

**Giải pháp:**
1. Check Root Directory = `backend`
2. Verify Build Command: `npm install && npm run build`
3. Check logs để xem lỗi cụ thể

---

## 💰 Railway Pricing

### Free Tier:
- ✅ $5 credit mỗi tháng
- ✅ 512MB database
- ✅ Unlimited deployments
- ✅ Auto HTTPS

### Paid Plans:
- **Hobby:** $5/month + usage
- **Pro:** $20/month + usage
- **Team:** Custom pricing

**Lưu ý:** Free tier đủ cho development và testing. Production có thể cần upgrade.

---

## 🔄 So Sánh: Railway vs Supabase

### Khi nào dùng Railway PostgreSQL:
- ✅ Muốn setup nhanh, đơn giản
- ✅ Muốn tất cả trong 1 platform
- ✅ Không cần dashboard phức tạp
- ✅ OK với manual backup

### Khi nào dùng Supabase:
- ✅ Cần dashboard mạnh để query data
- ✅ Cần automatic backups
- ✅ Cần connection pooling tốt hơn
- ✅ Muốn free tier lớn hơn (500MB vs 512MB)

---

## 📊 Database Management

### Access Database:

1. **Via Railway Dashboard:**
   - Click PostgreSQL service → **"Data"** tab
   - Xem tables và data (basic view)

2. **Via Prisma Studio:**
   ```bash
   # Local
   cd backend
   export DATABASE_URL="your-railway-database-url"
   npx prisma studio
   ```

3. **Via psql:**
   ```bash
   # Get connection string from Railway
   psql "postgresql://postgres:password@host:port/railway"
   ```

### Backup Database:

1. **Manual Backup:**
   ```bash
   pg_dump "postgresql://postgres:password@host:port/railway" > backup.sql
   ```

2. **Restore:**
   ```bash
   psql "postgresql://postgres:password@host:port/railway" < backup.sql
   ```

---

## ✅ Checklist

- [ ] Railway project created
- [ ] PostgreSQL service added and "Active"
- [ ] Backend service configured (Root Directory = `backend`)
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm run start:prod`
- [ ] DATABASE_URL set correctly (not empty)
- [ ] Other environment variables set (JWT_SECRET, PORT, etc.)
- [ ] Deployment successful
- [ ] Health endpoint working (`/health`)
- [ ] Database migrations ran successfully
- [ ] Database seeded
- [ ] API endpoints working
- [ ] Backend URL copied for frontend

---

## 🚀 Next Steps

Sau khi backend deploy thành công:

1. **Deploy Frontend:**
   - Deploy lên Vercel (khuyến nghị)
   - Set `VITE_API_URL=https://your-backend-url.railway.app/api`

2. **Update CORS:**
   - Backend đã có CORS config
   - Update `FRONTEND_URL` trong backend environment variables

3. **Test Full Stack:**
   - Login từ frontend
   - Test các features
   - Monitor logs

---

## 📚 Resources

- **Railway Docs:** https://docs.railway.app
- **Railway PostgreSQL:** https://docs.railway.app/databases/postgresql
- **Prisma + Railway:** https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway

---

## 💡 Tips

1. **Monitor Usage:**
   - Check Railway dashboard → Usage tab
   - Track database size và bandwidth

2. **Set Alerts:**
   - Railway có email alerts khi gần hết credit
   - Enable trong Settings

3. **Optimize Costs:**
   - Dùng connection pooling
   - Monitor database size
   - Clean up old data nếu cần

4. **Backup Regularly:**
   - Schedule manual backups
   - Hoặc dùng Railway's backup feature (nếu có)

---

**Last Updated:** 2026-01-14
