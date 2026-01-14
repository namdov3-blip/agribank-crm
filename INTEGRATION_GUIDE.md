# 🔗 Frontend-Backend Integration Guide

Hướng dẫn chi tiết integrate React Frontend với Node.js Backend.

## 📋 Checklist

- [ ] Backend đang chạy ở `http://localhost:3001`
- [ ] Database đã được seed với 5 organizations
- [ ] Frontend dependencies đã được cài (axios)
- [ ] File `.env` đã được tạo với `VITE_API_URL`
- [ ] File `src/services/api.ts` đã được tạo

## 🔄 Thay đổi chính trong App.tsx

### ❌ Trước (LocalStorage):
```typescript
const [transactions, setTransactions] = useState<Transaction[]>(() =>
  JSON.parse(localStorage.getItem(DB_KEYS.TRANSACTIONS) || '[]'));
```

### ✅ Sau (API):
```typescript
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (currentUser) {
    loadTransactions();
  }
}, [currentUser]);

const loadTransactions = async () => {
  try {
    const data = await api.transactions.getAll();
    setTransactions(data);
  } catch (error) {
    console.error('Failed to load transactions:', error);
  } finally {
    setLoading(false);
  }
};
```

## 🚀 Step-by-Step Integration

### Step 1: Update App.tsx - Authentication

**Vị trí:** Line 82-95 (handleLogin function)

**❌ Cũ:**
```typescript
const handleLogin = (user: User) => {
  setCurrentUser(user);
  // Log audit
  setAuditLogs(prev => [...prev, { /* audit log */ }]);
};
```

**✅ Mới:**
```typescript
const handleLogin = async (username: string, password: string) => {
  try {
    const { token, user } = await api.auth.login(username, password);
    setCurrentUser(user);
    setActiveTab('dashboard');
    return true;
  } catch (error: any) {
    console.error('Login failed:', error);
    alert(error.response?.data?.error || 'Đăng nhập thất bại');
    return false;
  }
};
```

**Cập nhật Login.tsx:**

```typescript
// pages/Login.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const success = await onLogin(username, password); // Thay vì onLogin(user)
  if (success) {
    // Login successful, App.tsx will redirect
  }
};
```

### Step 2: Update App.tsx - Load Data on Mount

**Thêm vào sau line 119 (sau khai báo state):**

```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Load all data when user logs in
useEffect(() => {
  if (currentUser) {
    loadAllData();
  } else {
    setLoading(false);
  }
}, [currentUser]);

const loadAllData = async () => {
  setLoading(true);
  setError(null);

  try {
    // Load data in parallel
    const [
      projectsData,
      transactionsData,
      bankAccountData,
      bankTransactionsData,
      interestRateData,
    ] = await Promise.all([
      api.projects.getAll(),
      api.transactions.getAll(),
      api.bank.getAccount(),
      api.bank.getTransactions(),
      api.admin.getInterestRate(),
    ]);

    setProjects(projectsData);
    setTransactions(transactionsData);
    setBankAccount(bankAccountData);
    setBankTransactions(bankTransactionsData);
    setInterestRate(interestRateData.annualRate);

    // Load audit logs if admin
    if (currentUser.role === 'Admin') {
      const auditData = await api.admin.getAuditLogs();
      setAuditLogs(auditData);
    }
  } catch (err: any) {
    console.error('Failed to load data:', err);
    setError('Không thể tải dữ liệu. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
};
```

### Step 3: Update Projects.tsx - Excel Upload

**File:** `pages/Projects.tsx`

**❌ Cũ (Line ~180, hardcoded data):**
```typescript
const sampleData = [
  { stt: 1, name: 'Nguyễn Văn A', /* ... hardcoded 24 rows */ },
  // ...
];

const handleImport = () => {
  // Save to localStorage directly
  setTransactions(prev => [...prev, ...newTransactions]);
};
```

