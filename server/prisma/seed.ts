import { PrismaClient } from "@prisma/client";

const products = [
  {
    sku: "IRIS-LTD-001",
    name: "Aurora Chronograph",
    brand: "Everest Atelier",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    description:
      "Limited drop. Sapphire caseback, ceramic bezel, 72-hour reserve. Each unit is serialized.",
    priceCents: 124900,
    totalStock: 3
  },
  {
    sku: "IRIS-LTD-002",
    name: "Vertex Runner Pro",
    brand: "Strata Labs",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    description: "Carbon plate, responsive foam, engineered for flash-sale velocity.",
    priceCents: 18900,
    totalStock: 12
  },
  {
    sku: "IRIS-LTD-003",
    name: "Lumen Tote — Obsidian",
    brand: "House of Lumen",
    imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80",
    description: "Full-grain leather, magnetic closure, interior RFID pocket.",
    priceCents: 42900,
    totalStock: 5
  }
];

async function main() {
  const prisma = new PrismaClient();
  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        brand: p.brand,
        imageUrl: p.imageUrl,
        description: p.description,
        priceCents: p.priceCents,
        totalStock: p.totalStock,
        version: 0
      },
      create: {
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        imageUrl: p.imageUrl,
        description: p.description,
        priceCents: p.priceCents,
        totalStock: p.totalStock
      }
    });
  }
  console.log("[seed] products upserted");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
