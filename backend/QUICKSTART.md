# ⚡ Quick Start Guide - Backend API

Hướng dẫn nhanh để chạy backend trong 5 phút.

## 🚀 Setup Nhanh (5 phút)

### Bước 1: Cài PostgreSQL (2 phút)

1. Download: https://www.postgresql.org/download/windows/
2. Cài đặt với password: `postgres` (để dễ nhớ)
3. Giữ nguyên cài đặt mặc định (Port 5432)

### Bước 2: Setup Database (1 phút)

Mở **pgAdmin** hoặc **Command Prompt**:

```bash
# Tạo database
psql -U postgres
CREATE DATABASE agribank_crm;
\q
```

### Bước 3: Setup Backend (2 phút)

```bash
# 1. Di chuyển vào folder backend
cd E:\Final-main\backend

# 2. Install dependencies
npm install

# 3. Tạo file .env
copy .env.example .env

# 4. Chỉnh sửa .env (Notepad)
# Thay YOUR_PASSWORD bằng password PostgreSQL của bạn:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agribank_crm?schema=public"

# 5. Chạy migrations
npm run prisma:migrate

# 6. Seed data (tạo 5 tổ chức + users)
npm run prisma:seed

# 7. Start server
npm run dev
```

## ✅ Kiểm Tra

Mở browser: http://localhost:3001/health

Nếu thấy `{"status":"healthy"}` → Thành công! 🎉

## 🔑 Login Credentials

Dùng để test frontend:

```
Username: admin_org001
Password: admin123
```

(Có 5 organizations: ORG001, ORG002, ORG003, ORG004, ORG005)

## 📡 API Endpoints

Base URL: `http://localhost:3001/api`

**Login:**
```bash
POST /api/auth/login
Body: {"username": "admin_org001", "password": "admin123"}
```

**Get Projects:**
```bash
GET /api/projects
Headers: Authorization: Bearer <token>
```

## 🐛 Lỗi Thường Gặp

### "Port 3001 already in use"

```bash
# Đổi PORT trong .env
PORT=3002
```

### "Database connection failed"

- Kiểm tra PostgreSQL đang chạy (Services → PostgreSQL)
- Kiểm tra password trong `.env` đúng chưa

### "Prisma Client not found"

```bash
npm run prisma:generate
```

## 📚 Next Steps

1. ✅ Backend chạy rồi → Test với Postman
2. ✅ Đọc `README.md` để hiểu rõ hơn
3. ✅ Integrate với Frontend React

---

**Need help?** Đọc `README.md` hoặc check console errors.
