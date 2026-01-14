# 🔧 Fix: Can't Reach Database Server on Railway

## ❌ Lỗi: "Can't reach database server at `postgres.railway.internal:5432`"

Script `wait-for-db.js` đang retry nhưng không kết nối được database.

---

## 🔍 Nguyên Nhân

1. **PostgreSQL service chưa deploy xong** - Status vẫn "Deploying"
2. **PostgreSQL service failed** - Status "Failed"
3. **Services chưa được connect** - Backend và PostgreSQL không trong cùng network
4. **DATABASE_URL sai** - Dùng internal hostname nhưng service chưa ready
5. **PostgreSQL service bị stop** - Service đã stop hoặc suspend

---

## ✅ Giải Pháp Từng Bước

### Bước 1: Check PostgreSQL Service Status

1. **Vào Railway Dashboard:**
   - Truy cập: https://railway.app
   - Chọn project của bạn

2. **Tìm PostgreSQL Service:**
   - Tìm service có icon PostgreSQL (màu xanh lá)
   - Click vào service đó

3. **Check Status:**
   - Ở phần trên cùng, xem status
   - Phải là **"Active"** (không phải "Deploying", "Failed", hoặc "Stopped")

4. **Nếu Status là "Deploying":**
   - ⏳ **Đợi 2-3 phút** để PostgreSQL deploy xong
   - Refresh page để check lại
   - Đợi cho đến khi status chuyển thành "Active"

5. **Nếu Status là "Failed":**
   - Xem logs để tìm lỗi
   - Có thể cần delete và tạo lại PostgreSQL service
   - Hoặc check Railway status page: https://status.railway.app

### Bước 2: Verify Service Connection

1. **Vào PostgreSQL Service:**
   - Click vào PostgreSQL service
   - Vào **Settings** tab

2. **Check Connected Services:**
   - Scroll xuống phần **"Connected Services"** hoặc **"Service Connections"**
   - Backend service phải được list ở đây
   - Nếu không có, Railway có thể chưa auto-connect

3. **Nếu Backend Service không được list:**
   - Vào Backend Service → Settings
   - Check DATABASE_URL variable
   - Verify service reference đúng
   - Redeploy backend service

### Bước 3: Check DATABASE_URL

1. **Vào Backend Service:**
   - Click vào backend service (Node.js service)
   - Vào **Variables** tab

2. **Check DATABASE_URL:**
   - Tìm biến `DATABASE_URL`
   - Click vào để xem giá trị

3. **Verify Value:**
   - Phải hiển thị connection string (không empty)
   - Format: `postgresql://postgres:password@postgres.railway.internal:5432/railway`
   - Hoặc: `postgresql://postgres:password@host:port/database`

