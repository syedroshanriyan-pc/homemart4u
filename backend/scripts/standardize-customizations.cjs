require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("Standardizing chicken customization options...");

  // 1. Remove Skin Preference from boneless chicken breast
  const boneless = await prisma.product.findUnique({
    where: { slug: 'premium-boneless-chicken-breast' },
    include: { customizationGroups: true }
  });
  if (boneless) {
    for (const g of boneless.customizationGroups) {
      if (g.name.toLowerCase().includes("skin")) {
        await prisma.customizationOption.deleteMany({ where: { groupId: g.id } });
        await prisma.customizationGroup.delete({ where: { id: g.id } });
        console.log("Removed irrelevant skin options from boneless breast");
      }
    }
  }

  // 2. Standardize groups on other chicken products
  const chickenProducts = await prisma.product.findMany({
    where: {
      category: { slug: { in: ['fresh-chicken', 'masala-special'] } }
    },
    include: { customizationGroups: { include: { options: true } } }
  });

  for (const p of chickenProducts) {
    if (p.slug.includes("boneless") || p.slug.includes("wings")) continue;

    // Standardize Skin Preference
    let skinG = p.customizationGroups.find(g => g.name.toLowerCase().includes("skin"));
    if (skinG) {
      await prisma.customizationGroup.update({
        where: { id: skinG.id },
        data: { name: "Skin Preference", isRequired: true }
      });
      // Delete existing and re-create clean standard options
      await prisma.customizationOption.deleteMany({ where: { groupId: skinG.id } });
      await prisma.customizationOption.createMany({
        data: [
          { groupId: skinG.id, name: "Skin Removed", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
          { groupId: skinG.id, name: "Skin On", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
          { groupId: skinG.id, name: "Skin Singed / Burnt", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
        ]
      });
    }

    // Standardize Cutting Size
    let cutG = p.customizationGroups.find(g => g.name.toLowerCase().includes("cut") || g.name.toLowerCase().includes("size") || g.name.toLowerCase().includes("style"));
    if (cutG) {
      await prisma.customizationGroup.update({
        where: { id: cutG.id },
        data: { name: "Cutting Size", isRequired: true }
      });
      await prisma.customizationOption.deleteMany({ where: { groupId: cutG.id } });
      await prisma.customizationOption.createMany({
        data: [
          { groupId: cutG.id, name: "Medium Cut", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
          { groupId: cutG.id, name: "Small Cut", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
          { groupId: cutG.id, name: "Large Cut", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
        ]
      });
    }
  }

  console.log("Chicken customization options standardized successfully!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
