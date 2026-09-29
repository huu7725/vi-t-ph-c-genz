import { Router } from 'express';
import { catalog, publicFacts, publicRules, requestSchema, type StylingRequest, type RecommendationResult } from '../domain.js';
import { generateStylingRecommendations } from '../services/geminiService.js';
import { AuthStore } from '../authStore.js';
import { requireSession, sessionOf } from '../auth.js';

export type RecommendProvider = (request: StylingRequest) => Promise<RecommendationResult>;
export function createRecommendRouter(store: AuthStore, recommend: RecommendProvider = generateStylingRecommendations) {
  const router = Router();
  router.get('/data', (_req, res) => { res.json({ catalog, cultureFacts: publicFacts, cautionRules: publicRules }); });
  router.post('/recommend', requireSession(store, true), async (req, res, next) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Lựa chọn phối đồ không hợp lệ.', code: 'INVALID_INPUT', details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }); return; }
    let reservation: string | undefined;
    try {
      const session = sessionOf(res);
      reservation = store.reserveAi(session);
      const result = await recommend(parsed.data);
      store.finishAi(reservation, !result.isFallback && result.looks.length > 0);
      reservation = undefined;
      res.json({ ...result, session: store.snapshot(session) });
    } catch (error) { if (reservation) store.finishAi(reservation, false); next(error); }
  });
  return router;
}
