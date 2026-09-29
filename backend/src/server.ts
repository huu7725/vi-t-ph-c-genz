import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";
import { AuthStore } from './authStore.js';
import { readDemoConfig, seedDemoData } from './seedDemo.js';

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendRoot, ".env") });
const seedConfig = readDemoConfig(process.env);
const store = new AuthStore();
const seedResult = await seedDemoData(store, seedConfig);
if (seedResult.status === 'created') console.log(`[Database] Đã tạo tài khoản demo ${seedResult.email} và ${seedResult.lookCount} bản phối mẫu.`);
else if (seedResult.status === 'exists') console.log('[Database] Tài khoản demo đã tồn tại; giữ nguyên dữ liệu.');
const app = createApp({ store });
const frontendDist = path.resolve(backendRoot, "../frontend/dist");
if (existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const host = "0.0.0.0";
const server = app.listen(port, host, () => {
  console.log(`Việt Phục Remix Server đang chạy tại http://${host}:${port}`);
  console.log(
    `Gemini: ${process.env.GEMINI_API_KEY ? "đã cấu hình" : "chưa có key"}`,
  );
});
server.on("error", (error) => {
  console.error(`Không thể mở cổng ${port}: ${error.message}`);
  process.exitCode = 1;
});
