/**
 * Admin Routes
 * GET  /api/admin/audit-logs - Get audit logs
 * GET  /api/admin/interest-rate - Get current interest rate
 * PUT  /api/admin/interest-rate - Update interest rate
 * GET  /api/admin/interest-history - Get interest rate change history
 * GET  /api/admin/stats - Get system statistics
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, updateInterestRateSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { convertBigIntsToNumbers } from '../utils/helpers';
import { getOrganizationFilter } from '../utils/organizationHelper';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// GET audit logs (Admin only)
router.get(
  '/audit-logs',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const logs = await prisma.auditLog.findMany({
      where: orgFilter,
      orderBy: { timestamp: 'desc' },
      take: 1000 // Limit to last 1000 logs
    });

    res.json({ success: true, data: logs });
  })
);

// GET current interest rate (all authenticated users)
router.get(
  '/interest-rate',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    // Interest rate is organization-specific, so we always use user's org
    const setting = await prisma.interestSetting.findFirst({
      where: { organizationId: req.user!.organizationId },
      orderBy: { effectiveFrom: 'desc' }
    });

    if (!setting) {
      res.json({ success: true, data: { annualRate: 6.5, effectiveFrom: new Date() } });
      return;
    }

    res.json({ success: true, data: setting });
  })
);

// PUT update interest rate (Admin only)
router.put(
  '/interest-rate',
  validate(updateInterestRateSchema),
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const { annualRate, effectiveFrom, note } = req.body;

    // Get previous rate
    const previousSetting = await prisma.interestSetting.findFirst({
      where: { organizationId: req.user!.organizationId },
      orderBy: { effectiveFrom: 'desc' }
    });

    // Create new interest setting
    const newSetting = await prisma.interestSetting.create({
      data: {
        organizationId: req.user!.organizationId,
        annualRate,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        note: note || `Thay đổi từ ${previousSetting?.annualRate || 0}% sang ${annualRate}%`,
        createdById: req.user!.id
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        actorName: req.user!.fullName,
        actorRole: req.user!.role,
        action: 'Cập nhật lãi suất',
        target: 'Cấu hình hệ thống',
        details: `Thay đổi lãi suất từ ${previousSetting?.annualRate || 0}% sang ${annualRate}%`
      }
    });

    res.json({ success: true, data: newSetting });
  })
);

// GET interest rate history (all authenticated users)
router.get(
  '/interest-history',
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const history = await prisma.interestSetting.findMany({
      where: orgFilter,
      orderBy: { effectiveFrom: 'asc' },
      include: { createdBy: true }
    });

    // Chuẩn hóa dữ liệu để FE hiển thị đúng cấu trúc InterestHistoryLog
    const mapped = history.map((setting, index) => {
      const previous = index > 0 ? history[index - 1] : null;

      return {
        timestamp: setting.createdAt, // thời gian hệ thống ghi nhận thay đổi
        oldRate: previous ? previous.annualRate : 0,
        newRate: setting.annualRate,
        actor: setting.createdBy?.fullName || 'Hệ thống',
      };
    });

    // Trả về theo thứ tự mới nhất ở trên (giống cách FE đang reverse)
    res.json({ success: true, data: mapped.reverse() });
  })
);

// GET system statistics (Admin only)
router.get(
  '/stats',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const [projects, transactions, users, bankAccount] = await Promise.all([
      prisma.project.count({ where: orgFilter }),
      prisma.transaction.findMany({ where: orgFilter, include: { project: true } }),
      prisma.user.count({ where: { ...orgFilter, isActive: true } }),
      // Bank account is still scoped to user's organization (each org has its own bank account)
      prisma.bankAccount.findUnique({ where: { organizationId: req.user!.organizationId } })
    ]);

    const disbursed = transactions.filter(t => t.status === 'DISBURSED');
    const pending = transactions.filter(t => t.status !== 'DISBURSED');

    res.json({
      success: true,
      data: {
        totalProjects: projects,
        totalTransactions: transactions.length,
        disbursedCount: disbursed.length,
        pendingCount: pending.length,
        totalUsers: users,
        bankBalance: bankAccount ? convertBigIntsToNumbers(bankAccount) : null
      }
    });
  })
);

export default router;
