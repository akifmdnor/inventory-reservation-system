import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  PORT: z.coerce.number().default(3002),
  RESERVATION_TTL_SECONDS: z.coerce.number().min(1).default(120),
  DEMO_ROUTES_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true")
});

export type AppConfig = {
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  port: number;
  reservationTtlSeconds: number;
  demoRoutesEnabled: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV ?? "development",
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    port: e.PORT,
    reservationTtlSeconds: e.RESERVATION_TTL_SECONDS,
    demoRoutesEnabled: e.DEMO_ROUTES_ENABLED
  };
}
