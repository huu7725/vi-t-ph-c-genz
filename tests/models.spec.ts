import { expect, test } from "@playwright/test";

test("handheld conical hat leaves the face and headwrap clear across models, garments and saved looks", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn");
  const preview = page.locator(".preview-canvas .garment-svg");
  await page
    .getByRole("button", { name: "Màu áo: Trắng ngà", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Màu quần: Đỏ gạch nung", exact: true })
    .click();
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".studio-preview").screenshot({
    path: `test-results/${info.project.name}-female-new.png`,
    animations: "disabled",
    style: ".site-header { visibility: hidden; }",
  });
  await page.getByRole("button", { name: /Nón lá cầm tay/ }).click();
  await page.getByRole("button", { name: /Kính râm retro/ }).click();
  for (const garment of ["Áo ngũ thân", "Áo dài"]) {
    await page.getByRole("button", { name: garment, exact: true }).click();
    for (const model of ["Mẫu nữ", "Mẫu nam"]) {
      await page
        .getByRole("group", { name: "Chọn mẫu thử" })
        .getByRole("button", { name: new RegExp(model) })
        .click();
      const frame = (await preview.boundingBox())!;
      const crown = (await preview
        .locator('[data-part="held-hat"]')
        .boundingBox())!;
      const glasses = (await preview
        .locator('[data-accessory="acc_kinh_ram"]')
        .boundingBox())!;
      expect(crown.y).toBeGreaterThan(frame.y);
      expect(crown.y).toBeGreaterThan(glasses.y + glasses.height);
      expect(crown.y + crown.height).toBeLessThan(frame.y + frame.height);
      expect(crown.x).toBeGreaterThan(frame.x);
      expect(crown.x + crown.width).toBeLessThan(frame.x + frame.width);
      if (model === "Mẫu nữ" && garment === "Áo ngũ thân") {
        await page.locator(".studio-preview").screenshot({
          path: `test-results/${info.project.name}-female-hat.png`,
          animations: "disabled",
          style: ".site-header { visibility: hidden; }",
        });
      }
    }
  }
  await page
    .getByRole("group", { name: "Chọn mẫu thử" })
    .getByRole("button", { name: /Mẫu nữ/ })
    .click();
  await page.getByRole("button", { name: /Khăn vấn/ }).click();
  await expect(preview.locator('[data-accessory="acc_non_la"]')).toBeVisible();
  await expect(
    preview.locator('[data-accessory="acc_khan_van"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Lưu bản phối này", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("1/3 bản phối");
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Lookbook/ })
    .click();
  const saved = page.locator(".saved-card .garment-svg");
  await expect(saved).toHaveAttribute("data-gender", "nu");
  await expect(saved.locator('[data-accessory="acc_non_la"]')).toBeVisible();
  await page.getByRole("button", { name: "Phối tiếp" }).click();
  await page.getByRole("button", { name: /Nón lá cầm tay/ }).click();
  await expect(preview.locator('[data-accessory="acc_non_la"]')).toHaveCount(0);
  await expect(
    preview.locator('[data-accessory="acc_kinh_ram"]'),
  ).toBeVisible();
  await expect(
    preview.locator('[data-accessory="acc_khan_van"]'),
  ).toBeVisible();
});

test("Vietnamese fonts load and the complete headline fits narrow and wide screens", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".hero h1")).toHaveCSS(
    "font-family",
    '"Noto Serif", serif',
  );
  const fonts = await page.evaluate(() => ({
    regular: document.fonts.check('400 48px "Noto Serif"', "Nét Việt."),
    italic: document.fonts.check('italic 400 48px "Noto Serif"', "Chất riêng."),
    body: document.fonts.check('400 14px "Be Vietnam Pro"', "Phòng phối đồ"),
    loaded: [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => f.family),
  }));
  expect(fonts.regular && fonts.italic && fonts.body).toBe(true);
  expect(fonts.loaded).toContain("Noto Serif");
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const headline = await page.locator(".hero h1 em").boundingBox();
    expect(headline).not.toBeNull();
    expect(headline!.x).toBeGreaterThanOrEqual(0);
    expect(headline!.x + headline!.width).toBeLessThanOrEqual(width);
    const overflow = await page.evaluate(() => ({
      width: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll("body *")]
        .filter(
          (el) => el.getBoundingClientRect().right > window.innerWidth + 1,
        )
        .slice(0, 10)
        .map((el) => ({
          tag: el.tagName,
          class: el.getAttribute("class"),
          right: el.getBoundingClientRect().right,
        })),
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
      width,
    );
  }
  await page.screenshot({
    path: `test-results/${info.project.name}-fonts.png`,
    animations: "disabled",
    fullPage: true,
  });
});

