/**
 * Database Seed Script
 * Creates initial data: 5 organizations with admin users
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('');
  console.log('🌱 Starting database seeding...');
  console.log('');

  // Hash password for all admin users
  const defaultPassword = 'admin123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Define organizations matching business units
  const organizations = [
    {
      name: 'Agribank Chi nhánh Đông Anh',
      code: 'AGR_DA',
      phone: '024-3876-5432',
      email: 'donganh@agribank.vn',
      address: 'Số 68 đường Cao Lỗ, xã Đông Anh, Hà Nội'
    },
    {
      name: 'Đông Anh',
      code: 'ORG_DA',
      phone: '024-0000-0001',
      email: 'donganh@org.vn',
      address: 'Đông Anh, Hà Nội'
    },
    {
      name: 'Phúc Thịnh',
      code: 'ORG_PT',
      phone: '024-0000-0002',
      email: 'phucthinh@org.vn',
      address: 'Phúc Thịnh, Hà Nội'
    },
    {
      name: 'Vĩnh Thanh',
      code: 'ORG_VT',
      phone: '024-0000-0003',
      email: 'vinhthanh@org.vn',
      address: 'Vĩnh Thanh, Hà Nội'
    },
    {
      name: 'Thiên Lộc',
      code: 'ORG_TL',
      phone: '024-0000-0004',
      email: 'thienloc@org.vn',
      address: 'Thiên Lộc, Hà Nội'
    },
    {
      name: 'Thư Lâm',
      code: 'ORG_TLM',
      phone: '024-0000-0005',
      email: 'thulam@org.vn',
      address: 'Thư Lâm, Hà Nội'
    }
  ];

  // Create organizations with bank accounts, interest settings & initial audit log
  const createdOrgs = [];
  for (const orgData of organizations) {
    console.log(`📦 Creating organization: ${orgData.name}...`);

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name: orgData.name,
        code: orgData.code,
        phone: orgData.phone,
        email: orgData.email,
        address: orgData.address,
        isActive: true
      }
    });

    console.log(`  ✓ Organization created: ${org.code}`);
    createdOrgs.push(org);

    // Create bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        organizationId: org.id,
        bankName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
        accountNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        openingBalance: BigInt(0),
        currentBalance: BigInt(0),
        reconciledBalance: BigInt(0)
      }
    });

    console.log(`  ✓ Bank account created: ${bankAccount.accountNumber}`);

    // Create default interest rate setting (6.5%)
    const interestSetting = await prisma.interestSetting.create({
      data: {
        organizationId: org.id,
        annualRate: 6.5,
        effectiveFrom: new Date('2025-01-01'),
        note: 'Lãi suất mặc định ban đầu',
        // Không có admin per-org trong seed mới, để null và coi như hệ thống khởi tạo
        createdById: null
      }
    });

    console.log(`  ✓ Interest rate set: ${interestSetting.annualRate}% (effective from 2025-01-01)`);

    // Create initial audit log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: null,
        actorName: 'System',
        actorRole: 'System',
        action: 'Khởi tạo hệ thống',
        target: 'Hệ thống',
        details: `Khởi tạo tổ chức ${org.name} với dữ liệu ban đầu`
      }
    });

    console.log(`  ✓ Initial audit log created`);
    console.log('');
  }

  // Create 2 super admin users (có quyền xem tất cả organization)
  console.log('👑 Creating super admin users...');

  const agrDaOrg = createdOrgs.find(o => o.code === 'AGR_DA');
  if (!agrDaOrg) {
    throw new Error('Agribank Chi nhánh Đông Anh (AGR_DA) not found');
  }

  const superAdmins = [
    {
      username: 'superadmin1',
      fullName: 'Super Admin 1',
    },
    {
      username: 'superadmin2',
      fullName: 'Super Admin 2',
    }
  ];

  for (const sa of superAdmins) {
    await prisma.user.create({
      data: {
        organizationId: agrDaOrg.id,
        username: sa.username,
        passwordHash,
        fullName: sa.fullName,
        email: `${sa.username}@example.com`,
        role: 'Admin',
        permissions: ['dashboard', 'projects', 'transactions', 'balance', 'admin', 'super_admin'],
        isActive: true
      }
    });

    console.log(`  ✓ Super admin created: ${sa.username} (password: ${defaultPassword})`);
  }

  console.log('✅ Seeding completed successfully!');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 LOGIN CREDENTIALS:');
  console.log('');
  console.log('  Super Admins (xem được tất cả tổ chức):');
  console.log('    - Username: superadmin1 | Password: admin123');
  console.log('    - Username: superadmin2 | Password: admin123');
  console.log('');
  console.log('  Organizations:');
  for (const org of organizations) {
    console.log(`    - ${org.name} (code: ${org.code})`);
  }
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🚀 You can now start the server with: npm run dev');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
