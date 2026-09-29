import { expect, test } from "@playwright/test";

test("discovery, cultural dialog and responsive layout", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nét Việt. Chất riêng." }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: `test-results/${info.project.name}-explore.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Câu chuyện trang phục" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("link")).toHaveAttribute(
    "href",
    /vietnam.travel/,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("live colors and all accessories, exclusive footwear, save/reload, compare and undo delete", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await page
    .getByRole("button", { name: "Màu áo: Đỏ gạch nung", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: /Minh họa áo ngũ thân, màu áo #BC4749/ }),
  ).toBeVisible();
  const red = page.getByRole("button", {
    name: "Màu áo: Đỏ gạch nung",
    exact: true,
  });
  await expect(red).toHaveCSS("background-color", "rgb(188, 71, 73)");
  for (const [label, id] of [
    ["Kiềng bạc", "acc_kieng_bac"],
    ["Khăn vấn", "acc_khan_van"],
    ["Nón lá", "acc_non_la"],
    ["Túi cói", "acc_tui_coi"],
    ["Kính râm retro", "acc_kinh_ram"],
  ] as const) {
    await page.getByRole("button", { name: new RegExp(label) }).click();
    await expect(page.locator(`[data-accessory="${id}"]`)).toBeVisible();
  }
  await page.getByRole("button", { name: /Guốc mộc/ }).click();
  await expect(page.locator('[data-accessory="acc_guoc_moc"]')).toBeVisible();
  await expect(
    page.locator('[data-accessory="acc_sneaker_trang"]'),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu bản phối này" }).click();
  await page
    .getByRole("button", { name: "Màu áo: Tím hoa cà", exact: true })
    .click();
  await page.getByRole("button", { name: "Lưu bản phối này" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: `test-results/${info.project.name}-studio.png`,
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Lookbook/ })
    .click();
  await expect(page.locator(".saved-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "So sánh", exact: true })
    .nth(0)
    .click();
  await page
    .getByRole("button", { name: "So sánh", exact: true })
    .nth(1)
    .click();
  await expect(
    page.getByRole("region", { name: "So sánh hai bản phối" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: `test-results/${info.project.name}-lookbook.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /^Xóa / }).first().click();
  await expect(page.locator(".saved-card")).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "So sánh hai bản phối" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Hoàn tác", exact: true }).click();
  await expect(page.locator(".saved-card")).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("recommendation API, apply correct event, preserve style and export", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Thử phối áo dài", exact: true })
    .click();
  await page.getByLabel("Bạn sẽ mặc vào dịp nào?").selectOption("du_xuan");
  await page.getByRole("button", { name: /Tối giản/ }).click();
  await page.getByRole("button", { name: "Gợi ý cùng Gemini" }).click();
  await expect(page.locator(".look-card").first()).toBeVisible();
  expect(await page.locator(".look-card").count()).toBeLessThanOrEqual(3);
  await expect(
    page.getByText("Gợi ý mẫu — chưa sử dụng Gemini.", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: `test-results/${info.project.name}-recommend.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Thử bản phối" }).first().click();
  await expect(page.getByLabel("Bạn sẽ mặc vào dịp nào?")).toHaveValue(
    "du_xuan",
  );
  await expect(
    page.getByRole("button", { name: "Áo dài", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Tối giản/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Lưu bản phối này" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Lookbook/ })
    .click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất lookbook" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "viet-phuc-lookbook.json",
  );
});

test("offline backend and corrupted local storage keep the app usable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("viet_phuc_lookbook_v1", "{broken"),
  );
  await page.route("**/api/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Chưa đọc được lookbook");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await page.getByRole("button", { name: "Gợi ý cùng Gemini" }).click();
  await expect(page.locator(".look-card").first()).toBeVisible();
  expect(await page.locator(".look-card").count()).toBeLessThanOrEqual(3);
  await expect(page.getByText(/Kết nối hiện chưa sẵn sàng/)).toBeVisible();
});
