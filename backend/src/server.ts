import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendRoot, ".env") });
const app = createApp();
const frontendDist = path.resolve(backendRoot, "../frontend/dist");
if (existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}
const port = Number(process.env.PORT || 5000);
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Việt Phục Remix: http://localhost:${port}`);
  console.log(
    `Gemini: ${process.env.GEMINI_API_KEY?.trim() ? "đã cấu hình" : "chế độ gợi ý mẫu"}`,
  );
});
server.on("error", (error) => {
  console.error(`Không thể mở cổng ${port}: ${error.message}`);
  process.exitCode = 1;
});
