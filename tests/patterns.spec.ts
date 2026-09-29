import { test, expect } from "@playwright/test";

test("motifs, border layout and AI line drawings persist with the garment", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  const panel = page.getByRole("region", { name: "Hoa văn trên áo" });
  const preview = page.locator(".preview-canvas .garment-svg");
  const motif = preview.locator('[data-part="garment-pattern"]');
  for (const [name, id] of [
    ["Hoa sen", "lotus"],
    ["Rồng", "dragon"],
    ["Phượng", "phoenix"],
    ["Mây cuộn", "clouds"],
    ["Trúc", "bamboo"],
  ]) {
    await panel
      .getByRole("button", { name: `Hoa văn ${name}`, exact: true })
      .click();
    await expect(motif).toHaveAttribute("data-motif", id);
  }
  await panel
    .getByRole("button", { name: "Hoa văn Hoa sen", exact: true })
    .click();
  await panel.getByRole("button", { name: "Viền gấu", exact: true }).click();
  await expect(motif).toHaveAttribute("data-placement", "hem");
  await panel.getByRole("slider", { name: "Độ đậm hoa văn" }).fill("1");
  await panel.getByRole("slider", { name: "Độ dày nét hoa văn" }).fill("1.8");
  await expect(motif).toHaveAttribute("opacity", "1");
  await panel
    .getByRole("button", { name: "Hoa văn Không hoa văn", exact: true })
    .click();
  await expect(motif).toHaveCount(0);
  await panel
    .getByRole("button", { name: "Hoa văn Rồng", exact: true })
    .click();
  await page.evaluate(() => document.fonts.ready);
  await panel.screenshot({
    path: `test-results/${info.project.name}-pattern-controls.png`,
    animations: "disabled",
    style: ".site-header{visibility:hidden}",
  });
  await page
    .getByLabel("Nhờ Gemini vẽ hoa văn riêng")
    .fill("Hoa sen và mây cuộn, nét viền thanh mảnh");
  await panel
    .getByRole("button", { name: "Vẽ hoa văn bằng AI", exact: true })
    .click();
  await expect(
    panel.getByText("Sen và mây nét viền", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn 2/3");
  await expect(motif).toHaveAttribute("data-motif", "dragon"); // Preview before applying.
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Lookbook/ })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Phòng phối đồ", exact: true })
    .click();
  await expect(
    panel.getByText("Sen và mây nét viền", { exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Áp dụng hoa văn", exact: true })
    .click();
  await expect(motif).toHaveAttribute("data-motif", "custom");
  await panel.getByRole("button", { name: "Dọc tà", exact: true }).click();
  await page.locator(".studio-preview").screenshot({
    path: `test-results/${info.project.name}-pattern-on-garment.png`,
    animations: "disabled",
    style: ".site-header{visibility:hidden}",
  });
  await page
    .getByRole("button", { name: "Lưu bản phối này", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("1/3 bản phối");
  await page.getByRole("button", { name: /Xem gợi ý mẫu/ }).click();
  await expect(
    page.locator(".look-card").first().locator('[data-part="garment-pattern"]'),
  ).toHaveAttribute("data-motif", "custom");
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Lookbook/ })
    .click();
  await expect(
    page.locator('.saved-card [data-part="garment-pattern"]'),
  ).toHaveAttribute("data-motif", "custom");
  await page.getByRole("button", { name: "Phối tiếp", exact: true }).click();
  await expect(motif).toHaveAttribute("data-placement", "side");
  await page
    .getByLabel("Nhờ Gemini vẽ hoa văn riêng")
    .fill("ERROR mô phỏng dịch vụ lỗi");
  await panel
    .getByRole("button", { name: "Vẽ hoa văn bằng AI", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toBeVisible();
  await expect(motif).toHaveAttribute("data-motif", "custom");
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn 2/3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
