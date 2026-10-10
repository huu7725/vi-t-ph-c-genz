import type { VercelRequest, VercelResponse } from "@vercel/node";

// Vercel serverless instances have ephemeral storage. This keeps the free demo
// functional; durable SQLite requires a hosted database or a persistent VM.
process.env.DATABASE_PATH ||= "/tmp/viet-phuc-remix.sqlite";
process.env.COOKIE_SECURE = "true";

type ExpressApp = (req: VercelRequest, res: VercelResponse) => unknown;
const globalStore = globalThis as typeof globalThis & {
  __vietPhucAppPromise?: Promise<ExpressApp>;
};

// The backend package is ESM while @vercel/node emits this function as
// CommonJS. A lazy dynamic import avoids the CJS `require()`/ESM mismatch.
function getApp() {
  return (globalStore.__vietPhucAppPromise ??= import("../backend/src/app.js").then(({ createApp }) => createApp()));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  return app(req, res);
}
