import { expect, test, type Page } from "@playwright/test";

async function svgPoint(page: Page, x: number, y: number) {
  const canvas = page.getByRole("group", { name: "Vùng trang trí áo" });
  await canvas.scrollIntoViewIfNeeded();
  return canvas.locator("svg.garment-svg").evaluate(
    (svg: SVGSVGElement, p) => {
      const point = svg.createSVGPoint();
      point.x = p.x;
      point.y = p.y;
      const result = point.matrixTransform(svg.getScreenCTM()!);
      return { x: result.x, y: result.y };
    },
    { x, y },
  );
}
async function tapPoint(page: Page, x: number, y: number, touch: boolean) {
  const p = await svgPoint(page, x, y);
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

test("place, drag, resize, rotate, duplicate and undo decorations before saving", async ({
  page,
  isMobile,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await page
    .getByRole("button", { name: "Trang trí trực tiếp", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Trang trí ngay trên áo" });
  const canvas = page.getByRole("group", { name: "Vùng trang trí áo" });
  const art = canvas.locator("[data-placed-motif]");
  await expect(art).toHaveCount(1);
  await dialog
    .getByRole("button", { name: "Đặt Hoa sen", exact: true })
    .click();
  await tapPoint(page, 175, 260, isMobile);
  await expect(art).toHaveCount(2);
  await dialog.getByRole("button", { name: "Chọn & kéo", exact: true }).click();
  const id = await art.last().getAttribute("data-placed-motif");
  await drag(
    page,
    await svgPoint(page, 175, 260),
    await svgPoint(page, 156, 295),
  );
  await expect(canvas.locator(`[data-placed-motif="${id}"]`)).toHaveAttribute(
    "transform",
    /translate\(156 295\)/,
  );
  await dialog
    .getByRole("button", { name: "Hoàn tác trang trí", exact: true })
    .click();
  await expect(canvas.locator(`[data-placed-motif="${id}"]`)).toHaveAttribute(
    "transform",
    /translate\(175 260\)/,
  );
  await dialog
    .getByRole("button", { name: "Làm lại trang trí", exact: true })
    .click();
  await expect(canvas.locator(`[data-placed-motif="${id}"]`)).toHaveAttribute(
    "transform",
    /translate\(156 295\)/,
  );
  await dialog
    .locator(".decoration-chips")
    .getByRole("button", { name: /Hoa sen/ })
    .click();
  const resize = canvas.locator('[data-decoration-action="resize"]');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await resize.boundingBox())!;
  const end = await svgPoint(page, 187, 326);
  await drag(
    page,
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    end,
  );
  await expect(
    dialog.getByRole("slider", { name: "Kích thước họa tiết đã chọn" }),
  ).not.toHaveValue("0.45");
  const scale = Number(
    await dialog
      .getByRole("slider", { name: "Kích thước họa tiết đã chọn" })
      .inputValue(),
  );
  await canvas.scrollIntoViewIfNeeded();
  const rotateBox = (await canvas
    .locator('[data-decoration-action="rotate"]')
    .boundingBox())!;
  const targetPoint = await svgPoint(page, 156 + 50 * scale + 18, 295);
  await drag(
    page,
    {
      x: rotateBox.x + rotateBox.width / 2,
      y: rotateBox.y + rotateBox.height / 2,
    },
    targetPoint,
  );
  expect(
    Number(
      await dialog
        .getByRole("slider", { name: "Góc xoay họa tiết", exact: true })
        .inputValue(),
    ),
  ).toBeCloseTo(90, 0);
  await dialog
    .getByRole("slider", { name: "Góc xoay họa tiết", exact: true })
    .fill("35");
  await expect(canvas.locator(`[data-placed-motif="${id}"]`)).toHaveAttribute(
    "transform",
    /rotate\(35\)/,
  );
  await dialog.getByRole("button", { name: "Nhân bản", exact: true }).click();
  await expect(art).toHaveCount(3);
  await dialog
    .getByRole("button", { name: "Xóa họa tiết", exact: true })
    .click();
  await expect(art).toHaveCount(2);
  await dialog
    .getByRole("button", { name: "Hoàn tác trang trí", exact: true })
    .click();
  await expect(art).toHaveCount(3);
  await dialog.getByRole("button", { name: "Đặt Phượng", exact: true }).click();
  await tapPoint(page, 155, 180, isMobile);
  await expect(art).toHaveCount(4);
  await dialog
    .getByRole("button", { name: "Đặt Mây cuộn", exact: true })
    .click();
  await tapPoint(page, 210, 205, isMobile);
  await expect(art).toHaveCount(5); // sleeve placement
  await tapPoint(page, 25, 100, isMobile);
  await expect(art).toHaveCount(5);
  await expect(dialog.getByRole("alert")).toContainText("phần vải áo");
  await dialog.getByRole("button", { name: "Chọn & kéo", exact: true }).click();
  // Space the tested motifs into a readable composition for visual review.
  const chips = dialog.locator(".decoration-chips button");
  await chips.nth(0).click();
  await dialog
    .getByRole("slider", { name: "Kích thước họa tiết đã chọn" })
    .fill("0.3");
  await drag(
    page,
    await svgPoint(page, 160, 327),
    await svgPoint(page, 153, 398),
  );
  await expect(
    canvas.locator('[data-placed-motif="imported-0"]'),
  ).toHaveAttribute("transform", /translate\(153 398\)/);
  await chips.nth(1).click();
  await dialog
    .getByRole("slider", { name: "Kích thước họa tiết đã chọn" })
    .fill("0.38");
  await chips.nth(2).click();
  await dialog
    .getByRole("slider", { name: "Kích thước họa tiết đã chọn" })
    .fill("0.3");
  await drag(
    page,
    await svgPoint(page, 168, 309),
    await svgPoint(page, 178, 352),
  );
  await chips.nth(1).click();
  await canvas.scrollIntoViewIfNeeded();
  await dialog.screenshot({
    path: `test-results/${info.project.name}-direct-decoration.png`,
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Áp dụng bố cục", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".preview-canvas [data-placed-motif]")).toHaveCount(
    5,
  );
  await page
    .getByRole("button", { name: "Trang trí trực tiếp", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Xóa bố cục", exact: true }).click();
  await expect(art).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Hủy thay đổi", exact: true })
    .click();
  await expect(page.locator(".preview-canvas [data-placed-motif]")).toHaveCount(
    5,
  );
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
  await expect(page.locator(".saved-card [data-placed-motif]")).toHaveCount(5);
  await page.getByRole("button", { name: "Phối tiếp", exact: true }).click();
  await page.getByRole("button", { name: /Xem gợi ý mẫu/ }).click();
  await expect(
    page.locator(".look-card").first().locator("[data-placed-motif]"),
  ).toHaveCount(5);
});

test("AI motifs can be positioned independently and keyboard movement remains reversible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  const panel = page.getByRole("region", { name: "Hoa văn trên áo" });
  await page
    .getByLabel("Nhờ Gemini vẽ hoa văn riêng")
    .fill("Sen và mây nét thanh");
  await panel
    .getByRole("button", { name: "Vẽ hoa văn bằng AI", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Áp dụng hoa văn", exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Áp dụng hoa văn", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Trang trí trực tiếp", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const canvas = page.getByRole("group", { name: "Vùng trang trí áo" });
  await expect(canvas.locator('[data-motif="custom"]')).toHaveCount(1);
  await dialog
    .getByRole("button", { name: "Đặt Sen và mây nét viền", exact: true })
    .click();
  await tapPoint(page, 160, 250, false);
  await expect(canvas.locator("[data-placed-motif]")).toHaveCount(2);
  const placed = canvas.locator("[data-placed-motif]").last();
  await canvas.press("ArrowRight");
  await expect(placed).toHaveAttribute("transform", /translate\(162 250\)/);
  await canvas.press("Delete");
  await expect(canvas.locator("[data-placed-motif]")).toHaveCount(1);
  await dialog
    .getByRole("button", { name: "Hoàn tác trang trí", exact: true })
    .click();
  await expect(canvas.locator("[data-placed-motif]")).toHaveCount(2);
  await dialog
    .getByRole("button", { name: "Áp dụng bố cục", exact: true })
    .click();
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
  await expect(page.locator('.saved-card [data-motif="custom"]')).toHaveCount(
    2,
  );
});
