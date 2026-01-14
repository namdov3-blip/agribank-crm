/**
 * Authentication Routes
 *
 * POST /api/auth/login - Login with username/password
 * POST /api/auth/logout - Logout (client-side token removal)
 * GET  /api/auth/me - Get current user info
 */

import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, generateToken } from '../middleware/auth';
import { validate, loginSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { getClientIp } from '../utils/helpers';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req: express.Request, res: Response) => {
    const { username, password } = req.body;

    // Find user by username (across all organizations)
    const user = await prisma.user.findFirst({
      where: { username },
      include: { organization: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'Đăng nhập',
        target: 'Hệ thống',
        details: `Người dùng ${user.fullName} (${user.role}) đã đăng nhập vào hệ thống`,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      }
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      organizationId: user.organizationId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions as string[]
    });

    // Return user data and token
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        permissions: user.permissions,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          code: user.organization.code
        }
      }
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout (mainly for audit logging, token removal is client-side)
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        actorName: req.user!.fullName,
        actorRole: req.user!.role,
        action: 'Đăng xuất',
        target: 'Hệ thống',
        details: `Người dùng ${req.user!.fullName} đã đăng xuất`,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
      }
    });

    res.json({ success: true, message: 'Logged out successfully' });
  })
);

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { organization: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          code: user.organization.code
        }
      }
    });
  })
);

export default router;
