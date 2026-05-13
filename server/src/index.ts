import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const config = loadConfig();

const { app } = await createApp();

app.listen(config.port, () => {
  console.log(`[inventory] http://localhost:${config.port}`);
});
