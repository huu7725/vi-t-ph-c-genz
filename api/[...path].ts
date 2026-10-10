import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../backend/src/app.js";
import { AuthStore } from "../backend/src/authStore.js";

// Vercel serverless instances have ephemeral storage. This keeps the free demo
// functional; durable SQLite requires a hosted database or a persistent VM.
process.env.DATABASE_PATH ||= "/tmp/viet-phuc-remix.sqlite";
process.env.COOKIE_SECURE = "true";

const globalStore = globalThis as typeof globalThis & {
  __vietPhucStore?: AuthStore;
  __vietPhucApp?: ReturnType<typeof createApp>;
};
const store = globalStore.__vietPhucStore ??= new AuthStore(process.env.DATABASE_PATH);
const app = globalStore.__vietPhucApp ??= createApp({ store });

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
