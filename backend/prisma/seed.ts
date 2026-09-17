/**
 * Demo data only — never real customer data (see CLAUDE.md security rules).
 * Creates one organization, one branch, and one owner user so the system
 * can be logged into for the first time.
 */
import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'מגרש הדגמה בע"מ',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organizationId: organization.id,
      name: 'סניף ראשי',
      address: 'רחוב הדוגמה 1, תל אביב',
    },
  });

  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.local' },
    update: {},
    create: {
      fullName: 'בעל/ת המערכת (דמו)',
      email: 'owner@demo.local',
      passwordHash,
      branchId: branch.id,
      roles: { create: [{ role: RoleName.OWNER }] },
    },
  });

  console.log('נתוני דמו נוצרו בהצלחה:');
  console.log(`  ארגון: ${organization.name}`);
  console.log(`  סניף: ${branch.name}`);
  console.log(`  משתמש בעלים: ${owner.email} (סיסמה מ-SEED_OWNER_PASSWORD, ברירת מחדל לפיתוח בלבד)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