**✅ Mới:**
```typescript
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
const [previewData, setPreviewData] = useState<any[]>([]);
const [isUploading, setIsUploading] = useState(false);

// Step 1: Upload file to backend
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    alert('Chỉ chấp nhận file Excel (.xlsx, .xls)');
    return;
  }

  setIsUploading(true);
  try {
    const result = await api.upload.uploadExcel(file);
    setUploadedFile(file);
    setPreviewData(result.data); // Backend returns parsed data
    setShowModal(true);
  } catch (error: any) {
    console.error('Upload failed:', error);
    alert(error.response?.data?.error || 'Upload thất bại');
  } finally {
    setIsUploading(false);
  }
};

// Step 2: Confirm import
const handleConfirmImport = async () => {
  if (!selectedProject || previewData.length === 0) return;

  setIsUploading(true);
  try {
    // Transform preview data to match backend format
    const households = previewData.map((row, index) => ({
      householdId: `HH-${Date.now()}-${index}`,
      name: row.name,
      cccd: row.cccd,
      address: row.address || '',
      landOrigin: row.landOrigin || '',
      landArea: row.landArea || 0,
      decisionNumber: row.decisionNumber || '',
      decisionDate: row.decisionDate || null,
    }));

    const transactions = previewData.map((row, index) => ({
      householdId: households[index].householdId,
      landAmount: row.landAmount || 0,
      assetAmount: row.assetAmount || 0,
      houseAmount: row.houseAmount || 0,
      supportAmount: row.supportAmount || 0,
      totalApproved: row.totalApproved || 0,
    }));

    // Call API to save data
    await api.upload.confirmImport({
      projectId: selectedProject.id,
      households,
      transactions,
    });

    // Reload data
    await loadAllData(); // Function from App.tsx

    alert(`Đã import thành công ${previewData.length} hồ sơ!`);
    setShowModal(false);
    setPreviewData([]);
    setUploadedFile(null);
  } catch (error: any) {
    console.error('Import failed:', error);
    alert(error.response?.data?.error || 'Import thất bại');
  } finally {
    setIsUploading(false);
  }
};

// UI: Replace hardcoded button with file input
return (
  <div>
    <input
      type="file"
      accept=".xlsx,.xls"
      onChange={handleFileUpload}
      style={{ display: 'none' }}
      ref={fileInputRef}
    />
    <button onClick={() => fileInputRef.current?.click()}>
      📤 Upload Excel
    </button>
    {isUploading && <div>Đang xử lý...</div>}
  </div>
);
```

### Step 4: Update TransactionList.tsx - Change Status

**File:** `pages/TransactionList.tsx`

**❌ Cũ:**
```typescript
const handleUpdateStatus = (id: string, newStatus: TransactionStatus) => {
  setTransactions(prev => prev.map(t =>
    t.id === id ? { ...t, status: newStatus } : t
  ));
};
```

**✅ Mới:**
```typescript
const handleUpdateStatus = async (id: string, newStatus: TransactionStatus) => {
  try {
    await api.transactions.changeStatus(id, newStatus);

    // Reload transactions to get updated data
    const updated = await api.transactions.getAll();
    setTransactions(updated);

    // Also reload bank balance as it might have changed
    const bankData = await api.bank.getAccount();
    setBankAccount(bankData);
  } catch (error: any) {
    console.error('Failed to update status:', error);
    alert(error.response?.data?.error || 'Không thể cập nhật trạng thái');
  }
};
```

### Step 5: Update BankBalance.tsx - Manual Transactions

**File:** `pages/BankBalance.tsx`

**❌ Cũ:**
```typescript
const handleManualTransaction = (type: BankTransactionType, amount: number, note: string) => {
  const newTx: BankTransaction = {
    id: `bank-${Date.now()}`,
    type,
    amount,
    note,
    date: new Date().toISOString(),
    runningBalance: calculateRunningBalance(type, amount),
  };
  setBankTransactions(prev => [...prev, newTx]);
};
```

**✅ Mới:**
```typescript
const handleManualTransaction = async (
  type: BankTransactionType,
  amount: number,
  note: string
) => {
  try {
    await api.bank.createTransaction({
      type,
      amount,
      note,
      transactionDate: new Date().toISOString(),
    });

    // Reload bank data
    const [accountData, transactionsData] = await Promise.all([
      api.bank.getAccount(),
      api.bank.getTransactions(),
    ]);

    setBankAccount(accountData);
    setBankTransactions(transactionsData);
  } catch (error: any) {
    console.error('Failed to create transaction:', error);
    alert(error.response?.data?.error || 'Không thể tạo giao dịch');
  }
};
```

### Step 6: Update Admin.tsx - Interest Rate Change

**File:** `pages/Admin.tsx`

**❌ Cũ:**
```typescript
const handleSaveInterestRate = (newRate: number) => {
  setInterestRate(newRate);
  setInterestHistory(prev => [...prev, {
    id: `history-${Date.now()}`,
    date: new Date().toISOString(),
    oldRate: interestRate,
    newRate,
    changedBy: currentUser.name,
  }]);
};
```

