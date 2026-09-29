import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSafePath,
  lineMotifSchema,
  motifCatalog,
  patternSchema,
  defaultPattern,
  toFreePattern,
  MAX_DECORATIONS,
} from "../patterns.js";
import {
  defaultRequest,
  manualLook,
  restoreLooks,
  fallbackRecommendations,
} from "../domain.js";
import { drawLineMotif } from "../services/patternService.js";
import { AuthStore } from "../authStore.js";
import { createApp } from "../app.js";

const lotus = motifCatalog.find((m) => m.id === "lotus")!;
const custom = { name: "Sen nét viền", paths: lotus.paths };

test("free decoration preserves preset positions, custom paths and look IDs through persistence", () => {
  const preset = {
    ...defaultPattern,
    motifId: "custom" as const,
    custom,
    placement: "side" as const,
  };
  const free = toFreePattern(preset, true, false);
  assert.equal(free.placement, "free");
  assert.equal(free.decorations?.length, 4);
  assert.deepEqual(
    free.decorations?.map((d) => [d.x, d.y, d.scale]),
    [
      [150, 228, 0.36],
      [150, 273, 0.36],
      [150, 318, 0.36],
      [150, 363, 0.36],
    ],
  );
  assert.deepEqual(free.assets?.[0].motif, custom);
  assert.equal(free.custom, undefined);
  const look = manualLook({ ...defaultRequest, pattern: free });
  assert.deepEqual(restoreLooks([look])[0].pattern, free);
  assert.equal(restoreLooks([look])[0].id, look.id);
  const moved = {
    ...free,
    decorations: free.decorations!.map((d, i) =>
      i === 0 ? { ...d, x: 176, y: 260, rotation: 37 } : d,
    ),
  };
  assert.notEqual(
    manualLook({ ...defaultRequest, pattern: moved }).id,
    look.id,
  );
  assert.deepEqual(
    fallbackRecommendations({ ...defaultRequest, pattern: moved }).looks[0]
      .pattern,
    moved,
  );
});

