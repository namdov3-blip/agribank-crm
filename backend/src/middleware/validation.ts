/**
 * Request Validation Schemas using Zod
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// ============================================
// USER SCHEMAS
// ============================================

export const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email().optional(),
  role: z.enum(['Admin', 'User1', 'User2', 'PMB']),
  permissions: z.array(z.string()).default([]),
  // Chỉ super admin mới dùng để tạo user cho organization khác
  organizationCode: z.string().optional()
});

export const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
});

// ============================================
// PROJECT SCHEMAS
// ============================================

export const createProjectSchema = z.object({
  code: z.string().min(1, 'Project code is required'),
  name: z.string().min(1, 'Project name is required'),
  location: z.string().optional(),
  totalBudget: z.number().nonnegative('Budget must be non-negative'),
  startDate: z.string().optional(),
  interestStartDate: z.string().min(1, 'Interest start date is required'),
  status: z.enum(['Active', 'Completed', 'Planning']).default('Active')
});

export const updateProjectSchema = createProjectSchema.partial();

// ============================================
// TRANSACTION SCHEMAS
// ============================================

export const createTransactionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  householdId: z.string().min(1, 'Household ID is required'),
  household: z.object({
    name: z.string().min(1, 'Name is required'),
    cccd: z.string().optional(),
    address: z.string().optional(),
    landOrigin: z.string().optional(),
    landArea: z.number().nonnegative().default(0),
    decisionNumber: z.string().optional(),
    decisionDate: z.string().optional()
  }),
  compensation: z.object({
    landAmount: z.number().nonnegative().default(0),
    assetAmount: z.number().nonnegative().default(0),
    houseAmount: z.number().nonnegative().default(0),
    supportAmount: z.number().nonnegative().default(0),
    totalApproved: z.number().positive('Total approved must be positive')
  }),
  effectiveInterestDate: z.string().optional(),
  notes: z.string().optional()
});

export const updateTransactionSchema = z.object({
  household: z.object({
    name: z.string().optional(),
    cccd: z.string().optional(),
    address: z.string().optional(),
    decisionNumber: z.string().optional(),
    decisionDate: z.string().optional()
  }).optional(),
  notes: z.string().optional()
});

export const updateTransactionStatusSchema = z.object({
  status: z.enum(['PENDING', 'DISBURSED', 'HOLD'])
});

export const addSupplementaryAmountSchema = z.object({
  amount: z.number().int('Amount must be an integer'),
  note: z.string().optional()
});

export const refundTransactionSchema = z.object({
  refundedAmount: z.number().positive('Refunded amount must be positive')
});

// ============================================
// BANK SCHEMAS
// ============================================

export const createBankTransactionSchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAW', 'ADJUSTMENT']),
  amount: z.number().int('Amount must be an integer'),
  note: z.string().optional(),
  transactionDate: z.string().optional()
});

export const adjustOpeningBalanceSchema = z.object({
  openingBalance: z.number().int('Opening balance must be an integer')
});

// ============================================
// INTEREST RATE SCHEMA
// ============================================

export const updateInterestRateSchema = z.object({
  annualRate: z.number().positive('Interest rate must be positive').max(100, 'Interest rate cannot exceed 100%'),
  effectiveFrom: z.string().optional(),
  note: z.string().optional()
});

// ============================================
// UPLOAD SCHEMAS
// ============================================

export const confirmImportSchema = z.object({
  projectData: z.object({
    code: z.string().min(1, 'Project code is required'),
    name: z.string().min(1, 'Project name is required'),
    location: z.string().optional(),
    totalBudget: z.number().nonnegative('Budget must be non-negative'),
    startDate: z.string().optional(),
    uploadDate: z.string().optional(),
    interestStartDate: z.string().min(1, 'Interest start date is required'),
    status: z.string().optional()
  }),
  transactionsData: z.array(
    z.object({
      householdId: z.string().min(1, 'Household ID is required'),
      name: z.string().min(1, 'Name is required'),
      cccd: z.string(),
      address: z.string(),
      landOrigin: z.string().optional(),
      landArea: z.number().nonnegative().optional(),
      decisionNumber: z.string(),
      decisionDate: z.string(),
      amount: z.number().positive('Amount must be positive')
    })
  ).min(1, 'At least one transaction is required')
});

// ============================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================

/**
 * Create validation middleware from Zod schema
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Query validation failed',
          details: error.errors
        });
        return;
      }
      next(error);
    }
  };
};

// ============================================
// QUERY PARAMETER SCHEMAS
// ============================================

export const paginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  pageSize: z.string().regex(/^\d+$/).transform(Number).default('20'),
  search: z.string().optional()
});