4. **Nếu DATABASE_URL empty hoặc sai:**
   - Check PostgreSQL service name
   - Update: `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - Thay `Postgres` bằng tên service thực tế
   - Xem `RAILWAY_DATABASE_URL_FIX.md` để biết chi tiết

### Bước 4: Wait and Retry

1. **Đợi PostgreSQL Sẵn Sàng:**
   - Đảm bảo PostgreSQL status = "Active"
   - Đợi thêm 1-2 phút sau khi "Active" để đảm bảo hoàn toàn ready

2. **Stop Backend Service:**
   - Vào Backend Service → Settings
   - Click **"Stop"** hoặc **"Pause"** (nếu có)
   - Đợi service stop hoàn toàn

3. **Redeploy Backend:**
   - Click **"Deploy"** hoặc **"Redeploy"**
   - Hoặc push code mới lên GitHub (auto-deploy)
   - Script `wait-for-db.js` sẽ tự động retry

### Bước 5: Check PostgreSQL Logs

1. **Vào PostgreSQL Service:**
   - Click vào PostgreSQL service
   - Vào **Logs** tab

2. **Xem Logs:**
   - Tìm các messages về connection
   - Check có lỗi gì không
   - Verify PostgreSQL đang listen trên port 5432

3. **Common PostgreSQL Errors:**
   - "Database initialization failed"
   - "Port already in use"
   - "Out of memory"
   - "Disk full"

---

## 🚨 Quick Fixes

### Fix 1: PostgreSQL Chưa Deploy Xong

**Triệu chứng:** Status = "Deploying"

**Giải pháp:**
1. ⏳ **Đợi 2-5 phút** để PostgreSQL deploy xong
2. Refresh page để check status
3. Đợi status = "Active"
4. Sau đó redeploy backend

### Fix 2: Services Chưa Connect

**Triệu chứng:** Backend không trong PostgreSQL's connected services

**Giải pháp:**
1. Vào Backend Service → Variables
2. Verify DATABASE_URL: `${{Postgres.DATABASE_URL}}`
3. Replace `Postgres` với tên service thực tế
4. Save và redeploy

### Fix 3: PostgreSQL Failed

**Triệu chứng:** Status = "Failed"

**Giải pháp:**
1. Xem PostgreSQL logs để tìm lỗi
2. Có thể cần delete và tạo lại PostgreSQL service
3. Hoặc check Railway status page

### Fix 4: Internal Hostname Issue

**Triệu chứng:** `postgres.railway.internal` không resolve

**Giải pháp:**
1. Đảm bảo cả 2 services trong cùng project
2. Verify service reference syntax: `${{ServiceName.DATABASE_URL}}`
3. Try dùng direct connection string từ PostgreSQL service

---

## 📋 Step-by-Step Recovery

### Nếu PostgreSQL đang "Deploying":

1. ⏳ **Đợi** - Không làm gì cả, đợi 2-5 phút
2. 🔄 **Refresh** - Refresh Railway dashboard
3. ✅ **Verify** - Check status = "Active"
4. 🚀 **Redeploy Backend** - Sau khi PostgreSQL "Active"

### Nếu PostgreSQL "Active" nhưng vẫn lỗi:

1. 🔍 **Check Connection:**
   - PostgreSQL Settings → Connected Services
   - Verify backend service được list

2. 🔧 **Fix DATABASE_URL:**
   - Backend Variables → DATABASE_URL
   - Verify không empty
   - Update service reference nếu cần

3. 🛑 **Stop Backend:**
   - Stop backend service
   - Đợi 30 giây

4. 🚀 **Redeploy:**
   - Deploy lại backend
   - Script sẽ tự động retry

### Nếu vẫn fail sau 10 retries:

1. 📋 **Collect Info:**
   - PostgreSQL service status
   - PostgreSQL logs (last 50 lines)
   - Backend DATABASE_URL value (mask password)
   - Backend logs (wait-for-db.js section)

2. 🔄 **Try Manual Fix:**
   - Delete và tạo lại PostgreSQL service
   - Update DATABASE_URL với connection string mới
   - Redeploy backend

3. 📞 **Contact Support:**
   - Railway support: https://railway.app/help
   - Include collected info above

---

## ✅ Verification Checklist

Sau khi fix, verify:

- [ ] PostgreSQL service status = "Active"
- [ ] PostgreSQL logs không có errors
- [ ] Backend service trong PostgreSQL's connected services
- [ ] DATABASE_URL không empty
- [ ] DATABASE_URL có connection string hợp lệ
- [ ] Backend service redeployed
- [ ] Backend logs show "✅ Database connection successful!"

---

## 💡 Prevention Tips

1. **Deploy Order:**
   - Deploy PostgreSQL trước
   - Đợi PostgreSQL "Active"
   - Sau đó mới deploy backend

2. **Monitor Status:**
   - Check PostgreSQL status trước khi deploy backend
   - Đợi 1-2 phút sau "Active" để đảm bảo ready

3. **Use Service References:**
   - Dùng `${{ServiceName.DATABASE_URL}}` thay vì hardcode
   - Railway tự động update khi service thay đổi

4. **Check Logs Regularly:**
   - Monitor PostgreSQL logs
   - Monitor backend logs
   - Catch issues early

---

## 📚 Related Guides

- **DATABASE_URL Empty:** `RAILWAY_DATABASE_URL_FIX.md`
- **Application Failed:** `RAILWAY_APPLICATION_FAILED_TROUBLESHOOTING.md`
- **Full Deployment:** `RAILWAY_FULL_DEPLOYMENT.md`

---

**Last Updated:** 2026-01-14
