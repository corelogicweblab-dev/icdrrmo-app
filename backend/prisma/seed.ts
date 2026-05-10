/**
 * Seeds a default operations admin for first deploy (change password immediately).
 * Run: npx prisma db seed
 */
import { PrismaClient, ResponderStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const barangays = [
    { code: 'IC-001', name: 'City Proper (Poblacion)' },
    { code: 'IC-002', name: 'Aguada' },
    { code: 'IC-003', name: 'Baluno' },
    { code: 'IC-004', name: 'Begang' },
    { code: 'IC-005', name: 'Binuangan' },
    { code: 'IC-006', name: 'Busay' },
    { code: 'IC-007', name: 'Cabunbata' },
    { code: 'IC-008', name: 'Calvario' },
    { code: 'IC-009', name: 'Carbon' },
    { code: 'IC-010', name: 'Diki' },
    { code: 'IC-011', name: 'Isabela Eastside (Kumalarang)' },
    { code: 'IC-012', name: 'Isabela Proper' },
    { code: 'IC-013', name: 'Kaumpang' },
    { code: 'IC-014', name: 'Kapatagan Grande' },
    { code: 'IC-015', name: 'Kapatagan Pequeño' },
    { code: 'IC-016', name: 'Lampinigan' },
    { code: 'IC-017', name: 'Lanote' },
    { code: 'IC-018', name: 'Lukbuton' },
    { code: 'IC-019', name: 'Lumbangan' },
    { code: 'IC-020', name: 'Makiri' },
    { code: 'IC-021', name: 'Marang-marang' },
    { code: 'IC-022', name: 'Marketsite' },
    { code: 'IC-023', name: 'Menzi' },
    { code: 'IC-024', name: 'Panigayan' },
    { code: 'IC-025', name: 'Panunsulan' },
    { code: 'IC-026', name: 'Port Area' },
    { code: 'IC-027', name: 'Riverside' },
    { code: 'IC-028', name: 'Seaside' },
    { code: 'IC-029', name: 'Small Kapatagan' },
    { code: 'IC-030', name: 'Sumagdang' },
    { code: 'IC-031', name: 'Sunrise Village' },
    { code: 'IC-032', name: 'Tabiauan' },
    { code: 'IC-033', name: 'Tabuk' },
    { code: 'IC-034', name: 'Tampalan' },
    { code: 'IC-035', name: 'Timpul' },
    { code: 'IC-036', name: 'Tongbato' },
    { code: 'IC-037', name: 'Ubit' },
  ];
  for (const b of barangays) {
    await prisma.barangay.upsert({
      where: { code: b.code },
      create: { code: b.code, name: b.name },
      update: { name: b.name },
    });
  }
  console.log(`Seeded ${barangays.length} Isabela City barangay rows (codes IC-001…)`);

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
