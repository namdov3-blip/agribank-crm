# 🚀 Hướng Dẫn Deploy Backend với Supabase Database

## 📌 Tổng Quan

**Supabase** là một **database service** (PostgreSQL), không phải hosting platform cho Node.js backend. 

**Kiến trúc đề xuất:**
- ✅ **Database:** Supabase (PostgreSQL)
- ✅ **Backend API:** Railway / Render / Vercel / Fly.io
- ✅ **Frontend:** Vercel / Netlify

---

## 🎯 Option 1: Supabase Database + Railway/Render Backend (Khuyến nghị)

### Bước 1: Tạo Supabase Project

1. **Đăng ký/Đăng nhập Supabase:**
   - Truy cập: https://supabase.com
   - Đăng nhập bằng GitHub account

2. **Tạo Project mới:**
   - Click **"New Project"**
   - Điền thông tin:
     - **Name:** `agribank-crm` (hoặc tên bạn muốn)
     - **Database Password:** Tạo password mạnh (lưu lại!)
     - **Region:** Chọn gần nhất (Singapore, Tokyo, etc.)
   - Click **"Create new project"**
   - Đợi 2-3 phút để project được tạo

### Bước 2: Lấy Database Connection String

1. **Vào Supabase Dashboard:**
   - Click vào project vừa tạo

