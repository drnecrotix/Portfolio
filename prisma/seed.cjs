const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.OWNER_PASSWORD || '');
  const name = String(process.env.OWNER_NAME || 'Nikola Stoyanov').trim();

  if (!email) {
    throw new Error('OWNER_EMAIL is required to bootstrap the CMS owner.');
  }

  if (password.length < 12) {
    throw new Error('OWNER_PASSWORD must be at least 12 characters long.');
  }

  const passwordHash = await hash(password, 12);

  const owner = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: 'OWNER',
      isActive: true,
    },
    create: {
      name,
      email,
      passwordHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  await prisma.siteModeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  console.log(`CMS owner ready: ${owner.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
