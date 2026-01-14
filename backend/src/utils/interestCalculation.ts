/**
 * Interest Calculation Utilities
 *
 * IMPORTANT: This logic MUST match the frontend calculation exactly!
 * Copied from: frontend/utils/helpers.ts
 */

/**
 * Calculate daily compound interest
 *
 * Formula: Principal × (Annual Rate / 365) × Days
 *
 * Rules:
 * - Days are counted from baseDate (00:00) to endDate (00:00)
 * - Each midnight crossed = 1 day of interest
 * - Example: baseDate=11/01, endDate=13/01 → 2 days (nights 11-12, 12-13)
 * - If endDate <= baseDate, interest = 0
 *
 * @param principal - Principal amount (VND)
 * @param ratePerYear - Annual interest rate (e.g., 6.5 for 6.5%)
 * @param baseDateStr - Start date for interest calculation (ISO string or Date)
 * @param endDate - End date for interest calculation (defaults to today)
 * @returns Interest amount (rounded to nearest VND)
 */
export const calculateInterest = (
  principal: number,
  ratePerYear: number,
  baseDateStr?: string | Date,
  endDate: Date = new Date()
): number => {
  if (!baseDateStr) return 0;

  // Parse and normalize dates to midnight (00:00:00)
  const baseDate = new Date(baseDateStr);
  baseDate.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Calculate days difference
  const timeDiff = end.getTime() - baseDate.getTime();
  const days = Math.floor(timeDiff / (1000 * 3600 * 24));

  // No interest if end date is before or equal to base date
  if (days <= 0) return 0;

  // Calculate interest: Principal × (Rate / 365) × Days
  const dailyRate = (ratePerYear / 100) / 365;
  const interest = principal * dailyRate * days;

  return Math.round(interest);
};

/**
 * Calculate interest for a transaction based on its status
 *
 * @param transaction - Transaction data
 * @param annualRate - Current annual interest rate
 * @param projectInterestStartDate - Project's default interest start date
 * @returns Interest amount
 */
export const calculateTransactionInterest = (
  transaction: {
    totalApproved: number | bigint;
    status: string;
    disbursementDate?: Date | string | null;
    effectiveInterestDate?: Date | string | null;
  },
  annualRate: number,
  projectInterestStartDate?: Date | string
): number => {
  const principal = Number(transaction.totalApproved);

  // Determine the base date for interest calculation
  // Priority: transaction.effectiveInterestDate > projectInterestStartDate
  const baseDate = transaction.effectiveInterestDate || projectInterestStartDate;

  if (!baseDate) return 0;

  // For DISBURSED transactions: freeze interest at disbursement date
  if (transaction.status === 'DISBURSED' && transaction.disbursementDate) {
    return calculateInterest(
      principal,
      annualRate,
      baseDate,
      new Date(transaction.disbursementDate)
    );
  }

  // For PENDING/HOLD transactions: calculate interest up to today (provisional)
  if (transaction.status === 'PENDING' || transaction.status === 'HOLD') {
    return calculateInterest(
      principal,
      annualRate,
      baseDate,
      new Date()
    );
  }

  return 0;
};

/**
 * Format currency to Vietnamese format
 *
 * @param amount - Amount in VND
 * @returns Formatted string (e.g., "1.000.000 ₫")
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

/**
 * Format date to dd/mm/yyyy
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Calculate days between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days
 */
export const calculateDaysBetween = (
  startDate: Date | string,
  endDate: Date | string
): number => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const timeDiff = end.getTime() - start.getTime();
  return Math.floor(timeDiff / (1000 * 3600 * 24));
};
