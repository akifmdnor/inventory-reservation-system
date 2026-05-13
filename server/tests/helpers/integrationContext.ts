import { createRedis } from "../../src/lib/redis.js";
import { getPrisma } from "../../src/lib/prisma.js";
import {
  PrismaInventoryRepository,
  PrismaReservationRepository
} from "../../src/repositories/prismaRepositories.js";
import { RedisStockGuard } from "../../src/services/RedisStockGuard.js";
import { InventoryReservationService } from "../../src/services/InventoryReservationService.js";

export type IntegrationCtx = {
  service: InventoryReservationService;
  prisma: ReturnType<typeof getPrisma>;
  redis: ReturnType<typeof createRedis>;
  dispose: () => Promise<void>;
};

export async function createIntegrationContext(ttlSeconds = 120): Promise<IntegrationCtx> {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  if (!databaseUrl || !redisUrl) {
    throw new Error("DATABASE_URL and REDIS_URL must be set for integration tests");
  }
  const prisma = getPrisma();
  const redis = createRedis(redisUrl);
  await redis.ping();

  const guard = new RedisStockGuard(redis);
  const inventory = new PrismaInventoryRepository(prisma);
  const reservations = new PrismaReservationRepository(prisma);
  const service = new InventoryReservationService(
    prisma,
    inventory,
    reservations,
    guard,
    ttlSeconds
  );
  await service.reconcileAllProducts();

  return {
    service,
    prisma,
    redis,
    dispose: async () => {
      await prisma.$disconnect();
      redis.disconnect();
    }
  };
}
