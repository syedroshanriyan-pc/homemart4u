const dns = require('dns').promises;
const { PrismaClient } = require('@prisma/client');

async function getWorkingClient() {
  const lookups = await dns.lookup('aws-0-ap-south-1.pooler.supabase.com', { all: true });
  for (const item of lookups) {
    const ip = item.family === 6 ? `[${item.address}]` : item.address;
    for (const port of [6543, 5432]) {
      const isPooler = port === 6543;
      const url = `postgresql://postgres.avkxvzkkuwjltumzfoqm:homemart4u%400071@${ip}:${port}/postgres?${isPooler ? 'pgbouncer=true&connection_limit=1&' : ''}sslmode=require`;
      const client = new PrismaClient({ datasources: { db: { url } } });
      try {
        await client.$connect();
        return client;
      } catch (e) {
        await client.$disconnect();
      }
    }
  }
  throw new Error('All connection attempts failed');
}

async function main() {
  const prisma = await getWorkingClient();
  try {
    // 1. Ensure coming soon category slugs match test & catalog specs
    await prisma.category.upsert({
      where: { slug: 'fresh-mutton' },
      update: { isComingSoon: true, isActive: false },
      create: {
        name: 'Fresh Mutton',
        slug: 'fresh-mutton',
        department: 'MEAT',
        isComingSoon: true,
        isActive: false,
        displayOrder: 3
      }
    });

    await prisma.category.upsert({
      where: { slug: 'fish-seafood' },
      update: { isComingSoon: true, isActive: false },
      create: {
        name: 'Fish & Seafood',
        slug: 'fish-seafood',
        department: 'MEAT',
        isComingSoon: true,
        isActive: false,
        displayOrder: 4
      }
    });

    // 2. Ensure chicken product has standard slug 'fresh-tender-chicken-curry-cut'
    const chickenProd = await prisma.product.findFirst({
      where: { OR: [{ slug: 'fresh-chicken-curry-cut' }, { slug: 'fresh-tender-chicken-curry-cut' }] },
      include: { customizationGroups: { include: { options: true } } }
    });

    if (chickenProd) {
      await prisma.product.update({
        where: { id: chickenProd.id },
        data: { slug: 'fresh-tender-chicken-curry-cut' }
      });
      console.log('Updated chicken slug to: fresh-tender-chicken-curry-cut');
    }

    // Ensure customization option names have "Large Cut"
    const cutGroup = chickenProd?.customizationGroups.find(g => g.name === 'Cutting Size');
    if (cutGroup) {
      const largeOpt = cutGroup.options.find(o => o.name.includes('Large'));
      if (largeOpt && largeOpt.name !== 'Large Cut') {
        await prisma.customizationOption.update({
          where: { id: largeOpt.id },
          data: { name: 'Large Cut' }
        });
      }
    }

    console.log('Sync complete!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
