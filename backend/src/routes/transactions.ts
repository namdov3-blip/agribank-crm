/**
 * Transactions Routes
 * GET    /api/transactions - List transactions
 * GET    /api/transactions/:id - Get single transaction
 * PUT    /api/transactions/:id - Update transaction details
 * PATCH  /api/transactions/:id/status - Change status (PENDING → DISBURSED)
 * POST   /api/transactions/:id/refund - Refund transaction (DISBURSED → HOLD)
 * POST   /api/transactions/:id/supplementary - Add supplementary amount
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate, updateTransactionSchema, updateTransactionStatusSchema, addSupplementaryAmountSchema, refundTransactionSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { convertBigIntsToNumbers } from '../utils/helpers';
import { calculateTransactionInterest, formatCurrency } from '../utils/interestCalculation';
import { getOrganizationFilter } from '../utils/organizationHelper';

const router = express.Router();
const prisma = new PrismaClient();

// GET all transactions
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { search, status, projectId } = req.query;
    const orgFilter = await getOrganizationFilter(req.user!);

    const where: any = { ...orgFilter };

    if (search) {
      where.OR = [
        { household: { name: { contains: search as string, mode: 'insensitive' } } },
        { household: { cccd: { contains: search as string, mode: 'insensitive' } } },
        { id: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId as string;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        household: true,
        project: true,
        history: { orderBy: { timestamp: 'desc' } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(transactions) });
  })
);

// GET single transaction
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        ...orgFilter
      },
      include: {
        household: true,
        project: true,
        history: { orderBy: { timestamp: 'desc' } }
      }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    res.json({ success: true, data: convertBigIntsToNumbers(transaction) });
  })
);

// PUT update transaction details
router.put(
  '/:id',
  authenticate,
  validate(updateTransactionSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        ...orgFilter
      },
      include: { household: true }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    // Update household if provided
    if (req.body.household) {
      await prisma.household.update({
        where: { id: transaction.householdId },
        data: req.body.household
      });
    }

    // Update transaction
    const updated = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        notes: req.body.notes,
        history: {
          create: {
            action: 'Cập nhật thông tin',
            actorName: req.user!.fullName,
            actorRole: req.user!.role,
            details: 'Đã chỉnh sửa thông tin hồ sơ'
          }
        }
      },
      include: { household: true, project: true }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(updated) });
  })
);

// PATCH change status (PENDING → DISBURSED)
router.patch(
  '/:id/status',
  authenticate,
  validate(updateTransactionStatusSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { status } = req.body;
    const orgFilter = await getOrganizationFilter(req.user!);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        ...orgFilter
      },
      include: { project: true, household: true }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const now = new Date();

    // Calculate interest for DISBURSED status
    let totalAmount = Number(transaction.totalApproved);
    let interest = 0;

    if (status === 'DISBURSED' && transaction.status !== 'DISBURSED') {
      // Get current interest rate
      const interestSetting = await prisma.interestSetting.findFirst({
        where: { organizationId: req.user!.organizationId },
        orderBy: { effectiveFrom: 'desc' }
      });

      if (interestSetting) {
        const baseDate = transaction.effectiveInterestDate || transaction.project.interestStartDate;
        interest = calculateTransactionInterest(
          {
            totalApproved: transaction.totalApproved,
            status: 'PENDING',
            disbursementDate: now,
            effectiveInterestDate: baseDate
          },
          interestSetting.annualRate,
          transaction.project.interestStartDate
        );
      }

      const supplementary = Number(transaction.supplementaryAmount);
      totalAmount += interest + supplementary;

      // Update transaction and create bank withdrawal
      await prisma.$transaction(async (tx) => {
        // Update transaction
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'DISBURSED',
            disbursementDate: now,
            history: {
              create: {
                action: 'Xác nhận chi trả',
                actorName: req.user!.fullName,
                actorRole: req.user!.role,
                details: `Giải ngân hồ sơ. Tổng: ${formatCurrency(totalAmount)}`,
                totalAmount: BigInt(Math.round(totalAmount))
              }
            }
          }
        });

        // Get bank account
        const bankAccount = await tx.bankAccount.findUnique({
          where: { organizationId: req.user!.organizationId }
        });

        if (bankAccount) {
          const newBalance = Number(bankAccount.currentBalance) - totalAmount;

          // Create bank transaction (withdrawal)
          await tx.bankTransaction.create({
            data: {
              organizationId: req.user!.organizationId,
              bankAccountId: bankAccount.id,
              type: 'WITHDRAW',
              amount: BigInt(-Math.round(totalAmount)),
              note: `Chi trả dự án: ${transaction.project.code} - Hộ: ${transaction.household.name}`,
              runningBalance: BigInt(Math.round(newBalance)),
              createdById: req.user!.id
            }
          });

          // Update bank balance
          await tx.bankAccount.update({
            where: { id: bankAccount.id },
            data: { currentBalance: BigInt(Math.round(newBalance)) }
          });
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            actorName: req.user!.fullName,
            actorRole: req.user!.role,
            action: 'Xác nhận chi trả',
            target: `Giao dịch ${transaction.id}`,
            details: `Giải ngân ${formatCurrency(totalAmount)} cho hộ ${transaction.household.name}`
          }
        });
      });
    }

    const updated = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: { household: true, project: true, history: true }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(updated) });
  })
);

// POST refund transaction (DISBURSED → HOLD)
router.post(
  '/:id/refund',
  authenticate,
  validate(refundTransactionSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { refundedAmount } = req.body;
    const orgFilter = await getOrganizationFilter(req.user!);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        ...orgFilter
      },
      include: { household: true }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Update transaction
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'HOLD',
          totalApproved: BigInt(Math.round(refundedAmount)),
          disbursementDate: null,
          effectiveInterestDate: now,
          supplementaryAmount: BigInt(0),
          supplementaryNote: null,
          history: {
            create: {
              action: 'Nạp tiền / Hoàn quỹ',
              actorName: req.user!.fullName,
              actorRole: req.user!.role,
              details: `Hoàn lại ${formatCurrency(refundedAmount)}`,
              totalAmount: BigInt(Math.round(refundedAmount))
            }
          }
        }
      });

      // Get bank account
      const bankAccount = await tx.bankAccount.findUnique({
        where: { organizationId: req.user!.organizationId }
      });

      if (bankAccount) {
        const newBalance = Number(bankAccount.currentBalance) + refundedAmount;

        // Create bank transaction (deposit)
        await tx.bankTransaction.create({
          data: {
            organizationId: req.user!.organizationId,
            bankAccountId: bankAccount.id,
            type: 'DEPOSIT',
            amount: BigInt(Math.round(refundedAmount)),
            note: `Hoàn quỹ hồ sơ: ${transaction.id}`,
            runningBalance: BigInt(Math.round(newBalance)),
            createdById: req.user!.id
          }
        });

        // Update bank balance
        await tx.bankAccount.update({
          where: { id: bankAccount.id },
          data: { currentBalance: BigInt(Math.round(newBalance)) }
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: req.user!.organizationId,
          userId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
          action: 'Nạp tiền / Hoàn quỹ',
          target: `Giao dịch ${transaction.id}`,
          details: `Hoàn lại ${formatCurrency(refundedAmount)}`
        }
      });
    });

    const updated = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: { household: true, project: true, history: true }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(updated) });
  })
);

// POST add supplementary amount
router.post(
  '/:id/supplementary',
  authenticate,
  validate(addSupplementaryAmountSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { amount, note } = req.body;
    const orgFilter = await getOrganizationFilter(req.user!);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        ...orgFilter
      },
      include: { household: true }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const now = new Date();
    const newSupplementaryTotal = Number(transaction.supplementaryAmount) + amount;

    await prisma.$transaction(async (tx) => {
      // Update transaction
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          supplementaryAmount: BigInt(Math.round(newSupplementaryTotal)),
          supplementaryNote: note || transaction.supplementaryNote,
          history: {
            create: {
              action: 'Bổ sung tiền',
              actorName: req.user!.fullName,
              actorRole: req.user!.role,
              details: `Đã bổ sung thêm ${formatCurrency(amount)}${note ? ` với ghi chú: ${note}` : ''}`,
              totalAmount: BigInt(Math.round(amount))
            }
          }
        }
      });

      // Get bank account
      const bankAccount = await tx.bankAccount.findUnique({
        where: { organizationId: req.user!.organizationId }
      });

      if (bankAccount) {
        const newBalance = Number(bankAccount.currentBalance) + amount;

        // Create bank transaction
        await tx.bankTransaction.create({
          data: {
            organizationId: req.user!.organizationId,
            bankAccountId: bankAccount.id,
            type: 'DEPOSIT',
            amount: BigInt(Math.round(amount)),
            note: `Bổ sung tiền cho hộ: ${transaction.household.name} - ${transaction.id}${note ? `. ${note}` : ''}`,
            runningBalance: BigInt(Math.round(newBalance)),
            createdById: req.user!.id
          }
        });

        // Update bank balance
        await tx.bankAccount.update({
          where: { id: bankAccount.id },
          data: { currentBalance: BigInt(Math.round(newBalance)) }
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: req.user!.organizationId,
          userId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
          action: 'Bổ sung tiền',
          target: `Giao dịch ${transaction.id}`,
          details: `Bổ sung ${formatCurrency(amount)}${note ? `. Ghi chú: ${note}` : ''}`
        }
      });
    });

    const updated = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: { household: true, project: true, history: true }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(updated) });
  })
);

export default router;
