require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const cats = await prisma.category.findMany({
    select: { name: true, slug: true, isActive: true, isComingSoon: true }
  });
  console.log("Current Categories:", cats);
}

run().catch(console.error).finally(() => prisma.$disconnect());
