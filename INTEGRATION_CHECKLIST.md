# ✅ Frontend-Backend Integration Checklist

Làm theo thứ tự từ trên xuống dưới.

## Phase 1: Setup (10 phút)

- [ ] **1.1** Backend đang chạy
  ```bash
  cd E:\Final-main\backend
  npm run dev
  ```
  ✅ Thấy: `Server running on port 3001`

- [ ] **1.2** Test backend health
  ```bash
  curl http://localhost:3001/health
  ```
  ✅ Thấy: `{"status":"healthy"}`

- [ ] **1.3** Cài Axios cho frontend
  ```bash
  cd E:\Final-main
  npm install axios
  ```

- [ ] **1.4** File `.env` đã có
  ```
  VITE_API_URL=http://localhost:3001/api
  ```

- [ ] **1.5** File `src/services/api.ts` đã được tạo
  ✅ Đã tạo tự động bởi Claude

---

## Phase 2: Update Login Flow (15 phút)

- [ ] **2.1** Backup file cũ
  ```bash
  cd E:\Final-main
  copy App.tsx App.tsx.backup
  copy pages\Login.tsx pages\Login.tsx.backup
  ```

- [ ] **2.2** Update `pages/Login.tsx`

**Tìm đoạn code này (line ~50):**
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const user = users.find(
    u => u.name.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (user) {
    onLogin(user);
  } else {
    setError('Tên đăng nhập hoặc mật khẩu không đúng');
  }
};
```

**Thay bằng:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const success = await onLogin(username, password);
    if (!success) {
      setError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  } catch (error) {
    setError('Đăng nhập thất bại. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
};
```

**Thêm state loading:**
```typescript
const [loading, setLoading] = useState(false);
```

**Update button:**
```typescript
<button
  type="submit"
  disabled={loading}
  className="w-full py-3..."
>
  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
</button>
```

- [ ] **2.3** Update `App.tsx` - handleLogin function

**Thêm import:**
```typescript
import api from './services/api';
```

**Tìm function handleLogin (line ~82):**
```typescript
const handleLogin = (user: User) => {
  setCurrentUser(user);
  // Log audit...
};
```

**Thay bằng:**
```typescript
const handleLogin = async (username: string, password: string): Promise<boolean> => {
  try {
    const { token, user } = await api.auth.login(username, password);
    setCurrentUser(user);
    setActiveTab('dashboard');
    return true;
  } catch (error: any) {
    console.error('Login failed:', error);
    return false;
  }
};
```

- [ ] **2.4** Test login
  1. Start frontend: `npm run dev`
  2. Login với `admin_org001` / `admin123`
  3. Mở DevTools → Network → Xem có request `/api/auth/login` không
  4. ✅ Login thành công, vào được dashboard

---

## Phase 3: Load Data from API (20 phút)

- [ ] **3.1** Update `App.tsx` - Add loading states

**Thêm sau line 119 (sau khai báo selectedTransaction):**
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

- [ ] **3.2** Add loadAllData function

**Thêm sau handleLogout function:**
```typescript
const loadAllData = async () => {
  setLoading(true);
  setError(null);

  try {
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

- [ ] **3.3** Call loadAllData when user logs in

**Thêm useEffect sau loadAllData function:**
```typescript
useEffect(() => {
  if (currentUser) {
    loadAllData();
  } else {
    setLoading(false);
  }
}, [currentUser]);
```

- [ ] **3.4** Remove localStorage initialization

**Tìm và XÓA các dòng này (line ~54-58, ~102-118):**
```typescript
// XÓA:
const [transactions, setTransactions] = useState<Transaction[]>(() =>
  JSON.parse(localStorage.getItem(DB_KEYS.TRANSACTIONS) || '[]'));

const [projects, setProjects] = useState<Project[]>(() =>
  JSON.parse(localStorage.getItem(DB_KEYS.PROJECTS) || '[]'));

