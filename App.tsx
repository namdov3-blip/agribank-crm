
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { TransactionList } from './pages/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { BankBalance } from './pages/BankBalance';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { ConfirmPayment } from './pages/ConfirmPayment';
import {
  Transaction,
  TransactionStatus,
  Project,
  TransactionLog,
  User,
  AuditLogItem,
  InterestHistoryLog,
  BankAccount,
  BankTransaction,
  BankTransactionType
} from './types';
import { calculateInterest, formatCurrency } from './utils/helpers';
import api from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [interestRate, setInterestRate] = useState<number>(6.5);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount>({
    openingBalance: 0,
    currentBalance: 0,
    reconciledBalance: 0
  });
  const [interestHistory, setInterestHistory] = useState<InterestHistoryLog[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all data from API
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
        interestHistoryData,
      ] = await Promise.all([
        api.projects.getAll(),
        api.transactions.getAll(),
        api.bank.getAccount(),
        api.bank.getTransactions(),
        api.admin.getInterestRate(),
        api.admin.getInterestHistory(),
      ]);

      setProjects(projectsData);
      setTransactions(transactionsData);
      setBankAccount(bankAccountData);
      setBankTransactions(bankTransactionsData);
      setInterestRate(interestRateData.annualRate);
      setInterestHistory(interestHistoryData);

      if (currentUser?.role === 'Admin') {
        const [auditData, usersData] = await Promise.all([
          api.admin.getAuditLogs(),
          api.users.getAll()
        ]);
        setAuditLogs(auditData);
        
        // Map backend users to frontend User type
        const mappedUsers = usersData.map((u: any) => ({
          id: u.id,
          name: u.fullName,
          role: u.role,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=random`,
          permissions: Array.isArray(u.permissions) ? u.permissions : [],
          organization: u.organization?.name as any || undefined
        }));
        setUsers(mappedUsers);
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when user logs in
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const { token, user } = await api.auth.login(username, password);
      // Chuẩn hóa user từ backend về kiểu User dùng trong FE
      const mappedUser: User = {
        id: user.id,
        name: user.fullName || user.name || '',
        role: user.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.name || '')}&background=random`,
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
        organization: user.organization?.name as any || undefined,
      };

      setCurrentUser(mappedUser);
      // Ghi đè lại current_user trong localStorage để đảm bảo đồng bộ với kiểu FE
      localStorage.setItem('current_user', JSON.stringify(mappedUser));
      setActiveTab('dashboard');
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setActiveTab('dashboard');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
  };

  // NOTE: Bank transactions are now fully managed by backend.
  // Frontend just displays data from API, no local recalculation needed.
  // When interest rate changes, the display values update automatically
  // since interest is calculated on-the-fly in BankBalance and Dashboard components.

    // Helper function to convert Vietnamese BankTransactionType to English API format
  const convertTransactionTypeToAPI = (type: BankTransactionType): 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT' => {
    if (type === BankTransactionType.DEPOSIT) return 'DEPOSIT';
    if (type === BankTransactionType.WITHDRAW) return 'WITHDRAW';
    if (type === BankTransactionType.ADJUSTMENT) return 'ADJUSTMENT';
    return 'DEPOSIT'; // Default fallback
  };

  const handleAddBankTransaction = useCallback(async (type: BankTransactionType, amount: number, note: string, date: string) => {
    try {
      // Convert Vietnamese type to English API format
      const apiType = convertTransactionTypeToAPI(type);
      
      // Ensure amount is positive (backend will handle sign based on type)
      const positiveAmount = Math.abs(amount);
      
      // Call API to create bank transaction
      await api.bank.createTransaction({
        type: apiType,
        amount: Math.round(positiveAmount), // Backend expects integer
        note,
        transactionDate: date
      });

      // Reload bank data to get updated balance
      const [accountData, transactionsData] = await Promise.all([
        api.bank.getAccount(),
        api.bank.getTransactions()
      ]);

      setBankAccount(accountData);
      setBankTransactions(transactionsData);
    } catch (error: any) {
      console.error('Failed to create bank transaction:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details?.[0]?.message || 'Không thể tạo giao dịch. Vui lòng thử lại.';
      alert(errorMessage);
      throw error; // Re-throw to prevent silent failures
    }
  }, []);

  const handleAdjustOpeningBalance = async (newBalance: number) => {
    try {
      // Call API to adjust opening balance
      await api.bank.adjustOpeningBalance(newBalance, 'Điều chỉnh số dư mở đầu');

      // Reload bank data
      const accountData = await api.bank.getAccount();
      setBankAccount(accountData);
    } catch (error: any) {
      console.error('Failed to adjust opening balance:', error);
      alert(error.response?.data?.error || 'Không thể điều chỉnh số dư. Vui lòng thử lại.');
    }
  };

  const handleAddUser = async (user: User) => {
    try {
      if (!user.name) {
        alert('Vui lòng nhập tên người dùng');
        return;
      }
      if (!user.password) {
        alert('Vui lòng nhập mật khẩu');
        return;
      }

      // Generate username from name (remove Vietnamese accents, lowercase, replace spaces with underscore)
      const username = user.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      // Frontend validate to tránh lỗi 400 từ backend
      if (username.length < 3) {
        alert('Username sinh ra từ tên quá ngắn. Vui lòng nhập tên dài hơn (sau khi bỏ dấu tối thiểu 3 ký tự).');
        return;
      }
      if (user.password.length < 6) {
        alert('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
      }

      // Map organization name từ FE sang organizationCode cho backend (chỉ dùng bởi super admin)
      const ORG_NAME_TO_CODE: Record<string, string> = {
        'Agribank Chi nhánh Đông Anh': 'AGR_DA',
        'Đông Anh': 'ORG_DA',
        'Phúc Thịnh': 'ORG_PT',
        'Vĩnh Thanh': 'ORG_VT',
        'Thiên Lộc': 'ORG_TL',
        'Thư Lâm': 'ORG_TLM',
      };

      const organizationCode = user.organization ? ORG_NAME_TO_CODE[user.organization] : undefined;

      await api.users.create({
        username: username,
        password: user.password,
        fullName: user.name,
        email: `${username}@example.com`,
        role: user.role,
        permissions: user.permissions || [],
        organizationCode,
      } as any);

      // Reload users list
      const usersData = await api.users.getAll();
      const mappedUsers = usersData.map((u: any) => ({
        id: u.id,
        name: u.fullName,
        role: u.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=random`,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        organization: u.organization?.name as any || undefined
      }));
      setUsers(mappedUsers);

      alert('Đã tạo người dùng thành công!');
    } catch (error: any) {
      console.error('Failed to add user:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.details?.[0]?.message ||
        'Không thể tạo người dùng. Vui lòng thử lại.';
      alert(errorMessage);
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      const updateData: any = {
        fullName: user.name,
        role: user.role,
        permissions: user.permissions || []
      };

      // Only include password if it's provided
      if (user.password) {
        updateData.password = user.password;
      }

      await api.users.update(user.id, updateData);

      // Reload users list
      const usersData = await api.users.getAll();
      const mappedUsers = usersData.map((u: any) => ({
        id: u.id,
        name: u.fullName,
        role: u.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=random`,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        organization: u.organization?.name as any || undefined
      }));
      setUsers(mappedUsers);

      alert('Đã cập nhật người dùng thành công!');
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert(error.response?.data?.error || 'Không thể cập nhật người dùng. Vui lòng thử lại.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      await api.users.delete(id);

      // Reload users list
      const usersData = await api.users.getAll();
      const mappedUsers = usersData.map((u: any) => ({
        id: u.id,
        name: u.fullName,
        role: u.role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=random`,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        organization: u.organization?.name as any || undefined
      }));
      setUsers(mappedUsers);

      alert('Đã xóa người dùng thành công!');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.error || 'Không thể xóa người dùng. Vui lòng thử lại.');
    }
  };

  const handleUpdateInterestRate = async (newRate: number) => {
    try {
      await api.admin.updateInterestRate(
        newRate,
        new Date().toISOString(),
        `Thay đổi lãi suất từ ${interestRate}% sang ${newRate}%`
      );

      // Reload interest rate and history
      const [rateData, historyData] = await Promise.all([
        api.admin.getInterestRate(),
        api.admin.getInterestHistory()
      ]);

      setInterestRate(rateData.annualRate);
      setInterestHistory(historyData);

      alert('Đã cập nhật lãi suất thành công!');
    } catch (error: any) {
      console.error('Failed to update interest rate:', error);
      alert(error.response?.data?.error || 'Không thể cập nhật lãi suất. Vui lòng thử lại.');
    }
  };

  // --- TỰ ĐỘNG KẾT CHUYỂN LÃI - DISABLED ---
  // NOTE: This auto-capitalization feature has been disabled because it can cause
  // balance jumping issues. It runs on every bankTransactions change and can add
  // unexpected interest deposits. If needed, implement as a manual action or
  // move this logic to the backend.
  // The original code calculated monthly interest based on running balances and
  // created automatic deposit transactions for interest capitalization.

    const handleStatusChange = async (id: string, newStatus: TransactionStatus) => {
    try {
      const disbursementDate = newStatus === TransactionStatus.DISBURSED ? new Date().toISOString() : undefined;

      // Call API to change status (backend handles bank transactions, audit logs, etc.)
      await api.transactions.changeStatus(id, newStatus, disbursementDate);

      // Reload all data to get updated state
      await loadAllData();
    } catch (error: any) {
      console.error('Failed to change status:', error);
      alert(error.response?.data?.error || 'Không thể thay đổi trạng thái. Vui lòng thử lại.');
    }
  };

  const handleRefundTransaction = async (id: string, refundedAmount: number) => {
    try {
      // Call API to refund transaction (backend handles bank deposit, status change, etc.)
      await api.transactions.refund(id, refundedAmount);

      // Reload all data to get updated state
      await loadAllData();
    } catch (error: any) {
      console.error('Failed to refund transaction:', error);
      alert(error.response?.data?.error || 'Không thể hoàn quỹ. Vui lòng thử lại.');
    }
  };

  const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
    try {
      // Check if this is a supplementary amount update
      const originalTx = transactions.find(t => t.id === updatedTransaction.id);
      if (originalTx && updatedTransaction.supplementaryAmount !== originalTx.supplementaryAmount) {
        const amountDiff = (updatedTransaction.supplementaryAmount || 0) - (originalTx.supplementaryAmount || 0);
        const note = updatedTransaction.supplementaryNote || 'Bổ sung tiền';

        // Call API to add supplementary amount
        await api.transactions.addSupplementary(updatedTransaction.id, amountDiff, note);

        // Reload all data to get updated state
        await loadAllData();
      } else {
        // For other updates, just update local state
        setTransactions(transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
      }
    } catch (error: any) {
      console.error('Failed to update transaction:', error);
      alert(error.response?.data?.error || 'Không thể cập nhật giao dịch. Vui lòng thử lại.');
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      await api.projects.update(updatedProject.id, {
        name: updatedProject.name,
        code: updatedProject.code,
        interestStartDate: updatedProject.interestStartDate
      });

      // Update local state
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));

      alert('Đã cập nhật dự án thành công!');

      // Reload data to recalculate interest
      await loadAllData();
    } catch (error: any) {
      console.error('Update project failed:', error);
      alert(error.response?.data?.error || 'Cập nhật dự án thất bại');
    }
  };

  const handleImportProject = (p: Project, t: Transaction[]) => {
    const now = new Date();

    // 1. Lưu thông tin dự án và danh sách hộ dân
    setProjects([p, ...projects]);
    setTransactions([...transactions, ...t]);

    // 2. Tính tổng tiền cần nạp (Gốc + Lãi tạm tính + Tiền bổ sung)
    let totalInterest = 0;
    let totalSupplementary = 0;
    t.forEach(transaction => {
      const baseDate = transaction.effectiveInterestDate || p.interestStartDate;
      if (baseDate) {
        totalInterest += calculateInterest(transaction.compensation.totalApproved, interestRate, baseDate, now);
      }
      totalSupplementary += transaction.supplementaryAmount || 0;
    });
    
    const totalToDeposit = p.totalBudget + totalInterest + totalSupplementary;

    // 3. Tự động nạp tiền dự án vào số dư tài khoản
    // Nạp đủ số tiền bao gồm cả lãi tạm tính và tiền bổ sung để đồng nhất với "Số dư hiện tại"
    handleAddBankTransaction(
      BankTransactionType.DEPOSIT,
      totalToDeposit,
      `Tiền chưa giải ngân dự án ${p.code}${totalInterest > 0 || totalSupplementary > 0 ? ` (Gốc: ${formatCurrency(p.totalBudget)}${totalInterest > 0 ? ` + Lãi: ${formatCurrency(totalInterest)}` : ''}${totalSupplementary > 0 ? ` + Bổ sung: ${formatCurrency(totalSupplementary)}` : ''})` : ''}`,
      p.interestStartDate || new Date().toISOString()
    );

    // 3. Log audit - Lịch sử upload file
    setAuditLogs(prev => [...prev, {
      id: `audit-${Date.now()}`,
      timestamp: now.toISOString(),
      actor: currentUser?.name || 'Hệ thống',
      role: currentUser?.role || 'System',
      action: 'Upload file dữ liệu',
      target: `Dự án ${p.code}`,
      details: `Đã upload file và import dự án ${p.name} (${p.code}) với ${t.length} hộ dân. Tổng ngân sách: ${formatCurrency(p.totalBudget)}`
    }]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard transactions={transactions} projects={projects} interestRate={interestRate} bankAccount={bankAccount} setActiveTab={setActiveTab} currentUser={currentUser} />;
      case 'projects': return <Projects projects={projects} transactions={transactions} interestRate={interestRate} onImport={handleImportProject} onUpdateProject={handleUpdateProject} onViewDetails={c => { setTransactionSearchTerm(c); setActiveTab('transactions'); }} onReloadData={loadAllData} />;
      case 'balance': return <BankBalance transactions={transactions} projects={projects} bankAccount={bankAccount} bankTransactions={bankTransactions} interestRate={interestRate} currentUser={currentUser} onAddBankTransaction={handleAddBankTransaction} onAdjustOpeningBalance={handleAdjustOpeningBalance} setAuditLogs={setAuditLogs} />;
      case 'transactions': return (
        <TransactionList
          transactions={transactions}
          projects={projects}
          interestRate={interestRate}
          onSelect={setSelectedTransaction}
          onPrint={(t) => {
            setSelectedTransaction(t);
            setAutoPrint(true);
          }}
          searchTerm={transactionSearchTerm}
          setSearchTerm={setTransactionSearchTerm}
          currentUser={currentUser}
        />
      );
      case 'admin': return (
        <Admin
          auditLogs={auditLogs}
          users={users}
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
          interestRate={interestRate}
          onUpdateInterestRate={handleUpdateInterestRate}
          interestHistory={interestHistory}
          currentUser={currentUser}
          setAuditLogs={setAuditLogs}
          setInterestHistory={setInterestHistory}
        />
      );
      default: return null;
    }
  };

  // Show login page if not logged in
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Lỗi kết nối</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadAllData}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if this is a /confirm page request
  const isConfirmPage = window.location.pathname === '/confirm' || window.location.pathname.startsWith('/confirm');

  // Render Confirm Payment page for QR scanning
  if (isConfirmPage) {
    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="/confirm"
            element={
              <ConfirmPayment
                currentUser={currentUser}
                interestRate={interestRate}
                onLogin={handleLogin}
              />
            }
          />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />
        <main className="ml-64 p-8 min-h-screen relative bg-[#f8fafc]">
          {renderContent()}
        </main>
        {selectedTransaction && (
          <TransactionModal
            transaction={selectedTransaction}
            interestRate={interestRate}
            projectCode={projects.find(p => p.id === selectedTransaction.projectId)?.code}
            project={projects.find(p => p.id === selectedTransaction.projectId)}
            interestStartDate={projects.find(p => p.id === selectedTransaction.projectId)?.interestStartDate}
            onClose={() => {
              setSelectedTransaction(null);
              setAutoPrint(false);
            }}
            onStatusChange={handleStatusChange}
            onRefund={handleRefundTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            currentUser={currentUser}
            setAuditLogs={setAuditLogs}
            handleAddBankTransaction={handleAddBankTransaction}
            organizationName={currentUser?.organization || 'Đông Anh'}
          />
        )}
      </div>
    </HashRouter>
  );
};

export default App;
