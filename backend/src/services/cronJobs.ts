/**
 * Cron Jobs for Automated Tasks
 *
 * - Daily interest updates (informational)
 * - Monthly interest capitalization (deposit interest to bank)
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { calculateTransactionInterest } from '../utils/interestCalculation';

const prisma = new PrismaClient();

/**
 * Daily Interest Update Check (Informational)
 *
 * Runs at 00:01 every day
 * Logs pending transactions for monitoring
 */
export const dailyInterestUpdateJob = cron.schedule(
  '1 0 * * *',
  async () => {
    console.log('[CRON] Running daily interest update check...');

    try {
      const pendingTransactions = await prisma.transaction.findMany({
        where: {
          status: { in: ['PENDING', 'HOLD'] }
        },
        include: {
          project: true,
          organization: {
            include: {
              interestSettings: {
                orderBy: { effectiveFrom: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      console.log(`[CRON] Found ${pendingTransactions.length} pending/hold transactions`);

      // Log summary by organization
      const orgSummary = new Map<string, number>();
      pendingTransactions.forEach(txn => {
        const orgName = txn.organization.name;
        orgSummary.set(orgName, (orgSummary.get(orgName) || 0) + 1);
      });

      orgSummary.forEach((count, orgName) => {
        console.log(`  - ${orgName}: ${count} transactions`);
      });

      console.log('[CRON] Daily interest check completed');
    } catch (error) {
      console.error('[CRON] Daily interest check failed:', error);
    }
  },
  {
    scheduled: false, // Don't start automatically
    timezone: 'Asia/Ho_Chi_Minh'
  }
);

/**
 * Monthly Interest Capitalization
 *
 * Runs at 02:00 on the 1st day of every month
 * Calculates and deposits accrued interest to bank accounts
 */
export const monthlyInterestCapitalizationJob = cron.schedule(
  '0 2 1 * *',
  async () => {
    console.log('[CRON] Running monthly interest capitalization...');

    try {
      const organizations = await prisma.organization.findMany({
        where: { isActive: true },
        include: {
          interestSettings: {
            orderBy: { effectiveFrom: 'desc' },
            take: 1
          },
          bankAccount: true
        }
      });

      for (const org of organizations) {
        try {
          // Get current interest rate
          const interestSetting = org.interestSettings[0];
          if (!interestSetting) {
            console.warn(`[CRON] No interest rate set for org ${org.code}, skipping...`);
            continue;
          }

          const annualRate = interestSetting.annualRate;

          // Get all pending/hold transactions
          const pendingTransactions = await prisma.transaction.findMany({
            where: {
              organizationId: org.id,
              status: { in: ['PENDING', 'HOLD'] }
            },
            include: {
              project: true
            }
          });

          if (pendingTransactions.length === 0) {
            console.log(`[CRON] No pending transactions for org ${org.code}`);
            continue;
          }

          // Calculate total interest
          let totalInterest = 0;
          pendingTransactions.forEach(txn => {
            const interest = calculateTransactionInterest(
              txn,
              annualRate,
              txn.project.interestStartDate
            );
            totalInterest += interest;
          });

          if (totalInterest <= 0) {
            console.log(`[CRON] No interest accrued for org ${org.code}`);
            continue;
          }

          // Get bank account
          if (!org.bankAccount) {
            console.warn(`[CRON] No bank account for org ${org.code}, skipping...`);
            continue;
          }

          // Create bank transaction (deposit interest)
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
          const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

          await prisma.$transaction(async (tx) => {
            // Create bank transaction
            await tx.bankTransaction.create({
              data: {
                organizationId: org.id,
                bankAccountId: org.bankAccount!.id,
                type: 'DEPOSIT',
                amount: BigInt(Math.round(totalInterest)),
                note: `Tự động kết chuyển lãi tháng ${previousMonth}/${previousYear}`,
                transactionDate: new Date(),
                runningBalance: BigInt(
                  Number(org.bankAccount!.currentBalance) + Math.round(totalInterest)
                )
              }
            });

            // Update bank account balance
            await tx.bankAccount.update({
              where: { id: org.bankAccount!.id },
              data: {
                currentBalance: {
                  increment: BigInt(Math.round(totalInterest))
                }
              }
            });
          });

          console.log(
            `[CRON] Capitalized ${Math.round(totalInterest).toLocaleString('vi-VN')} VND ` +
            `for org ${org.code} (${pendingTransactions.length} transactions)`
          );
        } catch (error) {
          console.error(`[CRON] Failed to capitalize interest for org ${org.code}:`, error);
        }
      }

      console.log('[CRON] Monthly interest capitalization completed');
    } catch (error) {
      console.error('[CRON] Monthly interest capitalization failed:', error);
    }
  },
  {
    scheduled: false, // Don't start automatically
    timezone: 'Asia/Ho_Chi_Minh'
  }
);

/**
 * Start all cron jobs
 */
export const startCronJobs = (): void => {
  console.log('🕒 Starting cron jobs...');

  // Start daily interest check
  dailyInterestUpdateJob.start();
  console.log('  ✓ Daily interest check (runs at 00:01 daily)');

  // Start monthly interest capitalization
  monthlyInterestCapitalizationJob.start();
  console.log('  ✓ Monthly interest capitalization (runs at 02:00 on 1st of month)');
};

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export const stopCronJobs = (): void => {
  console.log('🛑 Stopping cron jobs...');
  dailyInterestUpdateJob.stop();
  monthlyInterestCapitalizationJob.stop();
};
