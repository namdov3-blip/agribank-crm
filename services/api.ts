/**
 * API Service Layer
 * Handles all HTTP requests to backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type { User, Project, Transaction, BankAccount } from '../types';

// Base URL của backend
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance với default config
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor: Tự động thêm JWT token vào header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Xử lý lỗi global
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


// ============= DATA TRANSFORMATION =============


/**
 * Transform backend transaction data to frontend expected format
 * Backend returns flat structure, frontend expects nested compensation object
 */
const transformTransaction = (backendTx: any): Transaction => {
  return {
    id: backendTx.id,
    projectId: backendTx.projectId,
    household: {
      id: backendTx.household?.householdId || backendTx.householdId || '',
      name: backendTx.household?.name || '',
      cccd: backendTx.household?.cccd || '',
      address: backendTx.household?.address || '',
      landOrigin: backendTx.household?.landOrigin || '',
      landArea: backendTx.household?.landArea || 0,
      decisionNumber: backendTx.household?.decisionNumber || '',
      decisionDate: backendTx.household?.decisionDate || '',
    },
    compensation: {
      landAmount: backendTx.landAmount || 0,
      assetAmount: backendTx.assetAmount || 0,
      houseAmount: backendTx.houseAmount || 0,
      supportAmount: backendTx.supportAmount || 0,
      totalApproved: backendTx.totalApproved || 0,
    },
    status: backendTx.status === 'PENDING' ? 'Chưa giải ngân'
          : backendTx.status === 'DISBURSED' ? 'Đã giải ngân'
          : backendTx.status === 'HOLD' ? 'Tồn đọng/Giữ hộ'
          : backendTx.status,
    disbursementDate: backendTx.disbursementDate,
    effectiveInterestDate: backendTx.effectiveInterestDate,
    notes: backendTx.notes,
    history: backendTx.history?.map((h: any) => ({
      timestamp: h.timestamp,
      action: h.action,
      details: h.details,
      totalAmount: h.totalAmount,
      actor: h.actorName,
    })) || [],
    supplementaryAmount: backendTx.supplementaryAmount || 0,
    supplementaryNote: backendTx.supplementaryNote,
    metadata: backendTx.metadata,
  };
};

/**
 * Transform array of transactions
 */
/**
 * Convert frontend Vietnamese status to backend English status
 */
const statusToBackend = (status: string): string => {
  if (status === "Chưa giải ngân") return "PENDING";
  if (status === "Đã giải ngân") return "DISBURSED";
  if (status === "Tồn đọng/Giữ hộ") return "HOLD";
  return status; // Already English or unknown
};


/**
 * Transform bank transaction from backend to frontend format
 * Backend uses transactionDate, frontend uses date
 */
const transformBankTransaction = (tx: any) => ({
  id: tx.id,
  type: tx.type === 'DEPOSIT' ? 'Nạp tiền' : tx.type === 'WITHDRAW' ? 'Rút tiền' : tx.type,
  amount: tx.amount,
  date: tx.transactionDate || tx.date,
  note: tx.note || '',
  createdBy: tx.createdBy?.fullName || tx.createdById || '',
  runningBalance: tx.runningBalance
});

const transformTransactions = (backendTxs: any[]): Transaction[] => {
  return backendTxs.map(transformTransaction);
};


// ============= AUTHENTICATION =============
export const authAPI = {
  /**
   * Login với username và password
   */
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', { username, password });
    const { token, user } = response.data;

    // Lưu token và user info vào localStorage
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));

    return { token, user };
  },

  /**
   * Logout
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
  },

  /**
   * Get current user info
   */
  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },
};

// ============= PROJECTS =============

export const projectsAPI = {
  /**
   * Get all projects
   */
  getAll: async (): Promise<Project[]> => {
    const response = await apiClient.get('/projects');
    return response.data.data;
  },

  /**
   * Get single project by ID
   */
  getById: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data.data;
  },

  /**
   * Create new project
   */
  create: async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await apiClient.post('/projects', projectData);
    return response.data.data;
  },

  /**
   * Update project
   */
  update: async (id: string, projectData: Partial<Project>) => {
    const response = await apiClient.put(`/projects/${id}`, projectData);
    return response.data.data;
  },

  /**
   * Delete project
   */
  delete: async (id: string) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data.data;
  },
};

// ============= TRANSACTIONS =============

