import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function openRoom(page: Page, supported = true) {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Phòng 3D", exact: true })
    .click();
  await expect(page.getByTestId("fitting3d-viewport")).toHaveAttribute(
    "data-render-state",
    supported ? "ready" : "unsupported",
    { timeout: 20000 },
  );
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn");
}

test("3D viewport renders a real scene and remains within desktop and mobile widths", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openRoom(page);
  const viewport = page.getByTestId("fitting3d-viewport");
  const canvas = viewport.locator("canvas");
  await expect(canvas).toBeVisible();
  const dimensions = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height,
  }));
  expect(dimensions.width).toBeGreaterThan(200);
  expect(dimensions.height).toBeGreaterThan(300);
  await viewport.screenshot({
    path: `test-results/${info.project.name}-fitting3d.png`,
    style: ".site-header {visibility:hidden}",
  });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${info.project.name}-fitting3d-page.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("garments, mannequin, colors, layers, pose and camera change the rendered scene and PNG export", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoom(page);
  const viewport = page.getByTestId("fitting3d-viewport");
  const canvas = viewport.locator("canvas");
  for (const [name, id] of [
    ["Áo dài", "ao_dai"],
    ["Áo dài cách tân", "ao_dai_cach_tan"],
    ["Áo tấc / tay thụng", "ao_tac"],
    ["Áo Nhật bình", "nhat_binh"],
    ["Áo Giao lĩnh", "giao_linh"],
    ["Áo Đối khâm", "doi_kham"],
    ["Áo ngũ thân tay chẽn", "ao_ngu_than"],
  ]) {
    await page
      .getByRole("button", { name: `Thử 3D ${name}`, exact: true })
      .click();
    await expect(viewport).toHaveAttribute("data-garment", id);
    await expect(viewport).toHaveAttribute("data-render-state", "ready");
  }
  await page.getByRole("button", { name: "Mẫu nam 3D", exact: true }).click();
  await expect(viewport).toHaveAttribute("data-gender", "nam");
  await page.getByRole("tab", { name: "Màu & vải", exact: true }).click();
  const before = await canvas.screenshot();
  await page.getByLabel("Màu áo 3D", { exact: true }).fill("#bc4749");
  await expect(page.getByLabel("Màu áo 3D", { exact: true })).toHaveValue(
    "#bc4749",
  );
  const after = await canvas.screenshot();
  expect(
    after.equals(before),
    "changing garment color must change rendered pixels",
  ).toBe(false);
  await page.getByRole("button", { name: /^Gấm/ }).click();
  await expect(page.getByRole("button", { name: /^Gấm/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const camera = page.getByRole("group", { name: "Góc nhìn 3D" });
  await camera.getByRole("button", { name: "Cổ & khăn", exact: true }).click();
  await expect(
    camera.getByRole("button", { name: "Cổ & khăn", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const closeup = await canvas.screenshot();
  expect(
    closeup.equals(after),
    "camera preset must change the visible scene",
  ).toBe(false);
  await camera.getByRole("button", { name: "Toàn thân", exact: true }).click();
  const pose = page.getByRole("group", { name: "Tư thế 3D" });
  await pose
    .getByRole("button", { name: "Nghiêng cầm quạt", exact: true })
    .click();
  await expect(
    pose.getByRole("button", { name: "Nghiêng cầm quạt", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const layers = page.getByRole("group", { name: "Các lớp phục trang 3D" });
  await layers.getByRole("button", { name: /Áo chính/ }).click();
  await expect(
    layers.getByRole("button", { name: /Áo chính/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await layers.getByRole("button", { name: /Áo chính/ }).click();
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Chụp ảnh 3D", exact: true }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("viet-phuc-3d.png");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.length).toBeGreaterThan(10000);
});

test("adult male and female proportions frame correctly with fitted garments and inner layers", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoom(page);
  await page
    .getByRole("button", { name: "Thử 3D Áo dài", exact: true })
    .click();
  const viewport = page.getByTestId("fitting3d-viewport");
  await expect(page.getByTestId("body-proportion-label")).toContainText(
    "166 cm",
  );
  await expect(viewport).toHaveAttribute("data-body-height", "1.66");
  const layer = page
    .getByRole("group", { name: "Các lớp phục trang 3D" })
    .getByRole("button", { name: /Lớp lót/ });
  await layer.click();
  const female = await viewport.screenshot({
    path: `test-results/${info.project.name}-adult-female.png`,
    style: ".site-header{visibility:hidden}",
  });
  await page.getByRole("button", { name: "Mẫu nam 3D", exact: true }).click();
  await expect(page.getByTestId("body-proportion-label")).toContainText(
    "178 cm",
  );
  await expect(viewport).toHaveAttribute("data-body-height", "1.78");
  const male = await viewport.screenshot({
    path: `test-results/${info.project.name}-adult-male.png`,
    style: ".site-header{visibility:hidden}",
  });
  expect(male.equals(female)).toBe(false);
  await page
    .getByRole("button", { name: "Nghiêng cầm quạt", exact: true })
    .click();
  const posed = await viewport.screenshot();
  expect(posed.equals(male)).toBe(false);
  await expect(viewport).toHaveAttribute("data-render-state", "ready");
});

test("smooth GLB mannequins support A-pose inspection and live modular dressing without black wireframe", async ({page},info)=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await openRoom(page);
  const viewport=page.getByTestId("fitting3d-viewport");
  await expect(viewport).toHaveAttribute("data-engine","gltf");
  await page.getByRole("button",{name:"Mẫu trơn A-pose",exact:true}).click();
  await expect(viewport).toHaveAttribute("data-mannequin","true");
  await expect(viewport).toHaveAttribute("data-render-state","ready");
  await viewport.screenshot({path:`test-results/${info.project.name}-smooth-female.png`,style:".site-header{visibility:hidden}"});
  await page.getByRole("button",{name:"Mẫu nam 3D",exact:true}).click();
  await expect(viewport).toHaveAttribute("data-gender","nam");
  await expect(viewport).toHaveAttribute("data-render-state","ready");
  await viewport.screenshot({path:`test-results/${info.project.name}-smooth-male.png`,style:".site-header{visibility:hidden}"});
  await expect(viewport).toHaveAttribute("data-wireframe","false");
  await page.getByRole("button",{name:"Thử trang phục",exact:true}).click();
  await page.getByRole("button",{name:"Thử 3D Áo dài",exact:true}).click();
  await expect(viewport).toHaveAttribute("data-mannequin","false");
  await expect(viewport).toHaveAttribute("data-render-state","ready");
  const clothed=await viewport.locator("canvas").screenshot();
  await page.getByRole("tab",{name:"Màu & vải",exact:true}).click();
  await page.getByLabel("Màu áo 3D",{exact:true}).fill("#2e5b88");
  await expect(viewport).toHaveAttribute("data-render-state","ready");
  const colored=await viewport.locator("canvas").screenshot();
  expect(colored.equals(clothed)).toBe(false);
});

test("cultural story links remain source-grounded and strict mode never certifies procedural models", async ({
  page,
}) => {
  await openRoom(page);
  await page
    .getByRole("button", { name: "Kiểm tra phục chế", exact: true })
    .click();
  await expect(page.locator(".fitting-cultural-status")).toContainText(
    "Chưa đủ căn cứ để chứng nhận phục chế",
  );
  await page.getByRole("tab", { name: "Câu chuyện", exact: true }).click();
  await expect(page.locator(".fitting-story a").first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await page
    .getByRole("button", { name: "Thử 3D Áo Nhật bình", exact: true })
    .click();
  await expect(page.locator(".fitting-cultural-status")).toContainText(
    "Chưa đủ căn cứ để chứng nhận phục chế",
  );
  await expect(page.getByRole("tabpanel")).toContainText(
    "Tư liệu cho variant này đang được bổ sung",
  );
  await expect(page.locator(".fitting-story")).toHaveCount(0);
});

test("saved 3D state survives reload, guest migration and a later member login", async ({
  page,
}) => {
  const email = `fitting-${randomUUID()}@example.test`;
  const password = "Fitting-demo-2026!";
  await openRoom(page);
  await page
    .getByLabel("Tên bản phối 3D", { exact: true })
    .fill("Dáng áo kỷ yếu");
  await page
    .getByRole("button", { name: "Thử 3D Áo tấc / tay thụng", exact: true })
    .click();
  await page.getByRole("button", { name: "Mẫu nam 3D", exact: true }).click();
  await page.getByRole("tab", { name: "Màu & vải", exact: true }).click();
  await page.getByLabel("Màu áo 3D", { exact: true }).fill("#6d426f");
  await page
    .getByRole("button", { name: "Lưu bản phối 3D", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("1/3 bản phối");
  const saved = await (await page.request.get("/api/fitting3d/outfits")).json();
  expect(saved.looks).toHaveLength(1);
  expect(saved.looks[0]).toMatchObject({
    title: "Dáng áo kỷ yếu",
    outfit: { garmentId: "ao_tac", gender: "nam", colors: { main: "#6D426F" } },
  });
  await openRoom(page);
  await page.getByRole("tab", { name: "Tủ đồ 3D", exact: true }).click();
  await expect(page.locator(".fitting-saved-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Mở bản phối 3D", exact: true })
    .click();
  await expect(page.getByTestId("fitting3d-viewport")).toHaveAttribute(
    "data-garment",
    "ao_tac",
  );
  await expect(page.getByTestId("fitting3d-viewport")).toHaveAttribute(
    "data-gender",
    "nam",
  );
  await page.getByRole("tab", { name: "Màu & vải", exact: true }).click();
  await expect(page.getByLabel("Màu áo 3D", { exact: true })).toHaveValue(
    "#6d426f",
  );
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên của bạn").fill("Bạn 3D");
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await dialog.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await dialog.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
  await dialog
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tài khoản của Bạn 3D", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("1/100 bản phối");
  await page
    .getByRole("button", { name: "Tài khoản của Bạn 3D", exact: true })
    .click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.getByRole("tab", { name: "Tủ đồ 3D", exact: true }).click();
  await expect(page.locator(".fitting-saved-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await dialog.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await dialog
    .getByRole("button", { name: "Đăng nhập vào tài khoản", exact: true })
    .click();
  await expect(page.locator(".fitting-saved-card")).toHaveCount(1);
  await expect(page.locator(".fitting-saved-card")).toContainText(
    "Dáng áo kỷ yếu",
  );
});

test("2D and 3D wardrobes share the guest cap and offer registration when full", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Phòng phối đồ", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn");
  await page
    .getByRole("button", { name: "Lưu bản phối này", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("1/3 bản phối");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Phòng 3D", exact: true })
    .click();
  await expect(page.getByTestId("fitting3d-viewport")).toHaveAttribute(
    "data-render-state",
    "ready",
    { timeout: 20000 },
  );
  for (const count of [2, 3]) {
    await page
      .getByLabel("Tên bản phối 3D", { exact: true })
      .fill(`Bản phối 3D ${count}`);
    await page
      .getByRole("button", { name: "Lưu bản phối 3D", exact: true })
      .click();
    await expect(
      page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
    ).toContainText(`${count}/3 bản phối`);
    await page
      .getByRole("button", { name: "Đặt lại phòng 3D", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Lưu bản phối 3D", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const data = await (await page.request.get("/api/fitting3d/outfits")).json();
  expect(data.looks).toHaveLength(2);
  expect(data.session.usage.lookbookCount).toBe(3);
});

test("AI suggestions update the live outfit but a delayed response cannot overwrite later edits", async ({
  page,
}) => {
  await openRoom(page);
  await page.getByRole("tab", { name: "AI Stylist", exact: true }).click();
  await page
    .getByLabel("Yêu cầu AI 3D", { exact: true })
    .fill("Phối đỏ gạch cho ngày hội văn hóa");
  await page
    .getByRole("button", { name: "Gợi ý AI cho 3D", exact: true })
    .click();
  const apply = page.getByRole("button", {
    name: "Áp dụng gợi ý 3D",
    exact: true,
  });
  await expect(apply.first()).toBeEnabled();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn 2/3");
  await apply.nth(1).click();
  await page.getByRole("tab", { name: "Màu & vải", exact: true }).click();
  await expect(page.getByLabel("Màu áo 3D", { exact: true })).toHaveValue(
    "#bc4749",
  );
  await page.getByRole("tab", { name: "AI Stylist", exact: true }).click();
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const hasRequest = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/fitting3d/stylist", async (route) => {
    const response = await route.fetch();
    started();
    await hold;
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Gợi ý AI cho 3D", exact: true })
    .click();
  await hasRequest;
  await page
    .getByRole("button", { name: "Thử 3D Áo Nhật bình", exact: true })
    .click();
  release();
  await expect(page.locator(".fitting-stale")).toContainText(
    "Bạn đã thay đổi bản phối",
  );
  await expect(apply.first()).toBeDisabled();
  await expect(page.getByTestId("fitting3d-viewport")).toHaveAttribute(
    "data-garment",
    "nhat_binh",
  );
  await page.getByRole("tab", { name: "Màu & vải", exact: true }).click();
  await expect(page.getByLabel("Màu áo 3D", { exact: true })).toHaveValue(
    "#bc4749",
  );
});

test("3D artwork and handheld accessories render, open mesh stories and survive AI and saving", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoom(page);
  const canvas = page.getByTestId("fitting3d-viewport").locator("canvas");
  await page.getByRole("tab", { name: "Hoa văn", exact: true }).click();
  const before = await canvas.screenshot();
  await page.getByRole("button", { name: "Hoa văn Rồng", exact: true }).click();
  await page.getByRole("button", { name: "Viền gấu", exact: true }).click();
  const decorated = await canvas.screenshot();
  expect(decorated.equals(before)).toBe(false);
  await page.getByRole("tab", { name: "Phụ kiện", exact: true }).click();
  await page
    .getByRole("button", { name: "Phụ kiện 3D Nón lá", exact: false })
    .click();
  await page.getByRole("button", { name: /Phụ kiện 3D Khăn vấn/ }).click();
  const accessorized = await canvas.screenshot();
  expect(accessorized.equals(decorated)).toBe(false);
  const box = await canvas.boundingBox();
  await canvas.click({
    position: { x: box!.width / 2, y: box!.height * 0.54 },
  });
  await expect(
    page.getByRole("tab", { name: "Câu chuyện", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "AI Stylist", exact: true }).click();
  await page
    .getByRole("button", { name: "Gợi ý AI cho 3D", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Áp dụng gợi ý 3D", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Lưu bản phối 3D", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cập nhật bản phối", exact: true }),
  ).toBeEnabled();
  const saved = await (await page.request.get("/api/fitting3d/outfits")).json();
  expect(saved.looks[0].outfit.pattern).toMatchObject({
    motifId: "dragon",
    placement: "hem",
  });
  expect(saved.looks[0].outfit.accessories).toEqual(
    expect.arrayContaining(["acc_non_la", "acc_khan_van"]),
  );
});

test("unavailable WebGL shows a usable 2D fallback without breaking the rest of the app", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await openRoom(page, false);
  const viewport = page.getByTestId("fitting3d-viewport");
  await expect(
    viewport.getByText("Thiết bị chưa hỗ trợ WebGL", { exact: true }),
  ).toBeVisible();
  await expect(viewport.locator("svg.garment-svg")).toBeVisible();
  await viewport
    .getByRole("button", { name: "Thử lại 3D", exact: true })
    .click();
  await expect(viewport).toHaveAttribute("data-render-state", "unsupported");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Phòng phối đồ", exact: true })
    .click();
  await expect(page.locator(".preview-canvas .garment-svg")).toBeVisible();
  expect(errors).toEqual([]);
});
