/**
 * Excel File Parser Service
 *
 * Parses Excel files uploaded by users and converts them to structured data
 */

import xlsx from 'xlsx';
import { ExcelRowData } from '../types';

/**
 * Convert Excel serial date number to JavaScript Date
 * Excel dates are stored as numbers (days since 1900-01-01)
 */
const excelDateToJSDate = (serial: number): Date => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
const formatDateToISO = (value: any): string => {
  if (!value) return new Date().toISOString().split('T')[0];

  // If it's a number, it's an Excel serial date
  if (typeof value === 'number') {
    try {
      const date = excelDateToJSDate(value);
      return date.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  }

  // If it's already a string, return as is
  return String(value);
};

/**
 * Parse Excel file buffer and extract transaction data
 *
 * @param buffer - File buffer from multer
 * @returns Array of parsed row data
 */
export const parseExcelFile = (buffer: Buffer): ExcelRowData[] => {
  try {
    // Read workbook from buffer
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to array of arrays (to handle merged cells)
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // DEBUG: Print structure
    console.log('📋 Total rows detected:', rawData.length);
    if (rawData.length > 5) {
      console.log('📄 Row 1 (header 1):', rawData[0]);
      console.log('📄 Row 2 (header 2):', rawData[1]);
      console.log('📄 Row 3 (header 3):', rawData[2]);
      console.log('📄 Row 4 (header 4 - formulas):', rawData[3]);
      console.log('📄 Row 5 (first real data):', rawData[4]);
    }

    // Skip header rows (first 4 rows are headers with merged cells and formula references)
    // Start from row index 4 (5th row) which is actual data
    const dataRows = rawData.slice(4) as any[][];

    // Parse and validate rows (using column index due to merged cells)
    const parsedData: ExcelRowData[] = dataRows
      .filter((row: any[]) => row && row.length > 0 && row[2]) // Filter out empty rows
      .map((row: any[], index) => {
        // DEBUG: Print first data row to understand structure
        if (index === 0) {
          console.log('🔍 First data row structure:');
          row.forEach((cell, idx) => {
            if (cell !== undefined && cell !== null && cell !== '') {
              console.log(`  Column ${idx}: "${cell}"`);
            }
          });
        }
        // Column mapping based on actual Excel data structure:
        // Column 0: SPA
        // Column 1: STT DS
        // Column 2: Họ và tên chủ sử dụng đất
        // Column 5: Số QĐ
        // Column 6: Ngày
        // Column 7: Tên dự án
        // Column 8: Mã dự án
        // Column 9: Loại Chi Trả
        // Column 10: Mã Hộ Dân
        // Column 23: Tổng số tiền bồi thường, hỗ trợ phê duyệt (đồng)

        // Parse amount: remove commas and spaces, but KEEP decimal point
        const rawAmount = parseFloat(String(row[23] || '0').replace(/[,\s]/g, '')) || 0;
        const tongSoTien = Math.round(rawAmount);

        // Verify rounding for problematic rows
        if (index === 205 || index === 210) {
          console.log(`✅ Row ${index + 1}: Raw=${rawAmount}, Rounded=${tongSoTien}`);
        }

        return {
          // New format fields (by column index)
          spa: String(row[0] || ''),
          sttDS: String(row[1] || index + 1),
          name: String(row[2] || '').trim(),
          soQD: String(row[5] || ''),
          ngay: formatDateToISO(row[6]),
          quyetDinh: '',
          tenDuAn: String(row[7] || ''),
          maDuAn: String(row[8] || ''),
          loaiChiTra: String(row[9] || ''),
          maHoDan: String(row[10] || ''),
          tongSoTien: tongSoTien,

          // Legacy fields for backward compatibility
          stt: index + 1,
          cccd: '',
          maHo: String(row[10] || ''),
          qd: String(row[5] || ''),
          date: formatDateToISO(row[6]),
          projectCode: String(row[8] || ''),
          amount: tongSoTien
        };
      });

    return parsedData;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error('Failed to parse Excel file. Please check file format.');
  }
};

/**
 * Validate parsed Excel data
 *
 * @param data - Parsed Excel row data
 * @returns Array of validation error messages
 */
export const validateExcelData = (data: ExcelRowData[]): string[] => {
  const errors: string[] = [];

  if (data.length === 0) {
    errors.push('File không chứa dữ liệu');
    return errors;
  }

  data.forEach((row, index) => {
    const rowNumber = index + 1;

    // Validate name (required)
    if (!row.name || row.name.trim() === '') {
      errors.push(`Dòng ${rowNumber}: Thiếu họ và tên chủ sử dụng đất`);
    }

    // Validate amount (required and must be > 0)
    const amount = row.tongSoTien || row.amount || 0;
    if (!amount || amount <= 0) {
      errors.push(`Dòng ${rowNumber}: Tổng số tiền không hợp lệ (${amount})`);
    }

    // Validate household code (required)
    const maHoDan = row.maHoDan || row.maHo || '';
    if (!maHoDan || maHoDan.trim() === '') {
      errors.push(`Dòng ${rowNumber}: Thiếu mã hộ dân`);
    }

    // Validate project code (required)
    const maDuAn = row.maDuAn || row.projectCode || '';
    if (!maDuAn || maDuAn.trim() === '') {
      errors.push(`Dòng ${rowNumber}: Thiếu mã dự án`);
    }

    // Note: Số QĐ validation removed - not always required in this template
  });

  return errors;
};

/**
 * Calculate total amount from Excel data
 *
 * @param data - Parsed Excel row data
 * @returns Total amount
 */
export const calculateTotalAmount = (data: ExcelRowData[]): number => {
  return data.reduce((sum, row) => sum + (row.tongSoTien || row.amount || 0), 0);
};

/**
 * Extract unique project codes from Excel data
 *
 * @param data - Parsed Excel row data
 * @returns Array of unique project codes
 */
export const extractProjectCodes = (data: ExcelRowData[]): string[] => {
  const codes = data.map(row => row.projectCode).filter(code => code && code.trim() !== '');
  return Array.from(new Set(codes));
};

/**
 * Group Excel data by project code
 *
 * @param data - Parsed Excel row data
 * @returns Map of project code to rows
 */
export const groupByProjectCode = (data: ExcelRowData[]): Map<string, ExcelRowData[]> => {
  const grouped = new Map<string, ExcelRowData[]>();

  data.forEach(row => {
    const code = row.projectCode || 'UNKNOWN';

    if (!grouped.has(code)) {
      grouped.set(code, []);
    }

    grouped.get(code)!.push(row);
  });

  return grouped;
};

/**
 * Sample Excel data for testing (matches frontend hardcoded data)
 */
export const getSampleExcelData = (): ExcelRowData[] => {
  return [
    { stt: 1, name: "Vũ Văn Giản", cccd: "342432423423", maHo: "8045678-123QD-3423", qd: "123/QĐ-UBND", date: "01/12/2025", projectCode: "8045678", amount: 531695000 },
    { stt: 2, name: "Hoàng Công Dũng", cccd: "342432423423", maHo: "8045678-123QD-3423", qd: "123/QĐ-UBND", date: "02/12/2025", projectCode: "8045678", amount: 310177100 },
    { stt: 3, name: "Nguyễn Văn Hùng", cccd: "342432423423", maHo: "8045678-123QD-3424", qd: "123/QĐ-UBND", date: "03/12/2025", projectCode: "8045678", amount: 528815000 },
    // ... (add more if needed for testing)
  ];
};
