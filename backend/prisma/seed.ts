/**
 * Seeds a default operations admin for first deploy (change password immediately).
 * Run: npx prisma db seed
 */
import { PrismaClient, ResponderStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
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
}

main()
  .then(() => prisma.$disconnect())
  .catch((e: unknown) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