// ... và các localStorage.getItem khác
```

**Thay bằng:**
```typescript
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [projects, setProjects] = useState<Project[]>([]);
const [bankAccount, setBankAccount] = useState<BankAccount>({
  openingBalance: 0,
  currentBalance: 0,
  reconciledBalance: 0
});
const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
const [interestHistory, setInterestHistory] = useState<InterestHistoryLog[]>([]);
```

- [ ] **3.5** Remove localStorage persistence useEffect

**Tìm và XÓA useEffect này (line ~123-132):**
```typescript
// XÓA toàn bộ useEffect này:
useEffect(() => {
  localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  // ...
}, [transactions, projects, ...]);
```

- [ ] **3.6** Add loading UI

**Tìm return statement trong App.tsx, update như sau:**
```typescript
return (
  <HashRouter>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {!currentUser ? (
        <Login users={users} onLogin={handleLogin} />
      ) : loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : error ? (
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
        // Existing content...
        <div className="flex h-screen overflow-hidden">
          {/* ... existing code */}
        </div>
      )}
    </div>
  </HashRouter>
);
```

- [ ] **3.7** Test data loading
  1. Restart frontend
  2. Login
  3. ✅ Thấy loading spinner
  4. ✅ Dashboard hiển thị data từ backend

---

## Phase 4: Update Projects Page - Excel Upload (30 phút)

- [ ] **4.1** Backup file
  ```bash
  copy pages\Projects.tsx pages\Projects.tsx.backup
  ```

- [ ] **4.2** Update `pages/Projects.tsx`

**Thêm imports:**
```typescript
import api from '../services/api';
import { useRef } from 'react';
```

**Thêm states:**
```typescript
const [uploadedFile, setUploadedFile] = useState<File | null>(null);
const [previewData, setPreviewData] = useState<any[]>([]);
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

**Tìm và XÓA hardcoded sampleData (line ~180-205):**
```typescript
// XÓA toàn bộ const sampleData = [...]
```

**Add file upload handler:**
```typescript
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
    setPreviewData(result.data);
    setShowModal(true);
  } catch (error: any) {
    console.error('Upload failed:', error);
    alert(error.response?.data?.error || 'Upload thất bại');
  } finally {
    setIsUploading(false);
  }
};
```

**Update handleImport function:**
```typescript
const handleImport = async () => {
  if (!selectedProject || previewData.length === 0) {
    alert('Vui lòng chọn dự án và upload file!');
    return;
  }

  setIsUploading(true);
  try {
    const households = previewData.map((row, index) => ({
      householdId: `HH-${Date.now()}-${index}`,
      name: row.name || row['Họ và tên'] || '',
      cccd: String(row.cccd || row['CCCD'] || ''),
      address: row.address || row['Địa chỉ'] || '',
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
      totalApproved: row.totalApproved || row.amount || row['Số tiền'] || 0,
    }));

    await api.upload.confirmImport({
      projectId: selectedProject.id,
      households,
      transactions,
    });

    alert(`Đã import thành công ${previewData.length} hồ sơ!`);

    // Reload data
    const updatedTransactions = await api.transactions.getAll();
    setTransactions(updatedTransactions);

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
```

**Update UI - Replace upload button:**
```typescript
{/* Tìm button "Tải lên danh sách" và thay bằng: */}
<>
  <input
    type="file"
    accept=".xlsx,.xls"
    onChange={handleFileUpload}
    style={{ display: 'none' }}
    ref={fileInputRef}
  />
  <button
    onClick={() => fileInputRef.current?.click()}
    disabled={isUploading}
    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
  >
    📤 {isUploading ? 'Đang xử lý...' : 'Upload Excel'}
  </button>
</>
```

- [ ] **4.3** Test Excel upload
  1. Tạo file Excel test: `test-data.xlsx`
     - Column A: "Họ và tên"
     - Column B: "CCCD"
     - Column C: "Số tiền"
     - Add 5-10 rows test data
  2. Vào trang Projects
  3. Chọn project
  4. Click "Upload Excel"
  5. ✅ Preview modal hiển thị data
  6. Click "Nhập dữ liệu"
  7. ✅ Transaction list được cập nhật

---

## Phase 5: Update Transaction Actions (20 phút)

- [ ] **5.1** Update TransactionList.tsx

**Thêm import:**
```typescript
import api from '../services/api';
```

**Update handleUpdateStatus:**
```typescript
const handleUpdateStatus = async (id: string, newStatus: TransactionStatus) => {
  if (!confirm(`Xác nhận chuyển trạng thái sang ${newStatus}?`)) return;

  try {
    await api.transactions.changeStatus(id, newStatus);

    // Reload data
    const [updatedTransactions, updatedBank] = await Promise.all([
      api.transactions.getAll(),
      api.bank.getAccount(),
    ]);

    setTransactions(updatedTransactions);
    setBankAccount(updatedBank);

    alert('Đã cập nhật trạng thái thành công!');
  } catch (error: any) {
    console.error('Failed to update status:', error);
    alert(error.response?.data?.error || 'Không thể cập nhật trạng thái');
  }
};
```

- [ ] **5.2** Update TransactionModal.tsx

**Thêm import:**
```typescript
import api from '../services/api';
```

**Update handleStatusChange:**
```typescript
const handleStatusChange = async (newStatus: TransactionStatus) => {
  try {
    await api.transactions.changeStatus(transaction.id, newStatus);

    const updated = await api.transactions.getById(transaction.id);
    onUpdate(updated);

    alert('Đã cập nhật trạng thái!');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Không thể cập nhật');
  }
};
```

