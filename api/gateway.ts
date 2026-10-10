import type { VercelRequest, VercelResponse } from "@vercel/node";

// Vercel's filesystem router only exposes one segment for the catch-all
// function in this project. The gateway receives every /api/* rewrite and
// restores the original Express URL before dispatching to the ESM backend.
process.env.DATABASE_PATH ||= "/tmp/viet-phuc-remix.sqlite";
process.env.COOKIE_SECURE = "true";

type ExpressApp = (req: VercelRequest, res: VercelResponse) => unknown;
const globalStore = globalThis as typeof globalThis & {
  __vietPhucGatewayAppPromise?: Promise<ExpressApp>;
};

function getApp() {
  return (globalStore.__vietPhucGatewayAppPromise ??= import("../backend/src/app.js").then(({ createApp }) => createApp()));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const incoming = new URL(req.url || "/", "http://vercel.local");
  const requestedPath = incoming.searchParams.get("path") || "/";
  const normalizedPath = requestedPath.startsWith("/") ? requestedPath : `/${requestedPath}`;
  incoming.searchParams.delete("path");
  req.url = `/api${normalizedPath}${incoming.searchParams.toString() ? `?${incoming.searchParams.toString()}` : ""}`;
  const app = await getApp();
  return app(req, res);
}
