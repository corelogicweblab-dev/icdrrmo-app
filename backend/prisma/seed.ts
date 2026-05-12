/**
 * Seeds a default operations admin for first deploy (change password immediately).
 * Run: npx prisma db seed
 */
import { PrismaClient, ResponderStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  /** Official Isabela City barangay names (45) — codes IC-001…IC-045. Keep aligned with admin/mobile seed lists. */
  const barangayNames = [
    'Aguada',
    'Balatanay',
    'Baluno',
    'Begang',
    'Binuangan',
    'Busay',
    'Cabunbata',
    'Calvario',
    'Carbon',
    'Diki',
    'Isabela Eastside',
    'Isabela Proper',
    'Dona Ramona T. Alano',
    'Kapatagan Grande',
    'Kaumpurnah Zone I',
    'Kaumpurnah Zone II',
    'Kaumpurnah Zone III',
    'Kapayawan',
    'Kumalarang',
    'La Piedad',
    'Lampinigan',
    'Lanote',
    'Lukbuton',
    'Lumbang',
    'Makiri',
    'Maligue',
    'Marang-marang',
    'Marketsite',
    'Masula',
    'Menzi',
    'Panigayan',
    'Panunsulan',
    'Port Area',
    'Riverside',
    'San Rafael',
    'Santa Barbara',
    'Santa Cruz',
    'Seaside',
    'Small Kapatagan',
    'Sumagdang',
    'Sunrise Village',
    'Tabiawan',
    'Tabuk',
    'Tampalan',
    'Timpul',
  ] as const;
  const barangays = barangayNames.map((name, i) => ({
    code: `IC-${String(i + 1).padStart(3, '0')}`,
    name,
  }));
  for (const b of barangays) {
    await prisma.barangay.upsert({
      where: { code: b.code },
      create: { code: b.code, name: b.name },
      update: { name: b.name },
    });
  }
  console.log(`Seeded ${barangays.length} Isabela City barangay rows (codes IC-001…IC-045)`);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'ops.admin@icdrrmo.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!OpsAdmin12';
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      phone: '+639170000000',
      passwordHash,
      role: UserRole.ADMIN,
      profile: { create: { fullName: 'ICDRRMO Operations Admin', setupCompleted: true } },
    },
    update: { passwordHash, role: UserRole.ADMIN },
  });
  console.log(`Seeded admin: ${email} (set SEED_ADMIN_PASSWORD to override default)`);

  const demoResponderEmail =
    process.env.SEED_RESPONDER_EMAIL ?? 'responder.demo@icdrrmo.local';
  const responderPasswordHash = await bcrypt.hash(
    process.env.SEED_RESPONDER_PASSWORD ?? 'ChangeMe!Responder12',
    12,
  );
  await prisma.user.upsert({
    where: { email: demoResponderEmail },
    create: {
      email: demoResponderEmail,
      phone: '+639170000001',
      passwordHash: responderPasswordHash,
      role: UserRole.RESPONDER,
      profile: {
        create: { fullName: 'Demo Field Responder (Alpha)', setupCompleted: true },
      },
      responder: {
        create: {
          badgeNumber: 'EMS-R-001',
          status: ResponderStatus.AVAILABLE,
        },
      },
    },
    update: {
      passwordHash: responderPasswordHash,
      role: UserRole.RESPONDER,
    },
  });
  console.log(`Seeded responder login: ${demoResponderEmail}`);

  const demoUser = await prisma.user.findUnique({
    where: { email: demoResponderEmail },
    include: { responder: true },
  });
  if (demoUser?.responder == null) {
    await prisma.responder.create({
      data: {
        userId: demoUser!.id,
        badgeNumber: 'EMS-R-001',
        status: ResponderStatus.AVAILABLE,
      },
    });
    console.log(`Linked responder row to ${demoResponderEmail}`);
  }

  const binuangan = await prisma.barangay.findUnique({ where: { code: 'IC-005' } });
  if (binuangan) {
    const opEmail = process.env.SEED_OPERATOR_EMAIL ?? 'operator.binuangan@icdrrmo.local';
    const opPasswordHash = await bcrypt.hash(
      process.env.SEED_OPERATOR_PASSWORD ?? 'ChangeMe!Operator12',
      12,
    );
    const opUser = await prisma.user.upsert({
      where: { email: opEmail },
      create: {
        email: opEmail,
        phone: '+639170000002',
        passwordHash: opPasswordHash,
        role: UserRole.OPERATOR,
        profile: {
          create: {
            fullName: 'Barangay Desk Operator (Binuangan)',
            setupCompleted: true,
            barangayId: binuangan.id,
          },
        },
      },
      update: {
        passwordHash: opPasswordHash,
        role: UserRole.OPERATOR,
      },
    });
    await prisma.userProfile.upsert({
      where: { userId: opUser.id },
      create: {
        userId: opUser.id,
        fullName: 'Barangay Desk Operator (Binuangan)',
        setupCompleted: true,
        barangayId: binuangan.id,
      },
      update: { barangayId: binuangan.id },
    });
    console.log(
      `Seeded operator (barangay Binuangan): ${opEmail} — set SEED_OPERATOR_PASSWORD on first deploy`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e: unknown) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
