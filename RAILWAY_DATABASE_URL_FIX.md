# 🔧 Hướng Dẫn Sửa Lỗi DATABASE_URL Empty trên Railway

## ❌ Lỗi Hiện Tại

```
⚠️  DATABASE_URL: SET BUT EMPTY
❌ Environment variable validation failed!
Empty variables:
  - DATABASE_URL
```

## ✅ Giải Pháp Từng Bước

### Bước 1: Xác Định Tên PostgreSQL Service

1. Vào **Railway Dashboard** → Chọn project của bạn
2. Tìm service có icon **PostgreSQL** (màu xanh lá)
3. **Click vào service đó** (KHÔNG phải backend service)
4. Vào tab **"Settings"**
5. Tìm phần **"Name"** hoặc **"Service Name"**
6. **Ghi lại tên chính xác** (ví dụ: `Postgres`, `PostgreSQL`, `postgres`, `postgresql`)

**Lưu ý:** Tên có thể phân biệt chữ hoa/thường!

---

### Bước 2: Lấy DATABASE_URL từ PostgreSQL Service

1. **Vẫn ở trong PostgreSQL service** (không phải backend)
2. Vào tab **"Variables"**
3. Tìm biến **`DATABASE_URL`**
4. Click vào biến đó hoặc click **"Reveal"** để xem giá trị
5. **Copy toàn bộ connection string** (sẽ có dạng: `postgresql://user:password@host:port/database`)

**Lưu ý:** Đây là connection string thực tế, bạn sẽ dùng nó ở bước sau.

---

### Bước 3: Set DATABASE_URL trong Backend Service

Có **2 cách** để set DATABASE_URL:

#### **Cách A: Dùng Service Reference (Khuyến nghị)**

1. **Quay lại project dashboard**
2. **Click vào BACKEND service** (service Node.js của bạn, KHÔNG phải PostgreSQL)
3. Vào tab **"Variables"**
4. Tìm hoặc tạo biến **`DATABASE_URL`**
5. Set giá trị theo format:
   ```
   ${{ServiceName.DATABASE_URL}}
   ```
   
   **Thay `ServiceName` bằng tên bạn đã ghi ở Bước 1:**
   - Nếu PostgreSQL service tên là `Postgres` → `${{Postgres.DATABASE_URL}}`
   - Nếu tên là `PostgreSQL` → `${{PostgreSQL.DATABASE_URL}}`
   - Nếu tên là `postgres` → `${{postgres.DATABASE_URL}}`
   - **Phải khớp chính xác!**

6. Click **"Save"** hoặc **"Add"**

#### **Cách B: Dùng Connection String Trực Tiếp (Nếu Cách A không hoạt động)**

1. **Vẫn ở trong BACKEND service** → tab **"Variables"**
2. Tìm hoặc tạo biến **`DATABASE_URL`**
3. **Paste connection string** bạn đã copy ở Bước 2
4. Click **"Save"**

**Lưu ý:** Cách này sẽ hoạt động ngay cả khi service reference không work.

---

### Bước 4: Verify DATABASE_URL

1. **Vẫn ở trong BACKEND service** → tab **"Variables"**
2. Click vào biến **`DATABASE_URL`** bạn vừa set
3. Railway sẽ hiển thị giá trị đã resolve

**Kiểm tra:**
- ✅ **Đúng:** Hiển thị connection string (bắt đầu với `postgresql://...`)
- ❌ **Sai:** Hiển thị empty hoặc vẫn là `${{...}}` (nghĩa là reference syntax sai)

**Nếu vẫn empty:**
- Kiểm tra lại tên service ở Bước 1
- Thử Cách B (dùng connection string trực tiếp)
- Đảm bảo PostgreSQL service đã deploy xong và status là "Active"

---

### Bước 5: Redeploy Backend Service

1. Vào **BACKEND service** → tab **"Deployments"**
2. Click **"Redeploy"** hoặc **"Deploy"**
3. Đợi deployment hoàn tất
4. Check logs để xem script `check-env.js` có pass không

**Kết quả mong đợi:**
```
🔍 Checking environment variables...

✅ DATABASE_URL: postgresql://****@****:5432/****...
✅ JWT_SECRET: **********...
✅ PORT: 3001
✅ NODE_ENV: production

✅ All required environment variables are set!
```

---

## 🚨 Troubleshooting

### Vấn đề 1: DATABASE_URL vẫn empty sau khi set

**Nguyên nhân có thể:**
- Service reference syntax sai
- PostgreSQL service chưa deploy xong
- Tên service không khớp

**Giải pháp:**
1. Dùng **Cách B** (connection string trực tiếp) thay vì service reference
2. Đảm bảo PostgreSQL service status là "Active"
3. Kiểm tra lại tên service (case-sensitive!)

### Vấn đề 2: Không thấy PostgreSQL service

**Giải pháp:**
1. Vào project dashboard
2. Click **"+ New"**
3. Chọn **"Database"** → **"PostgreSQL"**
4. Đợi service deploy xong (status "Active")
5. Làm lại từ Bước 1

### Vấn đề 3: Service reference không resolve

**Giải pháp:**
- Dùng **Cách B** (connection string trực tiếp)
- Hoặc kiểm tra lại syntax: `${{ServiceName.DATABASE_URL}}` (2 dấu ngoặc nhọn mỗi bên)
- Đảm bảo không có khoảng trắng thừa

---

## 📝 Checklist

Trước khi redeploy, đảm bảo:

- [ ] PostgreSQL service đã deploy và status "Active"
- [ ] Đã xác định đúng tên PostgreSQL service
- [ ] Đã set DATABASE_URL trong BACKEND service (không phải PostgreSQL service)
- [ ] DATABASE_URL hiển thị connection string khi click vào (không empty)
- [ ] Các biến khác (JWT_SECRET, PORT, NODE_ENV) đã được set
- [ ] Root Directory đã set thành `backend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm run start:prod`

---

## 💡 Tips

1. **Luôn check DATABASE_URL trong BACKEND service**, không phải PostgreSQL service
2. **Service reference** (`${{...}}`) là cách tốt nhất vì tự động update khi database thay đổi
3. **Connection string trực tiếp** là fallback tốt nếu reference không work
4. **Đợi PostgreSQL deploy xong** trước khi deploy backend
5. **Check logs** sau mỗi deployment để xem script validation

---

## 🆘 Vẫn Không Work?

Nếu sau khi làm tất cả các bước trên mà vẫn lỗi:

1. **Check Railway logs** để xem chi tiết lỗi
2. **Verify PostgreSQL service** đang chạy và accessible
3. **Thử tạo PostgreSQL service mới** và connect lại
4. **Check Railway documentation** về service references: https://docs.railway.app/develop/variables#referencing-other-services