**Update handleSupplementary:**
```typescript
const handleSupplementary = async (amount: number, note: string) => {
  try {
    await api.transactions.addSupplementary(transaction.id, amount, note);

    const updated = await api.transactions.getById(transaction.id);
    onUpdate(updated);

    alert('Đã bổ sung tiền thành công!');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Không thể bổ sung tiền');
  }
};
```

- [ ] **5.3** Test transaction actions
  1. Click vào 1 transaction
  2. Click "Giải ngân"
  3. ✅ Status chuyển sang DISBURSED
  4. ✅ Bank balance giảm
  5. Click "Bổ sung tiền"
  6. ✅ Số tiền được cập nhật

---

## Phase 6: Update Bank Balance Page (15 phút)

- [ ] **6.1** Update BankBalance.tsx

**Thêm import:**
```typescript
import api from '../services/api';
```

**Update handleManualTransaction:**
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

    const [accountData, transactionsData] = await Promise.all([
      api.bank.getAccount(),
      api.bank.getTransactions(),
    ]);

    setBankAccount(accountData);
    setBankTransactions(transactionsData);

    alert('Đã tạo giao dịch thành công!');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Không thể tạo giao dịch');
  }
};
```

- [ ] **6.2** Test bank transactions
  1. Vào trang Bank Balance
  2. Click "Nạp tiền" hoặc "Rút tiền"
  3. Nhập số tiền và ghi chú
  4. ✅ Transaction được tạo
  5. ✅ Balance được cập nhật

---

## Phase 7: Update Admin Page (15 phút)

- [ ] **7.1** Update Admin.tsx

**Thêm import:**
```typescript
import api from '../services/api';
```

**Update handleSaveInterestRate:**
```typescript
const handleSaveInterestRate = async (newRate: number, note: string) => {
  try {
    await api.admin.updateInterestRate(
      newRate,
      new Date().toISOString(),
      note || 'Cập nhật lãi suất'
    );

    const [rateData, historyData] = await Promise.all([
      api.admin.getInterestRate(),
      api.admin.getInterestHistory(),
    ]);

    setInterestRate(rateData.annualRate);
    setInterestHistory(historyData);

    alert('Đã cập nhật lãi suất thành công!');
  } catch (error: any) {
    alert(error.response?.data?.error || 'Không thể cập nhật lãi suất');
  }
};
```

- [ ] **7.2** Test interest rate change
  1. Vào trang Admin
  2. Đổi lãi suất từ 6.5% → 7.0%
  3. ✅ Lãi suất được cập nhật
  4. ✅ History được lưu

---

## Phase 8: Final Cleanup (10 phút)

- [ ] **8.1** Remove unused code

**Trong App.tsx, XÓA:**
```typescript
// XÓA DB_KEYS object (không dùng nữa)
const DB_KEYS = { ... };

// XÓA DEFAULT_ADMIN (backend handle users)
const DEFAULT_ADMIN = { ... };
```

- [ ] **8.2** Update users state

**Thay:**
```typescript
const [users, setUsers] = useState<User[]>(() => {
  // ... localStorage logic
  return [DEFAULT_ADMIN];
});
```

**Bằng:**
```typescript
const [users, setUsers] = useState<User[]>([]);

// Load users if admin
useEffect(() => {
  if (currentUser?.role === 'Admin') {
    api.users.getAll().then(setUsers).catch(console.error);
  }
}, [currentUser]);
```

- [ ] **8.3** Test toàn bộ app
  - [ ] Login/Logout
  - [ ] Dashboard statistics
  - [ ] Projects list
  - [ ] Excel upload
  - [ ] Transaction list
  - [ ] Change status
  - [ ] Supplementary amount
  - [ ] Bank balance
  - [ ] Admin panel

---

## Phase 9: Multi-Tenancy Test (10 phút)

- [ ] **9.1** Test organization isolation
  1. Login với `admin_org001` / `admin123`
  2. Tạo 1 project "Test ORG001"
  3. Logout
  4. Login với `admin_org002` / `admin123`
  5. ✅ Không thấy project "Test ORG001"
  6. Tạo 1 project "Test ORG002"
  7. ✅ Chỉ thấy project "Test ORG002"

---

## ✅ Done!

Nếu tất cả checkboxes đều tích ✅:
- 🎉 Frontend đã integrate thành công với Backend!
- 🚀 Sẵn sàng để deploy!

---

## 🐛 Troubleshooting

### Lỗi: Cannot find module './services/api'
**Fix:** Check file `src/services/api.ts` đã tạo chưa

### Lỗi: CORS policy blocked
**Fix:** Restart backend, check `FRONTEND_URL` trong backend `.env`

### Lỗi: 401 Unauthorized
**Fix:** Clear localStorage, login lại

### Lỗi: Network Error
**Fix:** Check backend đang chạy: `curl http://localhost:3001/health`

---

**Good luck! 💪**