2. **Lấy Connection String:**
   - Vào **Settings** (icon bánh răng) → **Database**
   - Scroll xuống phần **"Connection string"**
   - Chọn tab **"URI"**
   - Copy connection string (có dạng: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`)

3. **Hoặc lấy từng phần:**
   - **Host:** `db.xxx.supabase.co`
   - **Port:** `5432`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** Password bạn đã tạo

4. **Tạo Connection String đầy đủ:**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
   ```
   
   **Lưu ý:** Thêm `?pgbouncer=true&connection_limit=1` để tối ưu cho serverless environments

### Bước 3: Deploy Backend lên Railway/Render

#### **Option A: Railway (Khuyến nghị)**

1. **Tạo Railway Project:**
   - Vào https://railway.app
   - Tạo project mới từ GitHub repo

2. **Configure Environment Variables:**
   - Vào Backend Service → **Variables** tab
   - Thêm các biến:
     ```env
     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
     JWT_SECRET=your-production-secret-change-this-min-32-chars
     PORT=3001
     NODE_ENV=production
     FRONTEND_URL=https://your-frontend.vercel.app
     ```
   - **Lưu ý:** Thay `[YOUR-PASSWORD]` bằng password thực tế từ Supabase

3. **Configure Build & Start:**
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`

4. **Deploy:**
   - Railway sẽ tự động deploy
   - Check logs để đảm bảo migrations chạy thành công

#### **Option B: Render**

1. **Tạo Render Service:**
   - Vào https://render.com
   - Click **"New +"** → **"Web Service"**
   - Connect GitHub repo

2. **Configure Service:**
   - **Name:** `agribank-crm-backend`
   - **Environment:** `Node`
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm run start:prod`
   - **Root Directory:** `backend` (nếu có option này)

3. **Add Environment Variables:**
   - Click **"Environment"** tab
   - Add các biến giống như Railway ở trên

4. **Deploy:**
   - Click **"Create Web Service"**
   - Đợi deployment hoàn tất

---

## 🎯 Option 2: Supabase Database + Vercel Backend (Serverless)

### Bước 1-2: Giống như Option 1

### Bước 3: Deploy Backend lên Vercel

1. **Tạo Vercel Project:**
   - Vào https://vercel.com
   - Import GitHub repo

2. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Output Directory:** `dist`

3. **Add Environment Variables:**
   - Vào **Settings** → **Environment Variables**
   - Add các biến:
     ```env
     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
     JWT_SECRET=your-production-secret
     PORT=3001
     NODE_ENV=production
     FRONTEND_URL=https://your-frontend.vercel.app
     ```

4. **Create API Route (nếu cần):**
   - Vercel yêu cầu serverless functions
   - Có thể cần điều chỉnh code để tương thích với Vercel serverless

**Lưu ý:** Vercel serverless có thể cần điều chỉnh code để tương thích.

---

## 🔧 Cấu Hình Supabase Database

### Bước 1: Chạy Migrations

Sau khi có connection string, chạy migrations:

```bash
cd backend

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

### Bước 2: Verify Connection

```bash
# Test connection
npx prisma studio
# Hoặc
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"
```

### Bước 3: Supabase Dashboard

1. **Vào Supabase Dashboard:**
   - Click vào project
   - Vào **Table Editor** để xem tables
   - Vào **SQL Editor** để chạy queries

2. **Security Settings:**
   - Vào **Settings** → **Database**
   - Check **"Connection pooling"** settings
   - Supabase tự động enable connection pooling

---

## ⚙️ Tối Ưu Cho Supabase

### 1. Connection Pooling

Supabase có 2 loại connection:
- **Direct connection:** Port 5432 (cho migrations, admin tools)
- **Pooled connection:** Port 6543 (cho application, tối ưu hơn)

**Khuyến nghị:**
- **Migrations:** Dùng port 5432
- **Application:** Dùng port 6543 với connection pooling

**Connection String cho Application:**
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Connection String cho Migrations:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 2. Environment Variables Setup

Tạo 2 biến môi trường:

```env
# For migrations (direct connection)
DATABASE_URL_MIGRATE=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres

# For application (pooled connection)
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Cập nhật `package.json`:
```json
{
  "scripts": {
    "prisma:migrate:deploy": "DATABASE_URL=$DATABASE_URL_MIGRATE npx prisma migrate deploy",
    "start:prod": "node scripts/check-env.js && node scripts/wait-for-db.js && npx prisma generate && DATABASE_URL=$DATABASE_URL_MIGRATE npx prisma migrate deploy && npx prisma db seed && node dist/index.js"
  }
}
```

---

## 🔒 Security Best Practices

### 1. Database Password

- ✅ Dùng password mạnh (min 20 ký tự)
- ✅ Lưu trong environment variables, không commit vào code
- ✅ Rotate password định kỳ

### 2. Row Level Security (RLS)

Supabase có RLS built-in, nhưng với Prisma bạn cần handle ở application level (đã có trong code với `getOrganizationFilter`).

### 3. Connection Security

- ✅ Luôn dùng SSL connection (Supabase tự động enable)
- ✅ Dùng connection pooling cho production
- ✅ Set `connection_limit=1` cho serverless environments

---

## 📊 So Sánh Supabase vs Railway PostgreSQL

| Feature | Supabase | Railway PostgreSQL |
|---------|----------|-------------------|
| **Free Tier** | ✅ 500MB database, 2GB bandwidth | ✅ 512MB database |
| **Connection Pooling** | ✅ Built-in | ❌ Manual setup |
| **Dashboard** | ✅ Full-featured | ⚠️ Basic |
| **Auto-scaling** | ✅ | ⚠️ Manual |
| **Backup** | ✅ Automatic | ⚠️ Manual |
| **Real-time** | ✅ Built-in | ❌ |
| **Auth** | ✅ Built-in | ❌ |
| **Storage** | ✅ Built-in | ❌ |
| **Setup Complexity** | ⚠️ Medium | ✅ Easy |

---

## 🚨 Troubleshooting

### Lỗi: Connection Timeout

**Nguyên nhân:** Supabase có connection limits

**Giải pháp:**
- Dùng connection pooling (port 6543)
- Set `connection_limit=1` trong connection string
- Check Supabase dashboard → Settings → Database → Connection limits

### Lỗi: Too Many Connections

**Nguyên nhân:** Vượt quá connection limit

**Giải pháp:**
- Dùng connection pooling
- Check connection pooling settings trong Supabase
- Upgrade plan nếu cần

### Lỗi: SSL Required

**Nguyên nhân:** Supabase yêu cầu SSL

**Giải pháp:**
- Thêm `?sslmode=require` vào connection string
- Hoặc Supabase tự động handle SSL

---

## ✅ Checklist

- [ ] Tạo Supabase project
- [ ] Lấy connection string
- [ ] Test connection local
- [ ] Chạy migrations thành công
- [ ] Seed database
- [ ] Deploy backend lên Railway/Render
- [ ] Set environment variables
- [ ] Verify backend hoạt động
- [ ] Test API endpoints
- [ ] Monitor Supabase dashboard

---

## 📚 Resources

- **Supabase Docs:** https://supabase.com/docs
- **Prisma + Supabase:** https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-supabase
- **Connection Pooling:** https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler

---

## 💡 Tips

1. **Dùng Supabase Dashboard** để monitor database usage
2. **Enable connection pooling** cho production
3. **Backup database** định kỳ (Supabase tự động backup)
4. **Monitor connection limits** trong free tier
5. **Dùng Supabase Studio** để query và manage data

---

**Last Updated:** 2026-01-14
