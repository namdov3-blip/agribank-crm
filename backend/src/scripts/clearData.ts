/**
 * Clear All Uploaded Data Script
 * Xóa toàn bộ dữ liệu đã upload: projects, transactions, households, etc.
 * Giữ lại: organizations, users, bank accounts, interest settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('');
  console.log('🗑️  Starting to clear all uploaded data...');
  console.log('');

  try {
    // Start transaction to ensure all-or-nothing deletion
    await prisma.$transaction(async (tx) => {
      // 1. Delete Transaction History (depends on Transactions)
      console.log('📋 Deleting transaction history...');
      const deletedHistory = await tx.transactionHistory.deleteMany({});
      console.log(`   ✓ Deleted ${deletedHistory.count} transaction history records`);

      // 2. Delete Transactions (depends on Projects and Households)
      console.log('💳 Deleting transactions...');
      const deletedTransactions = await tx.transaction.deleteMany({});
      console.log(`   ✓ Deleted ${deletedTransactions.count} transactions`);

      // 3. Delete Uploaded Files (depends on Projects)
      console.log('📁 Deleting uploaded files...');
      const deletedFiles = await tx.uploadedFile.deleteMany({});
      console.log(`   ✓ Deleted ${deletedFiles.count} uploaded files`);

      // 4. Delete Bank Transactions (related to projects)
      // Note: We'll delete all bank transactions, but you might want to keep manual ones
      console.log('🏦 Deleting bank transactions...');
      const deletedBankTxs = await tx.bankTransaction.deleteMany({});
      console.log(`   ✓ Deleted ${deletedBankTxs.count} bank transactions`);

      // 5. Reset Bank Account balances
      console.log('💰 Resetting bank account balances...');
      const resetAccounts = await tx.bankAccount.updateMany({
        data: {
          openingBalance: BigInt(0),
          currentBalance: BigInt(0),
          reconciledBalance: BigInt(0)
        }
      });
      console.log(`   ✓ Reset ${resetAccounts.count} bank accounts`);

      // 6. Delete Projects
      console.log('📦 Deleting projects...');
      const deletedProjects = await tx.project.deleteMany({});
      console.log(`   ✓ Deleted ${deletedProjects.count} projects`);

      // 7. Delete Households
      console.log('👥 Deleting households...');
      const deletedHouseholds = await tx.household.deleteMany({});
      console.log(`   ✓ Deleted ${deletedHouseholds.count} households`);

      // 8. Delete Audit Logs (optional - comment out if you want to keep audit trail)
      console.log('📝 Deleting audit logs...');
      const deletedAuditLogs = await tx.auditLog.deleteMany({});
      console.log(`   ✓ Deleted ${deletedAuditLogs.count} audit logs`);

      console.log('');
      console.log('✅ All uploaded data cleared successfully!');
    });

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Summary:');
    console.log('   ✓ All projects deleted');
    console.log('   ✓ All transactions deleted');
    console.log('   ✓ All households deleted');
    console.log('   ✓ All transaction history deleted');
    console.log('   ✓ All uploaded files deleted');
    console.log('   ✓ All bank transactions deleted');
    console.log('   ✓ Bank account balances reset to 0');
    console.log('   ✓ All audit logs deleted');
    console.log('');
    console.log('💾 Preserved data:');
    console.log('   ✓ Organizations');
    console.log('   ✓ Users');
    console.log('   ✓ Bank accounts (structure only, balances reset)');
    console.log('   ✓ Interest settings');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error clearing data:', error);
    console.error('');
    throw error;
  }
}

// Run the script
clearAllData()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Script failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
