import express from "express";
import cors from "cors";
import {
  createRecommendRouter,
  type RecommendProvider,
} from "./routes/recommendRoute.js";
import { authRoutes } from "./routes/authRoutes.js";
import { lookbookRoutes } from "./routes/lookbookRoutes.js";
import { AuthStore, AppError } from "./authStore.js";
import { frontendOrigins } from "./origins.js";
import { patternRoutes } from "./routes/patternRoutes.js";
import type { PatternProvider } from "./services/patternService.js";

export function createApp(
  options: {
    store?: AuthStore;
    recommend?: RecommendProvider;
    pattern?: PatternProvider;
  } = {},
) {
  const store = options.store || new AuthStore();
  const app = express();
  app.locals.store = store;
  app.disable("x-powered-by");
  const allowedOrigins = frontendOrigins();
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("Origin");
      const sameOrigin = origin === `${req.protocol}://${req.get("host")}`;
      if (
        req.get("Sec-Fetch-Site") === "cross-site" ||
        (origin && !sameOrigin && !allowedOrigins.includes(origin))
      ) {
        next(
          new AppError(
            403,
            "ORIGIN_REJECTED",
            "Yêu cầu không đến từ ứng dụng.",
          ),
        );
        return;
      }
    }
    next();
  });
  app.get("/health", (_req, res) => {
    res.json({
      status: "OK",
      service: "Việt Phục Remix API",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    });
  });
  app.use("/api/auth", authRoutes(store));
  app.use("/api/lookbook", lookbookRoutes(store));
  app.use("/api/patterns", patternRoutes(store, options.pattern));
  app.use("/api", createRecommendRouter(store, options.recommend));
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API không tồn tại." });
  });
  app.use(((err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    const code =
      err?.status === 413 ? 413 : err instanceof SyntaxError ? 400 : 500;
    res
      .status(code)
      .json({
        error:
          code === 413
            ? "Yêu cầu quá lớn."
            : code === 400
              ? "JSON không hợp lệ."
              : "Không thể xử lý yêu cầu. Vui lòng thử lại.",
      });
  }) as express.ErrorRequestHandler);
  return app;
}
