# 🏦 Agribank CRM Backend API

Backend API server cho hệ thống quản lý giải ngân bồi thường đất đai của Agribank.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#️-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#️-database-schema)
- [Testing](#-testing)
- [Deploy](#-deploy)
- [Troubleshooting](#-troubleshooting)

## ✨ Tính năng

- ✅ **Multi-tenancy**: 5 tổ chức độc lập, dữ liệu hoàn toàn tách biệt
- ✅ **Authentication**: JWT-based với bcrypt password hashing
- ✅ **Excel Upload**: Parse real Excel files và import dữ liệu
- ✅ **Interest Calculation**: Tính lãi kép hàng ngày chính xác
- ✅ **Auto Capitalization**: Tự động nhập lãi hàng tháng
- ✅ **Bank Balance Tracking**: Theo dõi số dư, running balance
- ✅ **Audit Logging**: Ghi nhận tất cả hành động trong hệ thống
- ✅ **Role-based Access Control**: Admin, User1, User2, PMB
- ✅ **Transaction Workflow**: PENDING → DISBURSED → HOLD
- ✅ **Supplementary Amount**: Bổ sung/giảm tiền cho hồ sơ

## 🛠 Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Runtime** | Node.js | 20+ |
| **Framework** | Express.js | 4.19+ |
| **Language** | TypeScript | 5.8+ |
| **Database** | PostgreSQL | 16+ |
| **ORM** | Prisma | 5.22+ |
| **Authentication** | JWT + bcrypt | - |
| **Validation** | Zod | 3.23+ |
| **Excel Parsing** | xlsx | 0.18+ |
| **File Upload** | Multer | 1.4+ |
| **Cron Jobs** | node-cron | 3.0+ |

## 📦 Cài đặt

### Bước 1: Clone Repository

```bash
cd E:\Final-main\backend
```

### Bước 2: Cài đặt Dependencies

```bash
npm install
```

### Bước 3: Cài đặt PostgreSQL

1. Tải và cài PostgreSQL 16: https://www.postgresql.org/download/windows/
2. Trong quá trình cài đặt, ghi nhớ password cho user `postgres`
3. Mở pgAdmin hoặc command line và tạo database:

```sql
CREATE DATABASE agribank_crm;
```

### Bước 4: Cấu hình Environment Variables

Copy file `.env.example` thành `.env`:

```bash
copy .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/agribank_crm?schema=public"

# JWT Secret (IMPORTANT: Change this!)
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"

# Server
PORT=3001
NODE_ENV=development

# CORS (Frontend URL)
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Interest Rate (Default)
DEFAULT_INTEREST_RATE=6.5
```

**⚠️ QUAN TRỌNG**: Thay `YOUR_PASSWORD` bằng password PostgreSQL của bạn!

### Bước 5: Chạy Prisma Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create database tables
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### Bước 6: Seed Database với Dữ liệu Ban đầu

```bash
npm run prisma:seed
```

Lệnh này sẽ tạo:
- 5 tổ chức (ORG001 - ORG005)
- 20 users (4 users mỗi tổ chức: Admin, User1, User2, PMB)
- 5 bank accounts
- Default interest rate settings (6.5%)

**Login Credentials:**

| Tổ chức | Username | Password | Role |
|---------|----------|----------|------|
| Agribank HN | `admin_org001` | `admin123` | Admin |
| Agribank Đông Anh | `admin_org002` | `admin123` | Admin |
| UBND Xã Tàm Xá | `admin_org003` | `admin123` | Admin |
| Phúc Thịnh | `admin_org004` | `admin123` | Admin |
| BQL KĐT Vĩnh Ngọc | `admin_org005` | `admin123` | Admin |

## ⚙️ Cấu hình

### TypeScript Configuration

File `tsconfig.json` đã được cấu hình sẵn với:
- Target: ES2022
- Strict mode enabled
- Source maps enabled
- Output directory: `./dist`

### Prisma Configuration

Schema location: `prisma/schema.prisma`

**Multi-tenancy Implementation:**
- Mọi model đều có field `organizationId`
- JWT token chứa `organizationId` của user
- Middleware tự động filter queries theo organization

## 🚀 Chạy ứng dụng

### Development Mode (Hot Reload)

```bash
npm run dev
```

Server sẽ chạy tại: http://localhost:3001

### Production Build

```bash
# Build TypeScript to JavaScript
npm run build

# Run production server
npm start
```

### Health Check

Kiểm tra server đang chạy:

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "database": "connected"
}
```

## 📚 API Endpoints

### Base URL

```
http://localhost:3001/api
```

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login với username/password | ❌ |
| POST | `/auth/logout` | Logout (audit log) | ✅ |
| GET | `/auth/me` | Get current user info | ✅ |

**Example: Login**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_org001",
    "password": "admin123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "username": "admin_org001",
    "fullName": "Quản trị viên Agribank Chi nhánh Hà Nội",
    "role": "Admin",
    "permissions": ["dashboard", "projects", "transactions", "balance", "reports", "admin"],
    "organization": {
      "id": "uuid-here",
      "name": "Agribank Chi nhánh Hà Nội",
      "code": "ORG001"
    }
  }
}
```

### Projects

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/projects` | List all projects | ✅ |
| POST | `/projects` | Create new project | ✅ |
| GET | `/projects/:id` | Get single project | ✅ |
| PUT | `/projects/:id` | Update project | ✅ |
| DELETE | `/projects/:id` | Delete project | ✅ |

### Transactions

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/transactions` | List transactions (with filters) | ✅ |
| GET | `/transactions/:id` | Get single transaction | ✅ |
| PUT | `/transactions/:id` | Update transaction details | ✅ |
| PATCH | `/transactions/:id/status` | Change status (PENDING → DISBURSED) | ✅ |
| POST | `/transactions/:id/refund` | Refund transaction (DISBURSED → HOLD) | ✅ |
| POST | `/transactions/:id/supplementary` | Add supplementary amount | ✅ |

### Upload

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload/excel` | Upload & parse Excel file | ✅ |
| POST | `/upload/confirm` | Confirm and save imported data | ✅ |

**Example: Upload Excel**

```bash
curl -X POST http://localhost:3001/api/upload/excel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/project-data.xlsx"
```

### Bank

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/bank/account` | Get bank account info | ✅ |
| GET | `/bank/transactions` | Get transaction history | ✅ |
| POST | `/bank/transactions` | Create manual transaction | ✅ |
| PATCH | `/bank/account/opening-balance` | Adjust opening balance | ✅ |

### Users (Admin Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | List all users | ✅ Admin |
| POST | `/users` | Create new user | ✅ Admin |
| PUT | `/users/:id` | Update user | ✅ Admin |
| DELETE | `/users/:id` | Delete user | ✅ Admin |

### Admin (Admin Only)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/audit-logs` | Get audit logs | ✅ Admin |
| GET | `/admin/interest-rate` | Get current interest rate | ✅ Admin |
| PUT | `/admin/interest-rate` | Update interest rate | ✅ Admin |
| GET | `/admin/interest-history` | Get rate change history | ✅ Admin |
| GET | `/admin/stats` | Get system statistics | ✅ Admin |

## 🗄️ Database Schema

### Organizations
- `id` (UUID, PK)
- `name`, `code` (unique), `email`, `phone`, `address`
- `isActive`, `createdAt`, `updatedAt`

### Users
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `username` (unique), `passwordHash`, `fullName`, `email`
- `role` (Admin/User1/User2/PMB)
- `permissions` (JSON array)
- `isActive`, `lastLogin`, `createdAt`, `updatedAt`

### Projects
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `code`, `name`, `location`, `totalBudget`
- `startDate`, `uploadDate`, `interestStartDate`
- `status` (Active/Completed/Planning)
- `createdById` (FK → users)

### Households
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `householdId` (mã hộ dân), `name`, `cccd`, `address`
- `landOrigin`, `landArea`, `decisionNumber`, `decisionDate`

### Transactions
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `projectId` (FK → projects), `householdId` (FK → households)
- Compensation: `landAmount`, `assetAmount`, `houseAmount`, `supportAmount`, `totalApproved`
- `supplementaryAmount`, `supplementaryNote`
- `status` (PENDING/DISBURSED/HOLD)
- `disbursementDate`, `effectiveInterestDate`

### BankAccounts
- `id` (UUID, PK)
- `organizationId` (FK → organizations, unique)
- `bankName`, `accountNumber`
- `openingBalance`, `currentBalance`, `reconciledBalance`

### BankTransactions
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `bankAccountId` (FK → bank_accounts)
- `type` (DEPOSIT/WITHDRAW/ADJUSTMENT)
- `amount`, `note`, `runningBalance`, `transactionDate`

### AuditLogs
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `userId` (FK → users)
- `actorName`, `actorRole`, `action`, `target`, `details`
- `ipAddress`, `userAgent`, `timestamp`

### InterestSettings
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `annualRate`, `effectiveFrom`, `note`
- `createdById` (FK → users)

### TransactionHistory
- `id` (UUID, PK)
- `transactionId` (FK → transactions)
- `action`, `actorName`, `actorRole`, `details`, `totalAmount`
- `timestamp`

### UploadedFiles
- `id` (UUID, PK)
- `organizationId` (FK → organizations)
- `projectId` (FK → projects)
- `originalFilename`, `storedFilename`, `fileSize`, `mimeType`
- `uploadPath`, `uploadedById` (FK → users)

## 🧪 Testing

### Manual Testing với cURL

**1. Login**
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_org001","password":"admin123"}' | jq -r '.token')

echo "Token: $TOKEN"
```

**2. Get Projects**
```bash
curl -X GET http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN"
```

**3. Create Project**
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "DA-2025-001",
    "name": "Dự án test",
    "location": "Hà Nội",
    "totalBudget": 1000000000,
    "interestStartDate": "2025-01-01"
  }'
```

### Testing với Postman

1. Import collection từ `docs/postman-collection.json` (nếu có)
2. Set environment variable `BASE_URL` = `http://localhost:3001`
3. Login và copy token vào environment variable `JWT_TOKEN`
4. Test các endpoints

## 🚀 Deploy

### Option 1: Railway (Recommended)

1. **Tạo account Railway**: https://railway.app/

2. **Deploy PostgreSQL**:
   ```bash
   # Trong Railway dashboard:
   # New Project → Deploy PostgreSQL
   # Copy DATABASE_URL từ Variables tab
   ```

3. **Deploy Backend**:
   ```bash
   # Push code lên GitHub
   git init
   git add .
   git commit -m "Initial backend commit"
   git remote add origin https://github.com/YOUR_USERNAME/agribank-backend.git
   git push -u origin main

   # Trong Railway dashboard:
   # New → GitHub Repo → Select agribank-backend
   # Settings → Variables → Add:
   DATABASE_URL=postgresql://... (from PostgreSQL service)
   JWT_SECRET=your-secret-key-here
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app

   # Settings → Deploy Command:
   npm run build && npx prisma migrate deploy && npm start
   ```

4. **Run Migrations & Seed**:
   ```bash
   # Trong Railway terminal hoặc local:
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   DATABASE_URL="postgresql://..." npx prisma db seed
   ```

5. **Lấy URL backend**: Copy từ Railway dashboard
   ```
   https://agribank-backend-production.up.railway.app
   ```

### Option 2: Render

Tương tự Railway, nhưng có cold start (free tier sleep sau 15 phút)

### Option 3: VPS (Advanced)

Cần biết Linux, Nginx, PM2. Xem docs riêng.

## 🐛 Troubleshooting

### Lỗi: "Database connection failed"

**Solution:**
```bash
# Kiểm tra PostgreSQL đang chạy
# Windows: Services → PostgreSQL
# hoặc
pg_ctl status

# Kiểm tra DATABASE_URL trong .env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Lỗi: "Prisma Client not found"

**Solution:**
```bash
npm run prisma:generate
```

### Lỗi: "Port 3001 already in use"

**Solution:**
```bash
# Windows: Tìm và kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Hoặc đổi PORT trong .env
PORT=3002
```

### Lỗi: "JWT token invalid"

**Solution:**
- Kiểm tra JWT_SECRET trong .env backend và frontend phải giống nhau
- Token có thể hết hạn (7 days), login lại

### Lỗi Excel Upload: "Only Excel files allowed"

**Solution:**
- File phải có extension `.xlsx` hoặc `.xls`
- MIME type phải đúng
- Kiểm tra MAX_FILE_SIZE trong .env (default 10MB)

### Lỗi: "Organization not found"

**Solution:**
```bash
# Re-seed database
npm run prisma:seed
```

## 📞 Support

- **Issues**: https://github.com/YOUR_USERNAME/agribank-backend/issues
- **Documentation**: Xem file này
- **Email**: your-email@example.com

## 📄 License

ISC

## 🙏 Acknowledgments

- Frontend: React 19 + TypeScript + Vite
- Backend: Node.js + Express + Prisma
- Database: PostgreSQL

---

**Made with ❤️ for Agribank CRM System**
