import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import {
  AppError,
  AuthStore,
  digest,
  limits,
  type Session,
} from "../authStore.js";
import { requireSession, sessionOf } from "../auth.js";
import {
  defaultFittingOutfit,
  fittingAccessories,
  fittingGarments,
  fittingOutfitSchema,
  fittingStylistRequestSchema,
  fittingStylistResultSchema,
  savedFittingOutfitSchema,
  type FittingStylistRequest,
  type FittingStylistResult,
  type SavedFittingOutfit,
} from "./model.js";
import {
  fallbackFittingSuggestions,
  generateFittingSuggestions,
  type FittingStylistProvider,
} from "./stylist.js";

const saveSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    outfit: fittingOutfitSchema,
  })
  .strict();
const updateSchema = saveSchema
  .extend({ storageVersion: z.number().int().positive() })
  .strict();
const idSchema = z.string().uuid();
type SavedRow = {
  id: string;
  title: string;
  body: string;
  storage_version: number;
  updated_at: string;
};
export function listFittingLooks(
  store: AuthStore,
  actorId: string,
): SavedFittingOutfit[] {
  const rows = store.db
    .prepare(
      "SELECT id,title,body,storage_version,updated_at FROM fitting_looks WHERE actor_id=? ORDER BY updated_at DESC,rowid DESC",
    )
    .all(actorId) as SavedRow[];
  return rows.map((row) =>
    savedFittingOutfitSchema.parse({
      id: row.id,
      title: row.title,
      outfit: JSON.parse(row.body),
      storageVersion: row.storage_version,
      updatedAt: row.updated_at,
    }),
  );
}
const responseFor = (store: AuthStore, session: Session) => ({
  looks: listFittingLooks(store, session.actorId),
  session: store.snapshot(session),
});

function safeProviderResult(
  raw: unknown,
  request: FittingStylistRequest,
): FittingStylistResult {
  const result = fittingStylistResultSchema.parse(raw);
  if (
    result.baseRevision !== request.outfit.revision ||
    result.requestId !== request.requestId
  )
    throw new Error("Mismatched provider request");
  for (const suggestion of result.suggestions) {
    const next = suggestion.outfit,
      before = request.outfit;
    if (
      next.revision !== before.revision + 1 ||
      next.gender !== before.gender ||
      next.mode !== before.mode ||
      next.garmentId !== before.garmentId ||
      next.eventId !== before.eventId ||
      next.styleId !== before.styleId ||
      next.camera !== before.camera ||
      JSON.stringify(next.layers) !== JSON.stringify(before.layers) ||
      JSON.stringify(next.pattern) !== JSON.stringify(before.pattern)
    )
      throw new Error("Provider modified protected fields");
  }
  return result;
}

