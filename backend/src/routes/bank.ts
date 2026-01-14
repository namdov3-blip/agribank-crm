/**
 * Bank Routes
 * GET  /api/bank/account - Get bank account info
 * POST /api/bank/transactions - Create manual bank transaction
 * GET  /api/bank/transactions - Get bank transaction history
 * PATCH /api/bank/account/opening-balance - Adjust opening balance
 */

import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate, createBankTransactionSchema, adjustOpeningBalanceSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { convertBigIntsToNumbers } from '../utils/helpers';

const router = express.Router();
const prisma = new PrismaClient();

// GET bank account
router.get(
  '/account',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const account = await prisma.bankAccount.findUnique({
      where: { organizationId: req.user!.organizationId }
    });

    if (!account) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    // Trả về số dư thực tế từ DB
    // currentBalance được cập nhật chính xác qua các thao tác:
    // - Import dự án: +totalBudget (qua upload/confirm)
    // - Giải ngân: -amount (qua transactions/:id/status)
    // - Nạp tiền thủ công: +amount (qua bank/transactions)
    // - Rút tiền thủ công: -amount (qua bank/transactions)
    // - Bổ sung tiền: +amount (qua transactions/:id/supplementary)
    // - Hoàn quỹ: +amount (qua transactions/:id/refund)
    const accountData = convertBigIntsToNumbers(account);

    res.json({ success: true, data: accountData });
  })
);

// GET bank transactions
router.get(
  '/transactions',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const transactions = await prisma.bankTransaction.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { transactionDate: 'asc' }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(transactions) });
  })
);

// POST create manual bank transaction
router.post(
  '/transactions',
  authenticate,
  validate(createBankTransactionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, amount, note, transactionDate } = req.body;

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { organizationId: req.user!.organizationId }
    });

    if (!bankAccount) {
      res.status(404).json({ error: 'Bank account not found' });
      return;
    }

    const finalAmount = type === 'WITHDRAW' ? -amount : amount;
    const newBalance = Number(bankAccount.currentBalance) + finalAmount;

    await prisma.$transaction(async (tx) => {
      await tx.bankTransaction.create({
        data: {
          organizationId: req.user!.organizationId,
          bankAccountId: bankAccount.id,
          type,
          amount: BigInt(finalAmount),
          note: note || '',
          runningBalance: BigInt(Math.round(newBalance)),
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          createdById: req.user!.id
        }
      });

      await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          currentBalance: BigInt(Math.round(newBalance)),
          reconciledBalance: type === 'ADJUSTMENT' ? BigInt(Math.round(newBalance)) : bankAccount.reconciledBalance
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: req.user!.organizationId,
          userId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
          action: type === 'DEPOSIT' ? 'Nạp tiền' : 'Rút tiền',
          target: 'Giao dịch dòng tiền',
          details: `${type === 'DEPOSIT' ? 'Nạp' : 'Rút'} ${Math.abs(finalAmount).toLocaleString('vi-VN')} VND${note ? ` - ${note}` : ''}`
        }
      });
    });

    res.json({ success: true, message: 'Bank transaction created' });
  })
);

// PATCH adjust opening balance
router.patch(
  '/account/opening-balance',
  authenticate,
  validate(adjustOpeningBalanceSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { openingBalance } = req.body;

    const account = await prisma.bankAccount.update({
      where: { organizationId: req.user!.organizationId },
      data: {
        openingBalance: BigInt(openingBalance),
        currentBalance: BigInt(openingBalance),
        reconciledBalance: BigInt(openingBalance)
      }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(account) });
  })
);

export default router;
