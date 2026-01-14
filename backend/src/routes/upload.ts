/**
 * Upload Routes
 * POST /api/upload/excel - Upload and parse Excel file
 * POST /api/upload/confirm - Confirm and save imported data
 */

import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate, confirmImportSchema } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { parseExcelFile, validateExcelData, calculateTotalAmount } from '../services/excelParser';
import { convertBigIntsToNumbers } from '../utils/helpers';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Safely parse date string to Date object
 * Returns null if date is invalid
 */
const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  try {
    // If it's already a Date object, return it
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }

    // Try to parse as string
    const parsed = new Date(dateValue);

    // Check if date is valid and reasonable (between 1900 and 2100)
    if (isNaN(parsed.getTime())) return null;
    const year = parsed.getFullYear();
    if (year < 1900 || year > 2100) return null;

    return parsed;
  } catch (e) {
    return null;
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// POST upload Excel
router.post(
  '/excel',
  authenticate,
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res) => {
    console.log('📤 Upload request received');
    console.log('📎 File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');

    if (!req.file) {
      console.error('❌ No file in request');
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Parse Excel
    console.log('📊 Parsing Excel file...');
    const parsedData = parseExcelFile(req.file.buffer);
    console.log(`✅ Parsed ${parsedData.length} rows`);

    // Validate
    console.log('🔍 Validating data...');
    const errors = validateExcelData(parsedData);
    if (errors.length > 0) {
      console.error('❌ Validation failed:', errors);
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    // Calculate totals
    const totalAmount = calculateTotalAmount(parsedData);

    // Return preview (not saved yet) - consistent format with other endpoints
    res.json({
      success: true,
      data: {
        rowCount: parsedData.length,
        totalAmount,
        rows: parsedData
      }
    });
  })
);

// POST confirm import
router.post(
  '/confirm',
  authenticate,
  validate(confirmImportSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectData, transactionsData } = req.body;

    await prisma.$transaction(async (tx) => {
      // Check if project code already exists, if so, add timestamp suffix
      let projectCode = projectData.code;
      const existingProject = await tx.project.findFirst({
        where: {
          organizationId: req.user!.organizationId,
          code: projectCode
        }
      });

      if (existingProject) {
        const timestamp = Date.now();
        projectCode = `${projectData.code}_${timestamp}`;
        console.log(`⚠️  Project code "${projectData.code}" already exists. Using "${projectCode}" instead.`);
      }

      // Create project
      const project = await tx.project.create({
        data: {
          ...projectData,
          code: projectCode,
          totalBudget: BigInt(projectData.totalBudget),
          startDate: safeParseDate(projectData.startDate) || new Date(),
          uploadDate: safeParseDate(projectData.uploadDate) || new Date(),
          interestStartDate: safeParseDate(projectData.interestStartDate) || new Date(),
          organizationId: req.user!.organizationId,
          createdById: req.user!.id
        }
      });

      // Create households and transactions
      for (const txData of transactionsData) {
        // Validate required fields
        if (!txData.householdId || !txData.name || !txData.amount) {
          throw new Error('Missing required transaction data');
        }

        // Upsert household (update if exists, create if not)
        const household = await tx.household.upsert({
          where: {
            organizationId_householdId: {
              organizationId: req.user!.organizationId,
              householdId: txData.householdId
            }
          },
          update: {
            name: txData.name,
            cccd: txData.cccd || '',
            address: txData.address || '',
            landOrigin: txData.landOrigin || '',
            landArea: txData.landArea || 0,
            decisionNumber: txData.decisionNumber || '',
            decisionDate: safeParseDate(txData.decisionDate)
          },
          create: {
            organizationId: req.user!.organizationId,
            householdId: txData.householdId,
            name: txData.name,
            cccd: txData.cccd || '',
            address: txData.address || '',
            landOrigin: txData.landOrigin || '',
            landArea: txData.landArea || 0,
            decisionNumber: txData.decisionNumber || '',
            decisionDate: safeParseDate(txData.decisionDate)
          }
        });

        await tx.transaction.create({
          data: {
            organizationId: req.user!.organizationId,
            projectId: project.id,
            householdId: household.id,
            totalApproved: BigInt(Math.round(txData.amount)),
            status: 'PENDING',
            metadata: txData.metadata || null, // Save metadata (loaiChiTra, spa, sttDS, etc.)
            createdById: req.user!.id
          }
        });
      }

      // Deposit to bank
      const bankAccount = await tx.bankAccount.findUnique({
        where: { organizationId: req.user!.organizationId }
      });

      if (bankAccount) {
        const newBalance = Number(bankAccount.currentBalance) + projectData.totalBudget;

        await tx.bankTransaction.create({
          data: {
            organizationId: req.user!.organizationId,
            bankAccountId: bankAccount.id,
            type: 'DEPOSIT',
            amount: BigInt(projectData.totalBudget),
            note: `Tiền chưa giải ngân dự án ${projectData.code}`,
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
          organizationId: req.user!.organizationId,
          userId: req.user!.id,
          actorName: req.user!.fullName,
          actorRole: req.user!.role,
          action: 'Upload file dữ liệu',
          target: `Dự án ${projectData.code}`,
          details: `Đã upload file và import dự án ${projectData.name} với ${transactionsData.length} hộ dân`
        }
      });
    });

    res.json({ success: true, message: 'Data imported successfully' });
  })
);

export default router;
