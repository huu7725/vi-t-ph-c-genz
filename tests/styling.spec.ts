import { expect, test } from "@playwright/test";

test("custom colors, palette tools and new accessories survive recommendations and wardrobe", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn");
  const colors = page.getByRole("region", { name: "Phối màu linh hoạt" });
  const preview = page.locator(".preview-canvas .garment-svg");
  const hexTop = page.getByRole("textbox", { name: "Mã HEX màu áo" });
  const hexPants = page.getByRole("textbox", { name: "Mã HEX màu quần" });
  await hexTop.fill("#INVALID"); // maxLength truncation must not leak invalid CSS.
  await page
    .getByRole("button", { name: "Áp dụng màu áo", exact: true })
    .click();
  await expect(colors.getByRole("alert")).toContainText("6 ký tự HEX");
  await expect(preview).toHaveAttribute("aria-label", /màu áo #1E5E58/);
  await hexTop.fill("426e83");
  await hexTop.press("Enter");
  await expect(hexTop).toHaveValue("#426E83");
  await expect(preview).toHaveAttribute("aria-label", /màu áo #426E83/);
  await page.getByRole("button", { name: "Đổi màu áo ↔ quần" }).click();
  await expect(hexPants).toHaveValue("#426E83");
  await expect(hexTop).toHaveValue("#FDFBF7");
  await page
    .getByRole("button", { name: "Phối đồng màu", exact: true })
    .click();
  await expect(hexPants).toHaveValue("#FDFBF7");
  await page
    .getByRole("button", { name: "Bảng màu Mơ tím", exact: true })
    .click();
  await expect(hexTop).toHaveValue("#C6B5DD");
  await expect(hexPants).toHaveValue("#FDFBF7");
  await page
    .getByRole("button", { name: "Màu áo: Xanh mint", exact: true })
    .click();
  await expect(hexTop).toHaveValue("#B7D7C4");
  await hexTop.fill("#426e83");
  await page
    .getByRole("button", { name: "Áp dụng màu áo", exact: true })
    .click();
  await hexPants.fill("#f1dfca");
  await page
    .getByRole("button", { name: "Áp dụng màu quần", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Bỏ chọn tất cả", exact: true })
    .click();
  for (const [name, id] of [
    ["Bông tai ngọc trai", "acc_bong_tai"],
    ["Vòng tay bạc", "acc_vong_tay"],
    ["Kẹp tóc hoa", "acc_kep_hoa"],
    ["Chuỗi ngọc trai", "acc_chuoi_ngoc"],
    ["Túi đeo chéo mini", "acc_tui_deo_cheo"],
    ["Nón lá cầm tay", "acc_non_la"],
    ["Khăn vấn", "acc_khan_van"],
    ["Quạt xếp", "acc_quat_tre"],
    ["Sneakers trắng", "acc_sneaker_trang"],
  ]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await expect(preview.locator(`[data-accessory="${id}"]`)).toBeVisible();
  }
  await page.getByRole("button", { name: /Kiềng bạc/ }).click();
  await expect(
    page.getByRole("button", { name: /Chuỗi ngọc trai/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    preview.locator('[data-accessory="acc_chuoi_ngoc"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Chuỗi ngọc trai/ }).click();
  await expect(preview.locator('[data-accessory="acc_kieng_bac"]')).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: /Túi cói/ }).click();
  await expect(
    preview.locator('[data-accessory="acc_tui_deo_cheo"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Túi đeo chéo mini/ }).click();
  await expect(preview.locator('[data-accessory="acc_tui_coi"]')).toHaveCount(
    0,
  );
  const hat = (await preview
    .locator('[data-accessory="acc_non_la"]')
    .boundingBox())!;
  const headwrap = (await preview
    .locator('[data-accessory="acc_khan_van"]')
    .boundingBox())!;
  expect(hat.y).toBeGreaterThan(headwrap.y + headwrap.height);
  expect(await preview.locator("[data-accessory]").count()).toBe(9);
  await page.evaluate(() => document.fonts.ready);
  await colors.screenshot({
    path: `test-results/${info.project.name}-flexible-colors.png`,
    animations: "disabled",
    style: ".site-header{visibility:hidden}",
  });
  await page
    .locator(".studio-preview")
    .screenshot({
      path: `test-results/${info.project.name}-expanded-accessories.png`,
      animations: "disabled",
      style: ".site-header{visibility:hidden}",
    });
  await page
    .getByRole("button", { name: "Lưu bản phối này", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("1/3 bản phối");
  await page.getByLabel("Bạn sẽ mặc vào dịp nào?").selectOption("ngoai_khoa");
  await page
    .getByRole("button", { name: "Gợi ý cùng Gemini", exact: true })
    .click();
  const first = page.locator(".look-card").first();
  await expect(first.locator(".garment-svg")).toHaveAttribute(
    "aria-label",
    /màu áo #426E83, màu quần #F1DFCA/,
  );
  await expect(first.locator("[data-accessory]")).toHaveCount(9);
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Lookbook/ })
    .click();
  await expect(page.locator(".saved-card")).toHaveCount(1);
  await expect(page.locator(".saved-card [data-accessory]")).toHaveCount(9);
  await page.getByRole("button", { name: "Phối tiếp", exact: true }).click();
  await expect(hexTop).toHaveValue("#426E83");
  await expect(hexPants).toHaveValue("#F1DFCA");
  await page
    .getByRole("button", { name: "Bỏ chọn tất cả", exact: true })
    .click();
  await expect(preview.locator("[data-accessory]")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
