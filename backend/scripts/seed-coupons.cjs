const dns = require('dns').promises;
const { PrismaClient } = require('@prisma/client');

async function getWorkingClient() {
  const lookups = await dns.lookup('aws-0-ap-south-1.pooler.supabase.com', { all: true });
  console.log('Available IPs:', lookups);
  
  for (const item of lookups) {
    const ip = item.family === 6 ? `[${item.address}]` : item.address;
    for (const port of [6543, 5432]) {
      const isPooler = port === 6543;
      const url = `postgresql://postgres.avkxvzkkuwjltumzfoqm:homemart4u%400071@${ip}:${port}/postgres?${isPooler ? 'pgbouncer=true&connection_limit=1&' : ''}sslmode=require`;
      console.log(`Trying ${ip}:${port}...`);
      const client = new PrismaClient({ datasources: { db: { url } } });
      try {
        await client.$connect();
        console.log(`CONNECTED to ${ip}:${port}!`);
        return client;
      } catch (e) {
        console.log(`Failed on ${ip}:${port}: ${e.message.slice(0, 80)}`);
        await client.$disconnect();
      }
    }
  }
  throw new Error('All connection attempts failed');
}

async function main() {
  const prisma = await getWorkingClient();
  try {
    const now = new Date();
    const future = new Date('2028-12-31T23:59:59Z');

    const coupon1 = await prisma.coupon.upsert({
      where: { code: 'WELCOME100' },
      update: {},
      create: {
        code: 'WELCOME100',
        type: 'MIN_ORDER_FIXED',
        value: 100,
        minimumOrderMinor: 29900,
        maximumDiscountMinor: 10000,
        freeDelivery: false,
        startsAt: now,
        expiresAt: future,
        isActive: true,
        perUserLimit: 1,
      },
    });

    const coupon2 = await prisma.coupon.upsert({
      where: { code: 'FRESH50' },
      update: {},
      create: {
        code: 'FRESH50',
        type: 'FIXED',
        value: 50,
        minimumOrderMinor: 19900,
        maximumDiscountMinor: 5000,
        freeDelivery: false,
        startsAt: now,
        expiresAt: future,
        isActive: true,
        perUserLimit: 3,
      },
    });

    console.log('Seeded coupons:', coupon1.code, 'and', coupon2.code);

    const productCount = await prisma.product.count();
    const offerCount = await prisma.offerContent.count();
    const couponCount = await prisma.coupon.count();
    const orderCount = await prisma.order.count();
    const logCount = await prisma.auditLog.count();
    const users = await prisma.user.findMany({ select: { name: true, mobile: true, role: true } });

    console.log('\n======================================');
    console.log('FINAL DATABASE VERIFICATION:');
    console.log('======================================');
    console.log(`Active Products (expected: 2): ${productCount}`);
    console.log(`Active Offers (expected: 2): ${offerCount}`);
    console.log(`Active Coupons (expected: 2): ${couponCount}`);
    console.log(`Orders (expected: 0): ${orderCount}`);
    console.log(`Audit Logs (expected: 0): ${logCount}`);
    console.log('Untouched Admin Accounts:');
    console.log(JSON.stringify(users, null, 2));
    console.log('======================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
