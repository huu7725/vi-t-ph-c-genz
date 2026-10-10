import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import { AuthStore } from "../authStore.js";

test("GET /api/models returns 3D models including female and robot-man", async () => {
  const store = new AuthStore(":memory:");
  const app = createApp({ store });
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/models`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.models));
    assert.ok(data.models.length >= 2);

    const femaleModel = data.models.find((m: any) => m.gender === "female");
    const maleRobot = data.models.find((m: any) => m.gender === "male" && m.id.includes("robot"));

    assert.ok(femaleModel, "Phải có mẫu nữ");
    assert.ok(maleRobot, "Phải có mẫu nam Robot-man");
    assert.ok(femaleModel.file_path_glb.endsWith(".glb"));
    assert.ok(maleRobot.sketchfab_url.includes("sketchfab.com"));
  } finally {
    server.close();
    store.close();
  }
});

test("GET /api/fabrics returns Gấm, Lụa, Nhung fabrics", async () => {
  const store = new AuthStore(":memory:");
  const app = createApp({ store });
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/fabrics`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.fabrics));

    const gam = data.fabrics.find((f: any) => f.id === "gam_hoa_van");
    const lua = data.fabrics.find((f: any) => f.id === "lua_bong");
    const nhung = data.fabrics.find((f: any) => f.id === "nhung_cao_cap");

    assert.ok(gam, "Phải có chất liệu Gấm hoa văn");
    assert.ok(lua, "Phải có chất liệu Lụa bóng");
    assert.ok(nhung, "Phải có chất liệu Nhung cao cấp");
  } finally {
    server.close();
    store.close();
  }
});

test("POST /api/try-on saves user measurements and returns try-on JSON configuration", async () => {
  const store = new AuthStore(":memory:");
  const app = createApp({ store });
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const body = {
      model_id: "nu_truyentong_gam",
      fabric_id: "gam_hoa_van",
      measurements: {
        height: 165,
        weight: 52,
        chest: 84,
        waist: 64,
        hip: 90,
      },
    };

    const res = await fetch(`http://127.0.0.1:${port}/api/try-on`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.measurement_id);
    assert.equal(data.model.id, "nu_truyentong_gam");
    assert.equal(data.fabric.id, "gam_hoa_van");
    assert.ok(data.try_on_configuration.scale);
    assert.equal(data.try_on_configuration.size, "M");

    // Verify row inserted in SQLite
    const row = store.db
      .prepare("SELECT * FROM user_measurements WHERE id = ?")
      .get(data.measurement_id) as any;
    assert.ok(row);
    assert.equal(row.height, 165);
    assert.equal(row.weight, 52);
  } finally {
    server.close();
    store.close();
  }
});

test("POST /api/ai-consultant returns structured fashion consultation", async () => {
  const store = new AuthStore(":memory:");
  const app = createApp({ store });
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const body = {
      height: 162,
      weight: 50,
      color_preference: "Đỏ gấm và Vàng hoàng gia",
      model_type: "female_traditional",
    };

    const res = await fetch(`http://127.0.0.1:${port}/api/ai-consultant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.consultation.size_recommendation);
    assert.ok(data.consultation.optimal_fabric);
    assert.ok(data.consultation.accessories_advice.length >= 2);
  } finally {
    server.close();
    store.close();
  }
});

test("GET /api/prompts/3d-generators returns standard 3D AI prompts & guidelines", async () => {
  const store = new AuthStore(":memory:");
  const app = createApp({ store });
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/prompts/3d-generators`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.base_body_prompts.female.prompt.includes("Vietnamese woman"));
    assert.ok(data.base_body_prompts.male.prompt.includes("Vietnamese man"));
    assert.ok(data.garment_prompts.ao_dai_nu.prompt.includes("Áo Dài"));
    assert.ok(data.garment_prompts.ao_ngu_than_nam.prompt.includes("brocade"));
    assert.ok(data.garment_prompts.ao_nhat_binh.prompt.includes("Nguyen Dynasty"));
    assert.ok(data.technical_guidelines.mesh_separation.parts.includes("Body_Base"));
  } finally {
    server.close();
    store.close();
  }
});
