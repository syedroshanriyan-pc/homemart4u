require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const prods = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      name: true,
      slug: true,
      category: { select: { name: true, slug: true, isComingSoon: true } },
      customizationGroups: {
        select: {
          name: true,
          selectionType: true,
          isRequired: true,
          options: { select: { name: true, priceDeltaMinor: true, isActive: true } }
        }
      },
      variants: {
        select: { name: true, priceMinor: true, mrpMinor: true }
      }
    }
  });
  console.log("Active Products:", JSON.stringify(prods, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