test("distinct male and female models persist through recommendations, save, reload and compare", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn");
  const selector = page.getByRole("group", { name: "Chọn mẫu thử" });
  const preview = page.locator(".preview-canvas .garment-svg");
  const paths = new Set<string>();
  for (const garment of ["Áo dài", "Áo ngũ thân"]) {
    await page.getByRole("button", { name: garment, exact: true }).click();
    for (const gender of ["nữ", "nam"]) {
      await selector
        .getByRole("button", { name: new RegExp(`Mẫu ${gender}`) })
        .click();
      await expect(preview).toHaveAttribute(
        "data-gender",
        gender === "nam" ? "nam" : "nu",
      );
      paths.add((await preview.getByTestId("garment-body").getAttribute("d"))!);
      await page.evaluate(() => document.fonts.ready);
      await page.locator(".studio-preview").screenshot({
        path: `test-results/${info.project.name}-${garment === "Áo dài" ? "aodai" : "nguthan"}-${gender === "nam" ? "nam" : "nu"}.png`,
        animations: "disabled",
      });
    }
  }
  expect(paths.size).toBe(4);
  // Same outfit and colours, different model: both must be independently saved.
  await page
    .getByRole("button", { name: "Lưu bản phối này", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("1/3 bản phối");
  await selector.getByRole("button", { name: /Mẫu nữ/ }).click();
  await page
    .getByRole("button", { name: "Lưu bản phối này", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("2/3 bản phối");
  await selector.getByRole("button", { name: /Mẫu nam/ }).click();
  await page.getByLabel("Bạn sẽ mặc vào dịp nào?").selectOption("ngoai_khoa");
  await page
    .getByRole("button", { name: "Gợi ý cùng Gemini", exact: true })
    .click();
  await expect(page.locator(".look-card").first()).toBeVisible();
  for (const svg of await page.locator(".look-card .garment-svg").all())
    await expect(svg).toHaveAttribute("data-gender", "nam");
  await page.getByRole("button", { name: "Thử bản phối" }).first().click();
  await expect(
    selector.getByRole("button", { name: /Mẫu nam/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Lookbook/ })
    .click();
  await expect(page.locator(".saved-card")).toHaveCount(2);
  await expect(page.locator('.saved-card svg[data-gender="nam"]')).toHaveCount(
    1,
  );
  await expect(page.locator('.saved-card svg[data-gender="nu"]')).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "So sánh", exact: true })
    .nth(0)
    .click();
  await page
    .getByRole("button", { name: "So sánh", exact: true })
    .nth(1)
    .click();
  const compare = page.getByRole("region", { name: "So sánh hai bản phối" });
  await expect(compare.locator('svg[data-gender="nam"]')).toHaveCount(1);
  await expect(compare.locator('svg[data-gender="nu"]')).toHaveCount(1);
  await compare.screenshot({
    path: `test-results/${info.project.name}-two-models.png`,
    animations: "disabled",
  });
  await page
    .locator(".saved-card")
    .filter({ has: page.locator('svg[data-gender="nam"]') })
    .getByRole("button", { name: "Phối tiếp" })
    .click();
  await expect(
    selector.getByRole("button", { name: /Mẫu nam/ }),
  ).toHaveAttribute("aria-pressed", "true");
});
