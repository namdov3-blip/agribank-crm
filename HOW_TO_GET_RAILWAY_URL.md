# 🔗 Cách Lấy Backend URL từ Railway

## 📍 Backend URL là gì?

Backend URL là địa chỉ để frontend và các client khác gọi API của bạn.

**Format:**
- **Base URL:** `https://your-service-name.up.railway.app`
- **API Base URL:** `https://your-service-name.up.railway.app/api`

**Ví dụ:**
- Base URL: `https://agribank-backend-production.up.railway.app`
- API URL: `https://agribank-backend-production.up.railway.app/api`
- Health Check: `https://agribank-backend-production.up.railway.app/health`
- Login Endpoint: `https://agribank-backend-production.up.railway.app/api/auth/login`

---

## 🎯 Cách Lấy URL - 3 Phương Pháp

### Cách 1: Từ Settings Tab (Khuyến nghị - Rõ ràng nhất)

1. **Vào Railway Dashboard:**
   - Truy cập: https://railway.app
   - Chọn project của bạn

2. **Click vào Backend Service:**
   - Tìm service có icon Node.js (không phải PostgreSQL)
   - Click vào service đó

3. **Vào Settings Tab:**
   - Click tab **"Settings"** ở trên cùng
   - Scroll xuống phần **"Networking"** hoặc **"Domains"**

4. **Generate/Tìm Domain:**
   - Nếu chưa có domain, bạn sẽ thấy button **"Generate Domain"**
   - Click **"Generate Domain"**
   - Railway sẽ tạo URL tự động
   - Copy URL (ví dụ: `https://agribank-backend-production.up.railway.app`)

5. **Copy URL:**
   - Click vào URL để copy
   - Hoặc click icon copy bên cạnh URL

**Screenshot mô tả:**
```
Settings Tab
├── General
├── Build & Deploy
├── Networking  ← Vào đây
│   └── Public Domain
│       └── https://your-service.up.railway.app  ← Copy cái này
└── ...
```

---

### Cách 2: Từ Service Overview (Nhanh nhất)

1. **Vào Railway Dashboard:**
   - Chọn project
   - Click vào backend service

2. **Xem Service Overview:**
   - Ở phần trên cùng của service page
   - Bạn sẽ thấy URL hiển thị ngay
   - Format: `https://[service-name].up.railway.app`

3. **Click để mở:**
   - Click vào URL hoặc button **"Open"** / **"Visit"**
   - Browser sẽ mở URL đó

**Lưu ý:** Nếu chưa thấy URL, có thể service chưa có public domain. Dùng Cách 1 để generate.

---

### Cách 3: Từ Deployments Tab

1. **Vào Deployments Tab:**
   - Click tab **"Deployments"** trong backend service

2. **Click vào Deployment mới nhất:**
   - Tìm deployment có status "Active" hoặc "Success"
   - Click vào deployment đó

3. **Xem URL:**
   - URL sẽ hiển thị trong deployment details
   - Copy URL từ đó

---

## 🔍 Nếu Không Thấy URL

### Trường hợp 1: Chưa Generate Domain

**Triệu chứng:** Không thấy URL ở đâu cả

**Giải pháp:**
1. Vào **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Đợi Railway tạo domain (vài giây)
4. URL sẽ xuất hiện

### Trường hợp 2: Service Chưa Deploy

**Triệu chứng:** Service status là "Deploying" hoặc "Failed"

**Giải pháp:**
1. Đợi deployment hoàn tất
2. Status phải là "Active"
3. Sau đó mới có URL

### Trường hợp 3: Service ở Private Mode

**Triệu chứng:** Không có option "Generate Domain"

**Giải pháp:**
1. Check service settings
2. Đảm bảo service không ở private mode
3. Railway free tier hỗ trợ public domain

---

## ✅ Verify URL Hoạt Động

Sau khi có URL, test ngay:

### 1. Test Health Endpoint

Mở browser và truy cập:
```
https://your-service-name.up.railway.app/health
```

**Kết quả mong đợi:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T...",
  "uptime": 123.45,
  "environment": "production",
  "database": "connected"
}
```

### 2. Test API Endpoint

Thử login endpoint:
```bash
curl -X POST https://your-service-name.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_org001","password":"admin123"}'
```

**Kết quả mong đợi:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {...}
}
```

---

## 🔧 Sử Dụng URL

### 1. Cho Frontend (.env)

Tạo file `.env` trong frontend:
```env
VITE_API_URL=https://your-service-name.up.railway.app/api
```

### 2. Cho Postman/Thunder Client

Base URL:
```
https://your-service-name.up.railway.app/api
```

### 3. Cho CORS Configuration

Trong backend environment variables:
```env
FRONTEND_URL=https://your-frontend.vercel.app
```

Backend sẽ tự động allow CORS từ frontend URL này.

---

## 📝 Custom Domain (Tùy chọn)

Nếu muốn dùng domain riêng:

1. **Vào Settings → Networking**
2. **Click "Custom Domain"**
3. **Add domain của bạn:**
   - Ví dụ: `api.yourdomain.com`
4. **Configure DNS:**
   - Add CNAME record trỏ tới Railway domain
5. **Verify domain**
6. **SSL tự động được cấp**

---

## 🚨 Troubleshooting

### URL không hoạt động

**Kiểm tra:**
1. Service status phải là "Active"
2. Deployment phải thành công
3. Check logs để xem có lỗi không
4. Verify health endpoint trả về OK

### CORS Error

**Nguyên nhân:** Frontend URL chưa được add vào CORS config

**Giải pháp:**
1. Vào backend service → Variables
2. Set `FRONTEND_URL=https://your-frontend-url`
3. Redeploy backend

### 404 Not Found

**Nguyên nhân:** Route không tồn tại hoặc base path sai

**Giải pháp:**
- API routes bắt đầu với `/api`
- Ví dụ: `/api/auth/login` (không phải `/auth/login`)

---

## 💡 Tips

1. **Lưu URL vào notes:** Copy và lưu URL để dùng sau
2. **Test ngay sau deploy:** Verify health endpoint
3. **Monitor logs:** Check Railway logs nếu có vấn đề
4. **Use environment variables:** Không hardcode URL trong code

---

## 📚 Quick Reference

**URL Format:**
```
https://[service-name].up.railway.app
```

**Common Endpoints:**
- Health: `/health`
- API Base: `/api`
- Login: `/api/auth/login`
- Projects: `/api/projects`
- Transactions: `/api/transactions`

**Example:**
```
Base: https://agribank-backend.up.railway.app
Health: https://agribank-backend.up.railway.app/health
API: https://agribank-backend.up.railway.app/api
Login: https://agribank-backend.up.railway.app/api/auth/login
```

---

**Last Updated:** 2026-01-14
