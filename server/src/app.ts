import cors from "cors";
import express from "express";
import { loadConfig } from "./config.js";
import { getPrisma } from "./lib/prisma.js";
import { createRedis } from "./lib/redis.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { PrismaInventoryRepository, PrismaReservationRepository } from "./repositories/prismaRepositories.js";
import { createApiRouter } from "./routes/api.js";
import { InventoryReservationService } from "./services/InventoryReservationService.js";
import { RedisStockGuard } from "./services/RedisStockGuard.js";
import { ReservationExpiryWorker } from "./workers/ReservationExpiryWorker.js";
import { mountWebClientDistIfPresent } from "./serveWebDist.js";

export type AppServices = {
  service: InventoryReservationService;
  expiryWorker: ReservationExpiryWorker;
};

export async function createApp(): Promise<{ app: express.Express } & AppServices> {
  const config = loadConfig();
  const prisma = getPrisma();
  const redis = createRedis(config.redisUrl);
  const guard = new RedisStockGuard(redis);
  const inventoryRepo = new PrismaInventoryRepository(prisma);
  const reservationRepo = new PrismaReservationRepository(prisma);
  const service = new InventoryReservationService(
    prisma,
    inventoryRepo,
    reservationRepo,
    guard,
    config.reservationTtlSeconds
  );
  await service.reconcileAllProducts();

  const expiryWorker = new ReservationExpiryWorker(redis, service);
  expiryWorker.start();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use("/api", createApiRouter(service, { demoRoutesEnabled: config.demoRoutesEnabled }));
  mountWebClientDistIfPresent(app);
  app.use(errorHandler);

  return { app, service, expiryWorker };
}
