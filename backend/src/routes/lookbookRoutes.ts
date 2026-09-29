import { Router } from "express";
import { z } from "zod";
import { AuthStore, AppError } from "../authStore.js";
import { requireSession, sessionOf } from "../auth.js";
import { rawLookSchema, requestSchema, groundLook } from "../domain.js";

const saveSchema = rawLookSchema.extend({
  styleId: z.string(),
  source: z.enum(["manual", "gemini", "fallback"]),
});
export function lookbookRoutes(store: AuthStore) {
  const router = Router();
  router.get("/", requireSession(store), (_req, res) => {
    const session = sessionOf(res);
    res.json({
      session: store.snapshot(session),
      looks: store.getLooks(session.actorId),
    });
  });
  router.post("/", requireSession(store, true), (req, res, next) => {
    try {
      const parsed = saveSchema.safeParse(req.body);
      if (!parsed.success)
        throw new AppError(
          400,
          "INVALID_LOOK",
          "Bản phối không hợp lệ. Hãy thử chọn lại trong phòng phối đồ.",
        );
      const { styleId, source, ...raw } = parsed.data;
      const request = requestSchema.safeParse({
        garmentId: raw.garmentId,
        eventId: raw.eventId,
        styleId,
        gender: raw.gender ?? "nu",
        primaryColor: raw.palette[0],
        accentColor: raw.palette[1],
        selectedAccessories: raw.accessoryIds,
        pattern: raw.pattern,
      });
      if (!request.success)
        throw new AppError(
          400,
          "INVALID_LOOK",
          "Lựa chọn phối đồ không hợp lệ.",
        );
      let look;
      try {
        look = groundLook(raw, request.data, source);
      } catch {
        throw new AppError(
          400,
          "INVALID_LOOK",
          "Nguồn của bản phối không hợp lệ.",
        );
      }
      const session = sessionOf(res);
      const added = store.saveLook(session, look);
      res.status(added ? 201 : 200).json({
        added,
        session: store.snapshot(session),
        looks: store.getLooks(session.actorId),
      });
    } catch (error) {
      next(error);
    }
  });
  router.delete("/:id", requireSession(store, true), (req, res, next) => {
    try {
      const session = sessionOf(res);
      store.deleteLook(session, req.params.id);
      res.json({
        session: store.snapshot(session),
        looks: store.getLooks(session.actorId),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
