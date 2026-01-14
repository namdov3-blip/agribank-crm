/**
 * Authentication Middleware
 *
 * Verifies JWT token and attaches user info to request
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in environment variables!');
}

/**
 * Authenticate middleware
 * Verifies JWT token and attaches user info to req.user
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header' });
      return;
    }

    // Format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization format' });
      return;
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;

    // Attach user info to request
    req.user = {
      id: decoded.id,
      organizationId: decoded.organizationId,
      username: decoded.username,
      fullName: decoded.fullName,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      id: user.id,
      organizationId: user.organizationId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: user.permissions
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
};

/**
 * Check if user has required permission
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('admin')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Check if user is admin
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.user.role !== 'Admin' && !req.user.permissions.includes('admin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