**✅ Mới:**
```typescript
const handleSaveInterestRate = async (newRate: number, note: string) => {
  try {
    await api.admin.updateInterestRate(
      newRate,
      new Date().toISOString(),
      note
    );

    // Reload interest rate and history
    const [rateData, historyData] = await Promise.all([
      api.admin.getInterestRate(),
      api.admin.getInterestHistory(),
    ]);

    setInterestRate(rateData.annualRate);
    setInterestHistory(historyData);

    alert('Đã cập nhật lãi suất thành công!');
  } catch (error: any) {
    console.error('Failed to update interest rate:', error);
    alert(error.response?.data?.error || 'Không thể cập nhật lãi suất');
  }
};
```

### Step 7: Remove LocalStorage Persistence

**File:** `App.tsx`, Line 123-132

**❌ Xóa đoạn code này:**
```typescript
useEffect(() => {
  localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  localStorage.setItem(DB_KEYS.PROJECTS, JSON.stringify(projects));
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(DB_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  localStorage.setItem(DB_KEYS.BANK_ACCOUNT, JSON.stringify(bankAccount));
  localStorage.setItem(DB_KEYS.BANK_TRANSACTIONS, JSON.stringify(bankTransactions));
  localStorage.setItem(DB_KEYS.CONFIG_RATE, interestRate.toString());
  localStorage.setItem(DB_KEYS.CONFIG_HISTORY, JSON.stringify(interestHistory));
}, [transactions, projects, users, auditLogs, bankAccount, bankTransactions, interestRate, interestHistory]);
```

**✅ Không cần nữa** vì dữ liệu được lưu trên server.

### Step 8: Add Loading & Error States

**File:** `App.tsx`, trong render function

```typescript
return (
  <HashRouter>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {!currentUser ? (
        <Login
          users={users}
          onLogin={handleLogin}
        />
      ) : loading ? (
        // Loading state
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : error ? (
        // Error state
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : (
        // Normal app content
        <div className="flex h-screen overflow-hidden">
          {/* ... existing content */}
        </div>
      )}
    </div>
  </HashRouter>
);
```

## 🧪 Testing Integration

### 1. Test Backend Health
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"healthy"}`

### 2. Test Login from Frontend
1. Start backend: `cd E:\Final-main\backend && npm run dev`
2. Start frontend: `cd E:\Final-main && npm run dev`
3. Login với: `admin_org001` / `admin123`
4. Mở DevTools → Network tab → Xem API calls

### 3. Test Excel Upload
1. Tạo file Excel test với columns: `Họ và tên`, `CCCD`, `Số tiền`
2. Upload file
3. Kiểm tra Preview modal hiển thị data từ backend
4. Confirm import
5. Kiểm tra transactions list được cập nhật

### 4. Test Transaction Status Change
1. Chọn 1 transaction có status PENDING
2. Click "Giải ngân"
3. Kiểm tra:
   - Status chuyển sang DISBURSED
   - Bank balance giảm
   - Bank transaction được tạo

### 5. Test Multi-Tenancy
1. Login với `admin_org001`
2. Tạo 1 project
3. Logout
4. Login với `admin_org002`
5. Kiểm tra: Không thấy project của org001

## 🐛 Common Issues

### Issue 1: CORS Error
**Lỗi:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Giải pháp:**
- Check `backend/.env` có `FRONTEND_URL=http://localhost:3000` chưa
- Restart backend server

### Issue 2: 401 Unauthorized
**Lỗi:** All API calls return 401

**Giải pháp:**
- Check localStorage có `auth_token` không (F12 → Application → Local Storage)
- Token có thể hết hạn (7 days), login lại

### Issue 3: Network Error
**Lỗi:** `Network Error` hoặc `ERR_CONNECTION_REFUSED`

**Giải pháp:**
- Check backend đang chạy: `curl http://localhost:3001/health`
- Check `.env` có `VITE_API_URL` đúng không

### Issue 4: Data Not Loading
**Lỗi:** Login thành công nhưng không có data

**Giải pháp:**
- Check backend logs có lỗi không
- Check database có data không: `npm run prisma:studio`
- Re-seed database: `npm run prisma:seed`

## 📊 API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": [...],
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here",
  "details": {...}
}
```

## 🎯 Next Steps

1. ✅ Complete all steps above
2. ✅ Test each feature thoroughly
3. ✅ Remove all `DB_KEYS` and localStorage logic
4. ✅ Add proper error handling to all API calls
5. ✅ Add loading states to all pages
6. ✅ Test multi-tenancy isolation
7. ✅ Deploy backend to Railway
8. ✅ Update frontend `.env` with production API URL
9. ✅ Deploy frontend to Vercel
10. ✅ Test production environment

## 📞 Support

Nếu gặp vấn đề:
1. Check console logs (F12)
2. Check backend logs
3. Check Network tab trong DevTools
4. Check database với Prisma Studio

---

**Good luck! 🚀**
