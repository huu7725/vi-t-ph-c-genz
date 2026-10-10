import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { AuthStore } from "../authStore.js";
import { createApp } from "../app.js";
import { defaultRequest, manualLook } from "../domain.js";
import {
  defaultFittingOutfit,
  fittingOutfitSchema,
  validateFittingCulture,
  type FittingStylistRequest,
} from "../fitting3d/model.js";
import {
  fallbackFittingSuggestions,
  runFittingStylist,
  type FittingStylistProvider,
} from "../fitting3d/stylist.js";
import { listFittingLooks } from "../fitting3d/routes.js";

const ai: FittingStylistProvider = async (request) => ({
  ...fallbackFittingSuggestions(request),
  source: "gemini",
  note: "Provider giả lập cho kiểm thử.",
});
const request = (
  overrides: Partial<FittingStylistRequest> = {},
): FittingStylistRequest => ({
  outfit: structuredClone(defaultFittingOutfit),
  prompt: "Thanh lịch với xanh ngọc",
  requestId: randomUUID(),
  ...overrides,
});
async function fixture(
  stylist: FittingStylistProvider = ai,
  providedStore?: AuthStore,
) {
  const store = providedStore || new AuthStore(":memory:");
  const server = createApp({ store, fittingStylist: stylist }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  function client() {
    const auth = store.createGuest();
    return {
      auth,
      async call(
        url: string,
        method = "GET",
        body?: unknown,
        extraHeaders: Record<string, string> = {},
      ) {
        const res = await fetch(base + url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Cookie: `vpr_guest=${auth.token}`,
            "X-CSRF-Token": auth.session.csrf,
            ...extraHeaders,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { res, data: await res.json() };
      },
    };
  }
  return {
    store,
    client,
    base,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      store.close();
    },
  };
}

test("fitting schema rejects unknown assets, layer injection, mutually exclusive shoes and unsafe colors", () => {
  assert.ok(fittingOutfitSchema.safeParse(defaultFittingOutfit).success);
  for (const patch of [
    { garmentId: "https://evil.test/model.glb" },
    { accessories: ["acc_guoc_moc", "acc_hai"] },
    { accessories: ["acc_unknown"] },
    {
      colors: {
        ...defaultFittingOutfit.colors,
        main: "url(javascript:alert(1))",
      },
    },
    { layers: { ...defaultFittingOutfit.layers, role: "admin" } },
    { styleId: "invented" },
  ])
    assert.equal(
      fittingOutfitSchema.safeParse({ ...defaultFittingOutfit, ...patch })
        .success,
      false,
    );
  const verdict = validateFittingCulture({
    ...defaultFittingOutfit,
    mode: "strict",
    garmentId: "nhat_binh",
  });
  assert.equal(verdict.status, "unverified");
  assert.equal(verdict.certified, false);
});

test("3D wardrobe round-trips patterns and colors; save conflict and owner checks preserve data", async () => {
  const f = await fixture();
  try {
    const a = f.client(),
      b = f.client();
    const outfit = {
      ...defaultFittingOutfit,
      revision: 12,
      garmentId: "nhat_binh",
      colors: { ...defaultFittingOutfit.colors, main: "#AB12EF" },
      pattern: {
        ...defaultFittingOutfit.pattern,
        motifId: "lotus",
        placement: "hem",
      },
    };
    const saved = await a.call("/fitting3d/outfits", "POST", {
      title: "Ngọc & sen",
      outfit,
    });
    assert.equal(saved.res.status, 201);
    assert.equal(saved.data.session.usage.lookbookCount, 1);
    const id = saved.data.id;
    const restored = (await a.call("/fitting3d/outfits")).data.looks[0];
    assert.equal(restored.outfit.colors.main, "#AB12EF");
    assert.equal(restored.outfit.pattern.motifId, "lotus");
    assert.equal(restored.storageVersion, 1);
    assert.equal((await b.call("/fitting3d/outfits")).data.looks.length, 0);
    assert.equal(
      (
        await b.call(`/fitting3d/outfits/${id}`, "PUT", {
          title: "Other",
          outfit,
          storageVersion: 1,
        })
      ).res.status,
      404,
    );
    const changed = await a.call(`/fitting3d/outfits/${id}`, "PUT", {
      title: "New",
      outfit: { ...outfit, revision: 13 },
      storageVersion: 1,
    });
    assert.equal(changed.res.status, 200);
    assert.equal(changed.data.looks[0].storageVersion, 2);
    const stale = await a.call(`/fitting3d/outfits/${id}`, "PUT", {
      title: "Old",
      outfit,
      storageVersion: 1,
    });
    assert.equal(stale.res.status, 409);
    assert.equal(stale.data.code, "OUTFIT_CONFLICT");
    assert.equal(
      (await a.call("/fitting3d/outfits")).data.looks[0].title,
      "New",
    );
    assert.equal(
      (await b.call(`/fitting3d/outfits/${id}`, "DELETE")).res.status,
      404,
    );
    assert.equal(
      (await a.call(`/fitting3d/outfits/${id}`, "DELETE")).data.session.usage
        .lookbookCount,
      0,
    );
  } finally {
    await f.close();
  }
});

test("guest quota is shared both ways between 2D and 3D and guest upgrade transfers both", async () => {
  const f = await fixture();
  try {
    const c = f.client();
    f.store.saveLook(c.auth.session, manualLook(defaultRequest));
    for (let index = 0; index < 2; index++)
      assert.equal(
        (
          await c.call("/fitting3d/outfits", "POST", {
            title: `3D ${index}`,
            outfit: defaultFittingOutfit,
          })
        ).res.status,
        201,
      );
    assert.equal(f.store.snapshot(c.auth.session).usage.lookbookCount, 3);
    assert.equal(
      (
        await c.call("/fitting3d/outfits", "POST", {
          title: "Too many",
          outfit: defaultFittingOutfit,
        })
      ).data.code,
      "LOOKBOOK_LIMIT",
    );
    assert.throws(
      () =>
        f.store.saveLook(
          c.auth.session,
          manualLook({ ...defaultRequest, primaryColor: "#ABCDEF" }),
        ),
      /tối đa 3/,
    );
    const member = f.store.register(
      "Member",
      "member@3d.test",
      "test-only-hash",
      c.auth.session.actorId,
    );
    assert.equal(f.store.getLooks(member.session.actorId).length, 1);
    assert.equal(listFittingLooks(f.store, member.session.actorId).length, 2);
    assert.equal(f.store.snapshot(member.session).usage.lookbookCount, 3);
    assert.equal(f.store.snapshot(c.auth.session).usage.lookbookCount, 0);
  } finally {
    await f.close();
  }
});

test("3D endpoints require session and CSRF; metadata is public", async () => {
  const f = await fixture();
  try {
    assert.equal((await fetch(f.base + "/fitting3d/scene")).status, 200);
    assert.equal((await fetch(f.base + "/fitting3d/outfits")).status, 401);
    const c = f.client();
    assert.equal(
      (
        await c.call(
          "/fitting3d/outfits",
          "POST",
          { title: "x", outfit: defaultFittingOutfit },
          { "X-CSRF-Token": "" },
        )
      ).res.status,
      403,
    );
    assert.equal(
      (
        await c.call("/fitting3d/stylist", "POST", request(), {
          Origin: "https://evil.test",
        })
      ).res.status,
      403,
    );
    assert.equal(
      (
        await c.call(
          "/fitting3d/stylist",
          "POST",
          request({ prompt: "x".repeat(401) }),
        )
      ).res.status,
      400,
    );
  } finally {
    await f.close();
  }
});

test("stylist request replay returns same suggestions without charging again and catches ID reuse", async () => {
  let calls = 0;
  const f = await fixture(async (req) => {
    calls++;
    return ai(req);
  });
  try {
    const c = f.client(),
      input = request();
    const first = await c.call("/fitting3d/stylist", "POST", input);
    assert.equal(first.res.status, 200);
    assert.equal(first.data.source, "gemini");
    assert.equal(first.data.session.usage.aiRemaining, 2);
    const repeat = await c.call("/fitting3d/stylist", "POST", input);
    assert.equal(repeat.res.status, 200);
    assert.equal(repeat.data.session.usage.aiRemaining, 2);
    assert.equal(calls, 1);
    assert.deepEqual(repeat.data.suggestions, first.data.suggestions);
    const conflict = await c.call("/fitting3d/stylist", "POST", {
      ...input,
      prompt: "Other request",
    });
    assert.equal(conflict.res.status, 409);
    assert.equal(conflict.data.code, "REQUEST_CONFLICT");
    await c.call("/fitting3d/stylist", "POST", request());
    await c.call("/fitting3d/stylist", "POST", request());
    assert.equal(
      (await c.call("/fitting3d/stylist", "POST", request())).data.code,
      "AI_LIMIT",
    );
    assert.equal(
      (await c.call("/fitting3d/stylist", "POST", input)).res.status,
      200,
    );
  } finally {
    await f.close();
  }
});

test("invalid or failed AI cannot change protected pattern/layers/mode and never spends quota", async () => {
  let calls = 0;
  const f = await fixture(async (input) => {
    calls++;
    if (calls === 2) throw new Error("secret provider diagnostic");
    const result = await ai(input);
    result.suggestions[0].outfit.pattern = {
      ...input.outfit.pattern,
      motifId: "dragon",
    };
    return result;
  });
  try {
    const c = f.client();
    for (let i = 0; i < 2; i++) {
      const r = await c.call("/fitting3d/stylist", "POST", request());
      assert.equal(r.res.status, 200);
      assert.equal(r.data.source, "fallback");
      assert.equal(r.data.session.usage.aiRemaining, 3);
      assert.deepEqual(
        r.data.suggestions[0].outfit.pattern,
        defaultFittingOutfit.pattern,
      );
      assert.ok(!JSON.stringify(r.data).includes("secret provider"));
    }
  } finally {
    await f.close();
  }
});

test("Gemini delta parser preserves manual artwork and repairs invalid asset once", async () => {
  const input = request({
    outfit: {
      ...defaultFittingOutfit,
      mode: "strict",
      pattern: { ...defaultFittingOutfit.pattern, motifId: "lotus" },
    },
  });
  let calls = 0;
  const result = await runFittingStylist(input, async () => {
    calls++;
    return JSON.stringify({
      suggestions: [
        {
          title: "Màu ngọc",
          reason: "Màu ngọc dịu đi cùng quần sáng.",
          colors: input.outfit.colors,
          fabric: "satin",
          pose: "fan",
          accessories: calls === 1 ? ["invented"] : ["acc_quat_tre"],
        },
      ],
    });
  });
  assert.equal(calls, 2);
  assert.equal(result.source, "gemini");
  assert.equal(result.suggestions[0].outfit.mode, "strict");
  assert.deepEqual(result.suggestions[0].outfit.pattern, input.outfit.pattern);
  assert.equal(
    validateFittingCulture(result.suggestions[0].outfit).certified,
    false,
  );
  assert.equal(
    result.suggestions[0].outfit.revision,
    input.outfit.revision + 1,
  );
  const fallback = await runFittingStylist(
    input,
    async () => '{"suggestions":[{"script":"alert(1)"}]}',
  );
  assert.equal(fallback.source, "fallback");
});

test("new 3D saves and idempotency data survive SQLite reopen", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "vpr-3d-"));
  const filename = path.join(dir, "db.sqlite");
  const f = await fixture(ai, new AuthStore(filename));
  let actorId = "";
  try {
    const c = f.client();
    actorId = c.auth.session.actorId;
    await c.call("/fitting3d/outfits", "POST", {
      title: "Persistent",
      outfit: defaultFittingOutfit,
    });
    await c.call("/fitting3d/stylist", "POST", request());
  } finally {
    await f.close();
  }
  const reopened = new AuthStore(filename);
  try {
    assert.equal(listFittingLooks(reopened, actorId)[0].title, "Persistent");
    assert.equal(
      reopened.db
        .prepare(
          "SELECT count(*) AS n FROM fitting_ai_requests WHERE actor_id=?",
        )
        .get(actorId)?.n,
      1,
    );
  } finally {
    reopened.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
