import React from 'react';
import { Transaction, Project } from '../types';
import { formatDate, formatCurrencyToWords, formatNumberWithComma, calculateInterest } from '../utils/helpers';
import { X, Printer } from 'lucide-react';

interface PaymentSlipPreviewProps {
  transaction: Transaction;
  project?: Project;
  interestRate: number;
  interestStartDate?: string;
  organizationName?: string;
  currentUser?: { name: string };
  onClose: () => void;
  onPrint: () => void;
}

export const PaymentSlipPreview: React.FC<PaymentSlipPreviewProps> = ({
  transaction,
  project,
  interestRate,
  interestStartDate,
  organizationName = 'Đông Anh',
  currentUser,
  onClose,
  onPrint
}) => {
  // Tính lãi
  const baseDate = transaction.effectiveInterestDate || interestStartDate;
  let interest = 0;

  if (transaction.status === 'Đã giải ngân' && transaction.disbursementDate) {
    const calcEndDate = new Date(transaction.disbursementDate);
    interest = calculateInterest(transaction.compensation.totalApproved, interestRate, baseDate, calcEndDate);
  } else if (transaction.status !== 'Đã giải ngân') {
    interest = calculateInterest(transaction.compensation.totalApproved, interestRate, baseDate, new Date());
  }

  const supplementary = transaction.supplementaryAmount || 0;
  const totalAmount = transaction.compensation.totalApproved + interest + supplementary;

  // Generate QR Code - sử dụng Vercel API route
  const qrData = `https://agribank-management.vercel.app/confirm?tx=${transaction.id}`;
  // Sử dụng Vercel API endpoint để generate QR (fallback qrserver.com nếu cần)
  const qrUrl = `https://agribank-management.vercel.app/api/qr/${transaction.id}`;

  // Format date cho phiếu chi
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const formattedDateVN = `Ngày ${day} tháng ${month} năm ${year}`;

  // Loại hình trả từ metadata
  const loaiHinhTra = transaction.metadata?.loaiChiTra || 'hỗ trợ GPMB';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Phiếu Chi - ${transaction.household.name}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 20mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 13pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
          }
          .container {
            width: 100%;
          }
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .org-box {
            border: 1px solid #000;
            padding: 8px 12px;
          }
          .org-box p {
            margin: 2px 0;
            font-size: 12pt;
          }
          .org-name {
            font-weight: bold;
            text-decoration: underline;
          }
          .org-dept {
            font-weight: bold;
          }
          .org-addr {
            text-decoration: underline;
            font-size: 11pt;
          }
          .template-code {
            font-weight: bold;
            font-size: 12pt;
          }
          /* Title Section - Full width with flex */
          .title-section {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
            width: 100%;
          }
          .title-wrapper {
            display: flex;
            width: 100%;
            max-width: 500px;
          }
          .title-box {
            border: 2px solid #1e40af;
            padding: 15px 25px;
            text-align: center;
            flex: 1;
          }
          .title-box h1 {
            font-size: 22pt;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
            letter-spacing: 3px;
          }
          .title-box .date-line {
            font-style: italic;
            font-size: 12pt;
            color: #1e40af;
            margin: 3px 0;
          }
          .quyen-box {
            border: 2px solid #1e40af;
            border-left: none;
            padding: 12px 18px;
            font-size: 12pt;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 130px;
          }
          .quyen-box p {
            margin: 3px 0;
          }
          .quyen-box .amount {
            color: #dc2626;
            font-weight: bold;
          }
          /* Content */
          .content {
            margin: 20px 0;
          }
          .content p {
            margin: 10px 0;
            font-size: 13pt;
            line-height: 1.6;
          }
          .field-value {
            text-decoration: underline;
          }
          .amount-bold {
            font-weight: bold;
          }
          .italic {
            font-style: italic;
          }
          /* Divider */
          .divider {
            border-top: 1px solid #000;
            margin: 20px 0;
          }
          /* Received */
          .received {
            margin: 20px 0;
          }
          .received p {
            margin: 6px 0;
            font-size: 13pt;
          }
          .received .title {
            font-weight: bold;
          }
          /* Signature Section */
          .signature-wrapper {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 30px;
          }
          .signature-cols {
            display: flex;
            flex: 1;
            justify-content: space-between;
            padding-right: 30px;
          }
          .sig-col {
            text-align: center;
            min-width: 100px;
          }
          .sig-col .sig-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 3px;
          }
          .sig-col .sig-note {
            font-style: italic;
            font-size: 11pt;
          }
          .sig-col .sig-name {
            margin-top: 55px;
            font-weight: bold;
            font-size: 12pt;
          }
          .sig-col .sig-date {
            font-style: italic;
            font-size: 11pt;
            margin-bottom: 3px;
          }
          /* QR Section */
          .qr-section {
            text-align: center;
          }
          .qr-section img {
            width: 110px;
            height: 110px;
          }
          .qr-section .qr-label {
            font-size: 10pt;
            color: #1e40af;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="org-box">
              <p class="org-name">UBND xã ${organizationName}</p>
              <p class="org-dept">Ban quản lý Dự án đầu tư – hạ tầng</p>
              <p class="org-addr">Số 68 đường Cao Lỗ, xã ${organizationName}, Hà Nội</p>
            </div>
            <div class="template-code">Mẫu số C41 - BB</div>
          </div>

          <!-- Title Section -->
          <div class="title-section">
            <div class="title-wrapper">
              <div class="title-box">
                <h1>PHIẾU CHI</h1>
                <p class="date-line">${formattedDateVN}</p>
                <p class="date-line">Số:.......</p>
              </div>
              <div class="quyen-box">
                <p>Quyển số:</p>
                <p>Nợ: <span class="amount">${formatNumberWithComma(totalAmount).replace(/,/g, '.')}</span></p>
                <p>Có: <span class="amount">${formatNumberWithComma(totalAmount).replace(/,/g, '.')}</span></p>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="content">
            <p>Họ và tên người nhận tiền: <span class="field-value">${transaction.household.name || ''}</span></p>
            <p>Địa chỉ: <span class="field-value">${transaction.household.address || 'Chưa xác định'}</span></p>
            <p>Nội dung: Chi trả tiền bồi thường, ${loaiHinhTra} theo quyết định số ${transaction.household.decisionNumber || ''} ngày ${formatDate(transaction.household.decisionDate)}</p>
            <p style="margin-left: 60px;">thuộc dự án: ${project?.name || 'N/A'} (Mã dự án: ${project?.code || transaction.projectId})</p>
            <p>Số tiền: <span class="amount-bold">${formatNumberWithComma(totalAmount).replace(/,/g, '.')} đồng</span></p>
            <p class="italic">(Viết bằng chữ): <em>${formatCurrencyToWords(totalAmount)} ./.</em></p>
            <p>Kèm theo: Chứng từ liên quan</p>
          </div>

          <!-- Divider -->
          <div class="divider"></div>

          <!-- Received -->
          <div class="received">
            <p class="title">Đã nhận đủ số tiền</p>
            <p>- Bằng số: <span class="amount-bold">${formatNumberWithComma(totalAmount).replace(/,/g, '.')} đồng</span></p>
            <p>- Bằng chữ: ${formatCurrencyToWords(totalAmount)}</p>
          </div>

          <!-- Signature Section -->
          <div class="signature-wrapper">
            <div class="signature-cols">
              <div class="sig-col">
                <p class="sig-title">Người lập biểu</p>
                <p class="sig-note">(Ký, họ tên)</p>
                <p class="sig-name">${currentUser?.name || 'Quản trị viên'}</p>
              </div>
              <div class="sig-col">
                <p class="sig-title">Thủ quỹ</p>
                <p class="sig-note">(Ký, họ tên)</p>
              </div>
              <div class="sig-col">
                <p class="sig-date">${formattedDateVN}</p>
                <p class="sig-title">Người nhận tiền</p>
                <p class="sig-note">(Ký, họ tên)</p>
              </div>
            </div>
            <div class="qr-section">
              <img src="${qrUrl}" alt="QR Code" />
              <p class="qr-label">Quét để xác nhận</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for QR image to load then print
    const img = new Image();
    img.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
    img.onerror = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
    img.src = qrUrl;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-slate-300 shadow-2xl rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">Xem trước Phiếu chi</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Printer size={16} />
              In phiếu
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div
            className="bg-white mx-auto shadow-lg"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              width: '210mm',
              minHeight: '297mm',
              padding: '15mm 20mm',
              boxSizing: 'border-box'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ border: '1px solid #000', padding: '8px 12px' }}>
                <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: '2px 0', textDecoration: 'underline' }}>
                  UBND xã {organizationName}
                </p>
                <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: '2px 0' }}>
                  Ban quản lý Dự án đầu tư – hạ tầng
                </p>
                <p style={{ fontSize: '11pt', margin: '2px 0', textDecoration: 'underline' }}>
                  Số 68 đường Cao Lỗ, xã {organizationName}, Hà Nội
                </p>
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                Mẫu số C41 - BB
              </div>
            </div>

            {/* Title Section - Căn giữa và rộng hơn */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', width: '100%', maxWidth: '500px' }}>
                <div style={{
                  border: '2px solid #1e40af',
                  padding: '15px 25px',
                  textAlign: 'center',
                  flex: 1
                }}>
                  <h1 style={{ fontSize: '22pt', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', letterSpacing: '3px' }}>
                    PHIẾU CHI
                  </h1>
                  <p style={{ fontStyle: 'italic', fontSize: '12pt', color: '#1e40af', margin: '3px 0' }}>
                    {formattedDateVN}
                  </p>
                  <p style={{ fontStyle: 'italic', fontSize: '12pt', color: '#1e40af', margin: '3px 0' }}>
                    Số:.......
                  </p>
                </div>
                <div style={{
                  border: '2px solid #1e40af',
                  borderLeft: 'none',
                  padding: '12px 18px',
                  fontSize: '12pt',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minWidth: '130px'
                }}>
                  <p style={{ margin: '3px 0' }}>Quyển số:</p>
                  <p style={{ margin: '3px 0' }}>Nợ: <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatNumberWithComma(totalAmount).replace(/,/g, '.')}</span></p>
                  <p style={{ margin: '3px 0' }}>Có: <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatNumberWithComma(totalAmount).replace(/,/g, '.')}</span></p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ fontSize: '13pt', lineHeight: '1.6', margin: '20px 0' }}>
              <p style={{ margin: '10px 0' }}>
                Họ và tên người nhận tiền: <span style={{ textDecoration: 'underline' }}>{transaction.household.name || ''}</span>
              </p>
              <p style={{ margin: '10px 0' }}>
                Địa chỉ: <span style={{ textDecoration: 'underline' }}>{transaction.household.address || 'Chưa xác định'}</span>
              </p>
              <p style={{ margin: '10px 0' }}>
                Nội dung: Chi trả tiền bồi thường, {loaiHinhTra} theo quyết định số {transaction.household.decisionNumber || ''} ngày {formatDate(transaction.household.decisionDate)}
              </p>
              <p style={{ margin: '5px 0', marginLeft: '60px' }}>
                thuộc dự án: {project?.name || 'N/A'} (Mã dự án: {project?.code || transaction.projectId})
              </p>
              <p style={{ margin: '10px 0' }}>
                Số tiền: <strong>{formatNumberWithComma(totalAmount).replace(/,/g, '.')} đồng</strong>
              </p>
              <p style={{ margin: '10px 0', fontStyle: 'italic' }}>
                (Viết bằng chữ): <em>{formatCurrencyToWords(totalAmount)} ./.</em>
              </p>
              <p style={{ margin: '10px 0' }}>
                Kèm theo: Chứng từ liên quan
              </p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #000', margin: '20px 0' }}></div>

            {/* Received Section */}
            <div style={{ fontSize: '13pt', lineHeight: '1.6', margin: '20px 0' }}>
              <p style={{ fontWeight: 'bold', margin: '6px 0' }}>Đã nhận đủ số tiền</p>
              <p style={{ margin: '6px 0' }}>
                - Bằng số: <strong>{formatNumberWithComma(totalAmount).replace(/,/g, '.')} đồng</strong>
              </p>
              <p style={{ margin: '6px 0' }}>
                - Bằng chữ: {formatCurrencyToWords(totalAmount)}
              </p>
            </div>

            {/* Signature Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginTop: '30px'
            }}>
              {/* Left side: 3 signature columns */}
              <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', paddingRight: '30px' }}>
                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '3px' }}>Người lập biểu</p>
                  <p style={{ fontStyle: 'italic', fontSize: '11pt' }}>(Ký, họ tên)</p>
                  <p style={{ marginTop: '55px', fontWeight: 'bold', fontSize: '12pt' }}>{currentUser?.name || 'Quản trị viên'}</p>
                </div>
                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '3px' }}>Thủ quỹ</p>
                  <p style={{ fontStyle: 'italic', fontSize: '11pt' }}>(Ký, họ tên)</p>
                </div>
                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                  <p style={{ fontStyle: 'italic', fontSize: '11pt', marginBottom: '3px' }}>{formattedDateVN}</p>
                  <p style={{ fontWeight: 'bold', fontSize: '12pt', marginBottom: '3px' }}>Người nhận tiền</p>
                  <p style={{ fontStyle: 'italic', fontSize: '11pt' }}>(Ký, họ tên)</p>
                </div>
              </div>

              {/* Right side: QR Code */}
              <div style={{ textAlign: 'center' }}>
                <a href={qrData} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <img
                    src={qrUrl}
                    alt="QR Code"
                    style={{ width: '110px', height: '110px' }}
                  />
                  <p style={{ fontSize: '10pt', color: '#1e40af', marginTop: '5px' }}>
                    Quét để xác nhận
                  </p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