test("free layout rejects too many instances, missing assets, duplicate IDs and non-finite transforms", () => {
  const free = toFreePattern(defaultPattern, true, false),
    item = free.decorations![0];
  for (const patch of [
    { x: -1 },
    { x: 321 },
    { y: 521 },
    { scale: 0 },
    { scale: 5 },
    { rotation: 181 },
    { x: Infinity },
    { motifId: "custom", assetId: "missing" },
    { assetId: "unexpected" },
  ]) {
    assert.equal(
      patternSchema.safeParse({ ...free, decorations: [{ ...item, ...patch }] })
        .success,
      false,
    );
  }
  assert.equal(
    patternSchema.safeParse({ ...free, decorations: [item, item] }).success,
    false,
  );
  assert.equal(
    patternSchema.safeParse({
      ...free,
      decorations: Array.from({ length: MAX_DECORATIONS + 1 }, (_, i) => ({
        ...item,
        id: `d-${i}`,
      })),
    }).success,
    false,
  );
  assert.equal(
    patternSchema.safeParse({ ...free, placement: "center" }).success,
    false,
  );
  assert.equal(
    patternSchema.safeParse({ ...free, decorations: [] }).success,
    true,
  );
});
test("built-in motifs use valid bounded paths; malformed, executable and oversized data are rejected", () => {
  for (const motif of motifCatalog.filter((m) => m.id !== "none"))
    assert.ok(
      lineMotifSchema.safeParse({ name: motif.name, paths: motif.paths })
        .success,
      motif.name,
    );
  for (const d of [
    '<svg onload="alert(1)">',
    "M0 0 L1000 10",
    "M-1 0 L10 10",
    "M0 0 Q1 2 3",
    "M0 0 A5 5 0 0 0 10 10",
    "M0 0 LNaN 5",
    "M0 0 L1e99 10",
    "M0 0",
    "L0 0L10 10",
    "M0 0 L10 10 url(https://evil.example)",
  ])
    assert.equal(isSafePath(d), false, d);
  assert.equal(
    lineMotifSchema.safeParse({
      name: "x",
      paths: ["M0 0L10 10"],
      svg: "<script/>",
    }).success,
    false,
  );
  assert.equal(
    lineMotifSchema.safeParse({
      name: "x",
      paths: Array(17).fill("M0 0L10 10"),
    }).success,
    false,
  );
  assert.equal(
    patternSchema.safeParse({ ...defaultPattern, motifId: "custom" }).success,
    false,
  );
  assert.equal(
    patternSchema.safeParse({ ...defaultPattern, custom }).success,
    false,
  );
  assert.equal(
    patternSchema.safeParse({
      ...defaultPattern,
      color: "url(javascript:evil)",
    }).success,
    false,
  );
});
test("legacy IDs stay stable and custom motif, appearance and geometry survive saved data and recommendations", () => {
  const old = manualLook(defaultRequest);
  const { pattern, ...legacy } = old;
  assert.equal(restoreLooks([legacy])[0].id, old.id);
  const request = {
    ...defaultRequest,
    pattern: patternSchema.parse({
      ...defaultPattern,
      motifId: "custom",
      custom,
      color: "#BC4749",
      placement: "hem",
      scale: 1.2,
    }),
  };
  const look = manualLook(request);
  assert.notEqual(look.id, old.id);
  assert.deepEqual(restoreLooks([look])[0].pattern, request.pattern);
  assert.notEqual(
    manualLook({
      ...request,
      pattern: { ...request.pattern, placement: "side" },
    }).id,
    look.id,
  );
  assert.ok(
    fallbackRecommendations(request).looks.every(
      (l) => JSON.stringify(l.pattern) === JSON.stringify(request.pattern),
    ),
  );
  assert.deepEqual(
    restoreLooks([
      {
        ...look,
        pattern: {
          ...request.pattern,
          custom: { name: "unsafe", paths: ["<script/>"] },
        },
      },
    ]),
    [],
  );
});
test("AI path validation repairs once then fails without using arbitrary SVG", async () => {
  let calls = 0;
  const result = await drawLineMotif("sen nét viền", async () => {
    calls++;
    return calls === 1
      ? JSON.stringify({ name: "x", paths: ["<svg/>"] })
      : JSON.stringify(custom);
  });
  assert.equal(calls, 2);
  assert.deepEqual(result, custom);
  calls = 0;
  await assert.rejects(
    drawLineMotif("sen nét viền", async () => {
      calls++;
      return "{invalid";
    }),
    /chưa tạo được/,
  );
  assert.equal(calls, 2);
  await assert.rejects(
    drawLineMotif("sen nét viền", async () => {
      throw { status: 403, message: "SECRET_KEY" };
    }),
    (error) => !String(error).includes("SECRET_KEY"),
  );
});
test("pattern endpoint shares guest AI quota, refunds failures, requires CSRF and persists custom paths in SQLite", async () => {
  const store = new AuthStore(":memory:");
  let mode = "success";
  const server = createApp({
    store,
    pattern: async () => {
      if (mode === "failure") throw new Error("Provider failed");
      if (mode === "invalid")
        return {
          motif: { name: "invalid", paths: ["<script/>"] },
          source: "gemini",
        };
      return { motif: custom, source: "gemini" };
    },
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr !== "string");
  const base = `http://127.0.0.1:${addr.port}/api`;
  try {
    const boot = await fetch(base + "/auth/session");
    const cookie = boot.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const session = (await boot.json()).session;
    const headers = {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": session.csrfToken,
    };
    const draw = async (body: unknown = { prompt: "Hoa sen và mây" }) =>
      fetch(base + "/patterns/generate", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    assert.equal(
      (
        await fetch(base + "/patterns/generate", {
          method: "POST",
          headers: { ...headers, "X-CSRF-Token": "" },
          body: JSON.stringify({ prompt: "Hoa sen và mây" }),
        })
      ).status,
      403,
    );
    assert.equal((await draw({ prompt: "x" })).status, 400);
    mode = "failure";
    assert.equal((await draw()).status, 500);
    mode = "invalid";
    assert.equal((await draw()).status, 502);
    let status = await fetch(base + "/auth/session", { headers }).then((r) =>
      r.json(),
    );
    assert.equal(status.session.usage.aiUsed, 0);
    mode = "success";
    const response = await draw();
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.session.usage.aiUsed, 1);
    const pattern = patternSchema.parse({
      ...defaultPattern,
      motifId: "custom",
      custom: data.motif,
      placement: "side",
    });
    const look = manualLook({ ...defaultRequest, pattern });
    const {
      id,
      garmentName,
      eventName,
      accessories,
      culturalFacts,
      cautionRules,
      isFallback,
      ...payload
    } = look;
    const save = await fetch(base + "/lookbook", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    assert.equal(save.status, 201);
    const loaded = await fetch(base + "/lookbook", { headers }).then((r) =>
      r.json(),
    );
    assert.deepEqual(loaded.looks[0].pattern, pattern);
    const body = store.db
      .prepare("SELECT body FROM looks WHERE actor_id=?")
      .get(session.actorId)!.body;
    assert.deepEqual(JSON.parse(String(body)).pattern, pattern);
    const actor = store.findSession(cookie.split("=")[1])!;
    store.finishAi(store.reserveAi(actor), true); // One recommendation consumes the same allowance.
    assert.equal((await draw()).status, 200);
    assert.equal((await draw()).status, 429);
    status = await fetch(base + "/auth/session", { headers }).then((r) =>
      r.json(),
    );
    assert.equal(status.session.usage.aiUsed, 3);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
  }
});
