import { Router } from "express";
import { AppError, type AuthStore } from "../authStore.js";
import { requireSession, sessionOf } from "../auth.js";
import { lineMotifSchema, patternGenerationRequest } from "../patterns.js";
import {
  generateLinePattern,
  type PatternProvider,
} from "../services/patternService.js";

export function patternRoutes(
  store: AuthStore,
  generate: PatternProvider = generateLinePattern,
) {
  const router = Router();
  router.post(
    "/generate",
    requireSession(store, true),
    async (req, res, next) => {
      let reservation: string | undefined;
      try {
        const input = patternGenerationRequest.safeParse(req.body);
        if (!input.success)
          throw new AppError(
            400,
            "INVALID_PATTERN_PROMPT",
            "Mô tả hoa văn cần từ 5 đến 400 ký tự.",
          );
        const session = sessionOf(res);
        reservation = store.reserveAi(session);
        const result = await generate(input.data.prompt);
        const checked = lineMotifSchema.safeParse(result.motif);
        if (!checked.success || result.source !== "gemini")
          throw new AppError(
            502,
            "PATTERN_INVALID",
            "Hoa văn trả về chưa hợp lệ. Chưa trừ lượt AI.",
          );
        store.finishAi(reservation, true);
        reservation = undefined;
        res.json({
          motif: checked.data,
          source: "gemini",
          session: store.snapshot(session),
        });
      } catch (error) {
        if (reservation) store.finishAi(reservation, false);
        next(error);
      }
    },
  );
  return router;
}