export function fittingRoutes(
  store: AuthStore,
  stylist: FittingStylistProvider = generateFittingSuggestions,
) {
  const router = Router();
  router.get("/scene", (_req, res) =>
    res.json({
      garments: fittingGarments,
      accessories: fittingAccessories,
      defaultOutfit: defaultFittingOutfit,
    }),
  );
  router.get("/outfits", requireSession(store), (_req, res) =>
    res.json(responseFor(store, sessionOf(res))),
  );
  router.post("/outfits", requireSession(store, true), (req, res, next) => {
    try {
      const parsed = saveSchema.safeParse(req.body);
      if (!parsed.success)
        throw new AppError(
          400,
          "INVALID_FITTING_OUTFIT",
          "Bản phối 3D không hợp lệ. Kiểm tra tên, màu và phụ kiện.",
        );
      const session = sessionOf(res),
        id = randomUUID();
      store.transaction(() => {
        const max =
          session.role === "guest" ? limits.guestLooks : limits.memberLooks;
        if (store.countLooks(session.actorId) >= max)
          throw new AppError(
            403,
            "LOOKBOOK_LIMIT",
            `Tủ đồ dùng chung 2D và 3D đã đủ ${max} bản phối. Hãy xóa bớt hoặc đăng nhập tài khoản.`,
          );
        store.db
          .prepare(
            "INSERT INTO fitting_looks(actor_id,id,title,body,storage_version,updated_at) VALUES(?,?,?,?,1,?)",
          )
          .run(
            session.actorId,
            id,
            parsed.data.title,
            JSON.stringify(parsed.data.outfit),
            new Date(store.now()).toISOString(),
          );
      });
      res.status(201).json({ id, ...responseFor(store, session) });
    } catch (error) {
      next(error);
    }
  });
  router.put("/outfits/:id", requireSession(store, true), (req, res, next) => {
    try {
      const input = updateSchema.safeParse(req.body),
        id = idSchema.safeParse(req.params.id);
      if (!input.success || !id.success)
        throw new AppError(
          400,
          "INVALID_FITTING_OUTFIT",
          "Bản phối hoặc phiên bản lưu không hợp lệ.",
        );
      const session = sessionOf(res);
      store.transaction(() => {
        const row = store.db
          .prepare(
            "SELECT storage_version FROM fitting_looks WHERE actor_id=? AND id=?",
          )
          .get(session.actorId, id.data);
        if (!row)
          throw new AppError(
            404,
            "LOOK_NOT_FOUND",
            "Không tìm thấy bản phối trong tủ đồ của bạn.",
          );
        if (Number(row.storage_version) !== input.data.storageVersion)
          throw new AppError(
            409,
            "OUTFIT_CONFLICT",
            "Bản phối đã thay đổi ở tab khác. Tải lại tủ đồ trước khi ghi đè.",
          );
        store.db
          .prepare(
            "UPDATE fitting_looks SET title=?,body=?,storage_version=storage_version+1,updated_at=? WHERE actor_id=? AND id=? AND storage_version=?",
          )
          .run(
            input.data.title,
            JSON.stringify(input.data.outfit),
            new Date(store.now()).toISOString(),
            session.actorId,
            id.data,
            input.data.storageVersion,
          );
      });
      res.json(responseFor(store, session));
    } catch (error) {
      next(error);
    }
  });
  router.delete(
    "/outfits/:id",
    requireSession(store, true),
    (req, res, next) => {
      try {
        const session = sessionOf(res),
          id = idSchema.safeParse(req.params.id);
        if (!id.success)
          throw new AppError(404, "LOOK_NOT_FOUND", "Không tìm thấy bản phối.");
        const result = store.db
          .prepare("DELETE FROM fitting_looks WHERE actor_id=? AND id=?")
          .run(session.actorId, id.data);
        if (!result.changes)
          throw new AppError(
            404,
            "LOOK_NOT_FOUND",
            "Không tìm thấy bản phối trong tủ đồ của bạn.",
          );
        res.json(responseFor(store, session));
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    "/stylist",
    requireSession(store, true),
    async (req, res, next) => {
      const parsed = fittingStylistRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        next(
          new AppError(
            400,
            "INVALID_FITTING_REQUEST",
            "Yêu cầu phối đồ 3D không hợp lệ; mô tả tối đa 400 ký tự.",
          ),
        );
        return;
      }
      const request = parsed.data,
        session = sessionOf(res),
        inputHash = digest(JSON.stringify(request));
      let reservation: string | undefined;
      try {
        store.cleanup();
        const cached = store.db
          .prepare(
            "SELECT input_hash,body FROM fitting_ai_requests WHERE actor_id=? AND request_id=? AND expires_at>?",
          )
          .get(session.actorId, request.requestId, store.now());
        if (cached) {
          if (cached.input_hash !== inputHash)
            throw new AppError(
              409,
              "REQUEST_CONFLICT",
              "Mã yêu cầu đã dùng cho một bản phối khác. Hãy tạo yêu cầu mới.",
            );
          res.json({
            ...fittingStylistResultSchema.parse(
              JSON.parse(String(cached.body)),
            ),
            session: store.snapshot(session),
          });
          return;
        }
        reservation = store.reserveAi(session);
        let result: FittingStylistResult;
        try {
          result = safeProviderResult(await stylist(request), request);
        } catch {
          result = fallbackFittingSuggestions(
            request,
            "Gemini chưa trả kết quả hợp lệ. Đang dùng gợi ý mẫu; chưa trừ lượt AI.",
          );
        }
        store.finishAi(reservation, result.source === "gemini", () => {
          store.db
            .prepare(
              "INSERT INTO fitting_ai_requests(actor_id,request_id,input_hash,body,expires_at) VALUES(?,?,?,?,?)",
            )
            .run(
              session.actorId,
              request.requestId,
              inputHash,
              JSON.stringify(result),
              store.now() + 86400000,
            );
        });
        reservation = undefined;
        res.json({ ...result, session: store.snapshot(session) });
      } catch (error) {
        if (reservation) store.finishAi(reservation, false);
        next(error);
      }
    },
  );
  return router;
}
