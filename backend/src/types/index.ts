// Shared Types for Backend
// These match the frontend types for consistency

import { Request } from 'express';

// ============================================
// AUTH TYPES
// ============================================

export interface AuthUser {
  id: string;
  organizationId: string;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// EXCEL UPLOAD TYPES
// ============================================

export interface ExcelRowData {
  spa: string;                    // SPA
  sttDS: string;                  // STT DS
  name: string;                   // Họ và tên chủ sử dụng đất
  soQD: string;                   // Số QĐ
  ngay: string;                   // Ngày
  quyetDinh: string;              // Quyết định
  tenDuAn: string;                // Tên dự án
  maDuAn: string;                 // Mã dự án
  loaiChiTra: string;             // Loại Chi Trả
  maHoDan: string;                // Mã Hộ Dân
  tongSoTien: number;             // Tổng số tiền bồi thường, hỗ trợ phê duyệt (đồng)

  // Keep legacy fields for backward compatibility
  stt?: number;
  cccd?: string;
  maHo?: string;
  qd?: string;
  date?: string;
  projectCode?: string;
  amount?: number;
}

export interface ExcelUploadPreview {
  rowCount: number;
  totalAmount: number;
  data: ExcelRowData[];
}

export interface ProjectImportData {
  code: string;
  name: string;
  location: string;
  totalBudget: number;
  startDate: string;
  interestStartDate: string;
}

export interface TransactionImportData {
  householdId: string;
  name: string;
  cccd: string;
  address: string;
  landOrigin: string;
  decisionNumber: string;
  decisionDate: string;
  amount: number;
}

// ============================================
// INTEREST CALCULATION TYPES
// ============================================

export interface InterestCalculationInput {
  principal: number;
  annualRate: number;
  startDate: Date | string;
  endDate: Date | string;
}

export interface InterestCalculationResult {
  principal: number;
  interest: number;
  totalAmount: number;
  days: number;
  annualRate: number;
}

// ============================================
// BANK BALANCE BREAKDOWN
// ============================================

export interface BankBalanceBreakdown {
  principal: number;          // Tổng gốc chưa giải ngân
  provisionalInterest: number; // Lãi tạm tính
  lockedInterest: number;     // Lãi đã chốt
  supplementary: number;      // Tiền bổ sung
  totalPending: number;       // Tổng tiền chưa giải ngân
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface DashboardStats {
  totalProjects: number;
  totalHouseholds: number;
  disbursedCount: number;
  disbursedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  totalInterest: number;
  bankBalance: {
    current: number;
    reconciled: number;
    breakdown: BankBalanceBreakdown;
  };
}
