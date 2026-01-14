
import React from 'react';
import { TransactionStatus } from '../types';

interface StatusBadgeProps {
  status: TransactionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let symbol = '';
  let styles = '';
  let label = '';

  switch (status) {
    case TransactionStatus.DISBURSED:
      // Đã giải ngân = dấu tích xanh (không bo tròn)
      symbol = '✓';
      styles = 'text-emerald-700 font-bold';
      label = TransactionStatus.DISBURSED;
      break;
    case TransactionStatus.PENDING:
      // Chưa giải ngân = dấu X đỏ (không bo tròn)
      symbol = '✗';
      styles = 'text-red-600 font-bold';
      label = TransactionStatus.PENDING;
      break;
    case TransactionStatus.HOLD:
      // Tồn đọng / tính lãi = chỉ 1 hình tròn cam (không có chấm)
      symbol = '○';
      styles = 'text-orange-500 text-lg';
      label = TransactionStatus.HOLD;
      break;
    default:
      symbol = '●';
      styles = 'text-gray-600';
      label = String(status);
  }

  return (
    <span
      className={`inline-flex items-center justify-center text-sm ${styles}`}
      title={label}
      aria-label={label}
    >
      {symbol}
    </span>
  );
};
