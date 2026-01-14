/**
 * Users Routes (Admin only)
 * GET    /api/users - List users
 * POST   /api/users - Create user
 * PUT    /api/users/:id - Update user
 * DELETE /api/users/:id - Delete user
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, createUserSchema, updateUserSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { convertBigIntsToNumbers } from '../utils/helpers';
import { getOrganizationFilter, SUPER_ADMIN_PERMISSION } from '../utils/organizationHelper';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require admin access
router.use(authenticate, requireAdmin);

// GET all users
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const orgFilter = await getOrganizationFilter(req.user!);
    const users = await prisma.user.findMany({
      where: orgFilter,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        organization: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: users });
  })
);

// POST create user
router.post(
  '/',
  validate(createUserSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { username, password, organizationCode, ...userData } = req.body;

    // Xác định organizationId cho user mới
    let targetOrganizationId = req.user!.organizationId;

    // Super admin có thể tạo user cho org bất kỳ thông qua organizationCode
    if (req.user!.permissions?.includes(SUPER_ADMIN_PERMISSION) && organizationCode) {
      const targetOrg = await prisma.organization.findUnique({
        where: { code: organizationCode }
      });

      if (!targetOrg) {
        res.status(400).json({ error: 'Invalid organization code' });
        return;
      }

      targetOrganizationId = targetOrg.id;
    }

    // Check if username already exists in this (target) organization
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        organizationId: targetOrganizationId
      }
    });

    if (existingUser) {
      res.status(409).json({ error: 'Username already exists in the selected organization' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        ...userData,
        organizationId: targetOrganizationId
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        organization: {
          select: {
            name: true
          }
        }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        actorName: req.user!.fullName,
        actorRole: req.user!.role,
        action: 'Tạo người dùng',
        target: `User ${username}`,
        details: `Tạo tài khoản ${userData.fullName} với vai trò ${userData.role} cho organization ${user.organization?.name}`
      }
    });

    res.status(201).json({ success: true, data: user });
  })
);

// PUT update user
router.put(
  '/:id',
  validate(updateUserSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { password, ...updateData } = req.body;
    
    // Hash password if provided
    const dataToUpdate: any = { ...updateData };
    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId
      },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        organization: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({ success: true, data: user });
  })
);

// DELETE user
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const userId = req.params.id;

    // Super admin có thể xóa user ở bất kỳ organization nào
    const isSuperAdmin = req.user!.permissions?.includes(SUPER_ADMIN_PERMISSION);

    if (isSuperAdmin) {
      // Xóa theo id duy nhất
      const deleted = await prisma.user.deleteMany({
        where: { id: userId }
      });

      if (deleted.count === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    } else {
      // Admin thường chỉ được xóa user trong organization của mình
      const deleted = await prisma.user.deleteMany({
        where: {
          id: userId,
          organizationId: req.user!.organizationId
        }
      });

      if (deleted.count === 0) {
        res.status(404).json({ error: 'User not found in your organization' });
        return;
      }
    }

    res.json({ success: true, message: 'User deleted' });
  })
);

export default router;
