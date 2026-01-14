/**
 * Projects Routes
 * GET    /api/projects - List all projects (filtered by organization)
 * POST   /api/projects - Create new project
 * GET    /api/projects/:id - Get single project
 * PUT    /api/projects/:id - Update project
 * DELETE /api/projects/:id - Delete project
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate, createProjectSchema, updateProjectSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { convertBigIntsToNumbers } from '../utils/helpers';
import { getOrganizationFilter } from '../utils/organizationHelper';

const router = express.Router();
const prisma = new PrismaClient();

// GET all projects
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const projects = await prisma.project.findMany({
      where: orgFilter,
      include: {
        transactions: {
          select: {
            id: true,
            status: true,
            totalApproved: true,
            supplementaryAmount: true,
            disbursementDate: true
          }
        },
        _count: { select: { transactions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(projects) });
  })
);

// POST create project
router.post(
  '/',
  authenticate,
  validate(createProjectSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const project = await prisma.project.create({
      data: {
        ...req.body,
        totalBudget: BigInt(req.body.totalBudget),
        organizationId: req.user!.organizationId,
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
        action: 'Tạo dự án',
        target: `Dự án ${project.code}`,
        details: `Tạo dự án ${project.name} với ngân sách ${req.body.totalBudget} VND`
      }
    });

    res.status(201).json({ success: true, data: convertBigIntsToNumbers(project) });
  })
);

// GET single project
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        ...orgFilter
      },
      include: { transactions: true }
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json({ success: true, data: convertBigIntsToNumbers(project) });
  })
);

// PUT update project
router.put(
  '/:id',
  authenticate,
  validate(updateProjectSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const project = await prisma.project.update({
      where: {
        id: req.params.id,
        ...orgFilter
      },
      data: {
        ...req.body,
        totalBudget: req.body.totalBudget ? BigInt(req.body.totalBudget) : undefined
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        actorName: req.user!.fullName,
        actorRole: req.user!.role,
        action: 'Cập nhật dự án',
        target: `Dự án ${project.code}`,
        details: `Cập nhật thông tin dự án ${project.name}`
      }
    });

    res.json({ success: true, data: convertBigIntsToNumbers(project) });
  })
);

// DELETE project
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const projectId = req.params.id;
    const orgFilter = await getOrganizationFilter(req.user!);

    await prisma.$transaction(async (tx) => {
      // Get project info before deleting (to withdraw money from bank)
      const project = await tx.project.findFirst({
        where: {
          id: projectId,
          ...orgFilter
        }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Delete all transactions related to this project
      await tx.transaction.deleteMany({
        where: {
          projectId: projectId,
          ...orgFilter
        }
      });

      // Delete the project
      await tx.project.delete({
        where: {
          id: projectId,
          ...orgFilter
        }
      });

      // Withdraw money from bank account (reverse the deposit made during import)
      // Note: Bank account operations should still be scoped to the project's organization
      const bankAccount = await tx.bankAccount.findUnique({
        where: { organizationId: project.organizationId }
      });

      if (bankAccount) {
        const newBalance = Number(bankAccount.currentBalance) - Number(project.totalBudget);

        await tx.bankTransaction.create({
          data: {
            organizationId: project.organizationId,
            bankAccountId: bankAccount.id,
            type: 'WITHDRAW',
            amount: -BigInt(project.totalBudget), // Negative for withdrawal
            note: `Rút tiền do xóa dự án ${project.code}`,
            runningBalance: BigInt(Math.round(newBalance)),
            createdById: req.user!.id
          }
        });

        await tx.bankAccount.update({
          where: { id: bankAccount.id },
          data: { currentBalance: BigInt(Math.round(newBalance)) }
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          organizationId: project.organizationId,
          userId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
          action: 'Xóa dự án',
          target: `${project.code} - ${project.name}`,
          details: `Đã xóa dự án và tất cả giao dịch liên quan. Rút ${Number(project.totalBudget).toLocaleString()} đồng từ tài khoản.`
        }
      });
    });

    res.json({ success: true, message: 'Project deleted' });
  })
);

export default router;
