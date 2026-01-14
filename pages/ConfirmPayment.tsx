import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Transaction, Project, User } from '../types';
import { formatCurrency, formatNumberWithComma, calculateInterest } from '../utils/helpers';
import { FileText, User as UserIcon, Building2, DollarSign, CheckCircle, AlertCircle, LogIn, Loader2 } from 'lucide-react';
import api from '../services/api';

interface ConfirmPaymentProps {
  currentUser: User | null;
  interestRate: number;
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export const ConfirmPayment: React.FC<ConfirmPaymentProps> = ({
  currentUser,
  interestRate,
  onLogin
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txId = searchParams.get('tx');

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyDisbursed, setAlreadyDisbursed] = useState(false);

  // Login state
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Check session (10 minutes)
  const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes in ms

  useEffect(() => {
    const checkSession = () => {
      const sessionTime = localStorage.getItem('confirm_session_time');
      if (sessionTime) {
        const elapsed = Date.now() - parseInt(sessionTime);
        if (elapsed > SESSION_DURATION) {
          localStorage.removeItem('confirm_session_time');
          return false;
        }
        return true;
      }
      return false;
    };

    if (!currentUser && !checkSession()) {
      setShowLogin(true);
      setLoading(false);
    } else {
      // Refresh session time
      localStorage.setItem('confirm_session_time', Date.now().toString());
      loadTransaction();
    }
  }, [txId, currentUser]);

  const loadTransaction = async () => {
    if (!txId) {
      setError('Không tìm thấy mã giao dịch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const tx = await api.transactions.getById(txId);
      if (!tx) {
        setError('Không tìm thấy giao dịch');
        setLoading(false);
        return;
      }

      setTransaction(tx);

      // Check if already disbursed
      if (tx.status === 'Đã giải ngân') {
        setAlreadyDisbursed(true);
      }

      // Load project info
      const projects = await api.projects.getAll();
      const proj = projects.find((p: Project) => p.id === tx.projectId);
      setProject(proj || null);

    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    try {
      const success = await onLogin(username, password);
      if (success) {
        localStorage.setItem('confirm_session_time', Date.now().toString());
        setShowLogin(false);
        loadTransaction();
      } else {
        setLoginError('Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleConfirm = async () => {
    if (!transaction || !currentUser) return;

    setConfirming(true);
    try {
      await api.transactions.changeStatus(transaction.id, 'Đã giải ngân', new Date().toISOString());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xác nhận giải ngân');
    } finally {
      setConfirming(false);
    }
  };

  // Calculate amounts
  const calculateAmounts = () => {
    if (!transaction) return { principal: 0, interest: 0, supplementary: 0, total: 0 };

    const principal = transaction.compensation?.totalApproved || 0;
    const baseDate = transaction.effectiveInterestDate || project?.interestStartDate;
    const interest = calculateInterest(principal, interestRate, baseDate, new Date());
    const supplementary = transaction.supplementaryAmount || 0;
    const total = principal + interest + supplementary;

    return { principal, interest, supplementary, total };
  };

  const amounts = calculateAmounts();

  // Login Screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
            <p className="text-gray-500 mt-2">Đăng nhập để xác nhận giải ngân</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập tên đăng nhập"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-sm text-center">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Phiên đăng nhập sẽ được lưu trong 10 phút
          </p>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lỗi</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Xác nhận thành công!</h1>
          <p className="text-gray-600 mb-2">
            Giao dịch cho hộ <strong>{transaction?.household.name}</strong>
          </p>
          <p className="text-gray-600 mb-6">đã được giải ngân.</p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-600">
              {formatNumberWithComma(amounts.total).replace(/,/g, '.')} đ
            </p>
            <p className="text-green-600 text-sm mt-1">Đã xác nhận chi trả</p>
          </div>
        </div>
      </div>
    );
  }

  // Already Disbursed Screen
  if (alreadyDisbursed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-amber-600 mb-4">Đã giải ngân trước đó</h1>
          <p className="text-gray-600 mb-6">
            Giao dịch cho hộ <strong>{transaction?.household.name}</strong> đã được giải ngân trước đó.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-700">
              Dự án: {project?.name || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Confirm Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
      {/* Header */}
      <div className="pt-12 pb-8 px-4 text-center text-white">
        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold">Xác nhận chi trả</h1>
        <p className="text-white/80 mt-1">Quét QR từ phiếu chi</p>
      </div>

      {/* Content Card */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Household Info */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hộ dân</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{transaction?.household.name}</p>
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dự án</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{project?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">Mã: {project?.code || transaction?.projectId}</p>
              </div>
            </div>
          </div>

          {/* Amount Details */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-sm font-bold text-green-700 uppercase tracking-wide">Chi tiết số tiền</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tiền gốc:</span>
                <span className="font-bold text-gray-900">
                  {formatNumberWithComma(amounts.principal).replace(/,/g, '.')} đ
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Lãi phát sinh:</span>
                <span className="font-bold text-red-500">
                  +{formatNumberWithComma(amounts.interest).replace(/,/g, '.')} đ
                </span>
              </div>
              {amounts.supplementary !== 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tiền bổ sung:</span>
                  <span className={`font-bold ${amounts.supplementary > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {amounts.supplementary > 0 ? '+' : ''}{formatNumberWithComma(amounts.supplementary).replace(/,/g, '.')} đ
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-green-700">TỔNG CHI TRẢ:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatNumberWithComma(amounts.total).replace(/,/g, '.')} đ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmer Info */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Người xác nhận chi trả</p>
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <p className="font-medium text-gray-900">{currentUser?.name || 'N/A'}</p>
            </div>
          </div>

          {/* Confirm Button */}
          <div className="p-5">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-lg hover:bg-green-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle className="w-6 h-6" />
                  Xác nhận giải ngân
                </>
              )}
            </button>
            <p className="text-center text-gray-500 text-sm mt-3">
              Nhấn xác nhận để hoàn tất chi trả cho hộ dân
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