export const transactionsAPI = {
  /**
   * Get all transactions (with filters)
   */
  getAll: async (filters?: {
    projectId?: string;
    status?: string;
    search?: string;
  }): Promise<Transaction[]> => {
    const response = await apiClient.get('/transactions', { params: filters });
    return transformTransactions(response.data.data);
  },

  /**
   * Get single transaction by ID
   */
  getById: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get(`/transactions/${id}`);
    return transformTransaction(response.data.data);
  },

  /**
   * Update transaction details
   */
  update: async (id: string, data: Partial<Transaction>) => {
    const response = await apiClient.put(`/transactions/${id}`, data);
    return transformTransaction(response.data.data);
  },

  /**
   * Change transaction status (PENDING → DISBURSED)
   */
  changeStatus: async (id: string, status: string, disbursementDate?: string) => {
    const response = await apiClient.patch(`/transactions/${id}/status`, {
      status: statusToBackend(status),
      disbursementDate,
    });
    return transformTransaction(response.data.data);
  },

  /**
   * Refund transaction (DISBURSED → HOLD)
   */
  refund: async (id: string, refundedAmount: number) => {
    const response = await apiClient.post(`/transactions/${id}/refund`, { refundedAmount });
    return transformTransaction(response.data.data);
  },

  /**
   * Add supplementary amount
   */
  addSupplementary: async (id: string, amount: number, note: string) => {
    const response = await apiClient.post(`/transactions/${id}/supplementary`, {
      amount,
      note,
    });
    return transformTransaction(response.data.data);
  },
};

// ============= EXCEL UPLOAD =============

export const uploadAPI = {
  /**
   * Upload Excel file và preview data
   */
  uploadExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/upload/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Confirm import data vào database
   */
  confirmImport: async (data: {
    projectData: {
      code: string;
      name: string;
      location: string;
      totalBudget: number;
      startDate: string;
      uploadDate: string;
      interestStartDate: string;
      status: string;
    };
    transactionsData: Array<{
      householdId: string;
      name: string;
      cccd: string;
      address: string;
      landOrigin: string;
      landArea?: number;
      decisionNumber: string;
      decisionDate: string;
      amount: number;
    }>;
  }) => {
    const response = await apiClient.post('/upload/confirm', data);
    return response.data.data;
  },
};

// ============= BANK =============

export const bankAPI = {
  /**
   * Get bank account info
   */
  getAccount: async (): Promise<BankAccount> => {
    const response = await apiClient.get('/bank/account');
    return response.data.data;
  },

  /**
   * Get bank transaction history
   */
  getTransactions: async (filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
  }) => {
    const response = await apiClient.get('/bank/transactions', { params: filters });
    return response.data.data.map(transformBankTransaction);
  },

  /**
   * Create manual bank transaction
   */
  createTransaction: async (data: {
    type: 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT';
    amount: number;
    note: string;
    transactionDate?: string;
  }) => {
    const response = await apiClient.post('/bank/transactions', data);
    return response.data.data;
  },

  /**
   * Adjust opening balance
   */
  adjustOpeningBalance: async (newBalance: number, note: string) => {
    const response = await apiClient.patch('/bank/account/opening-balance', {
      openingBalance: newBalance,
      note,
    });
    return response.data.data;
  },
};

// ============= USERS (Admin only) =============

export const usersAPI = {
  /**
   * Get all users
   */
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get('/users');
    return response.data.data;
  },

  /**
   * Create new user
   */
  create: async (userData: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    role: string;
    permissions: string[];
  }) => {
    const response = await apiClient.post('/users', userData);
    return response.data.data;
  },

  /**
   * Update user
   */
  // NOTE: Backend expects DTO với các trường của bảng users (fullName, role, permissions, email, isActive,...)
  // Không nên dùng type User của frontend (name, avatar, ...) cho request body.
  update: async (
    id: string,
    userData: {
      fullName?: string;
      role?: string;
      permissions?: string[];
      email?: string;
      isActive?: boolean;
    }
  ) => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data.data;
  },

  /**
   * Delete user
   */
  delete: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data.data;
  },
};

// ============= ADMIN =============

export const adminAPI = {
  /**
   * Get audit logs
   */
  getAuditLogs: async (filters?: {
    startDate?: string;
    endDate?: string;
    action?: string;
  }) => {
    const response = await apiClient.get('/admin/audit-logs', { params: filters });
    return response.data.data;
  },

  /**
   * Get current interest rate
   */
  getInterestRate: async () => {
    const response = await apiClient.get('/admin/interest-rate');
    return response.data.data;
  },

  /**
   * Update interest rate
   */
  updateInterestRate: async (rate: number, effectiveFrom: string, note: string) => {
    const response = await apiClient.put('/admin/interest-rate', {
      annualRate: rate,
      effectiveFrom,
      note,
    });
    return response.data.data;
  },

  /**
   * Get interest rate history
   */
  getInterestHistory: async () => {
    const response = await apiClient.get('/admin/interest-history');
    return response.data.data;
  },

  /**
   * Get system statistics
   */
  getStats: async () => {
    const response = await apiClient.get('/admin/stats');
    return response.data.data;
  },
};

// Export default để dùng như api.projects.getAll()
export default {
  auth: authAPI,
  projects: projectsAPI,
  transactions: transactionsAPI,
  upload: uploadAPI,
  bank: bankAPI,
  users: usersAPI,
  admin: adminAPI,
};
