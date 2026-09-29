import { expect, test, type Page, type Locator } from "@playwright/test";

async function coords(board: Locator, x: number, y: number) {
  return board.evaluate(
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
async function draw(
  page: Page,
  board: Locator,
  points: Array<[number, number]>,
) {
  await board.scrollIntoViewIfNeeded();
  const start = await coords(board, ...points[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) {
    const point = await coords(board, x, y);
    await page.mouse.move(point.x, point.y, { steps: 4 });
  }
  await page.mouse.up();
}
const petal: Array<[number, number]> = [
  [50, 16],
  [38, 28],
  [34, 44],
  [39, 59],
  [50, 72],
  [61, 59],
  [66, 44],
  [62, 28],
  [50, 16],
];

test("freehand pen, erase, undo, color and saved custom artwork work without AI", async ({
  page,
  isMobile,
}, info) => {
  let aiRequests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/patterns/generate")) aiRequests++;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await page
    .getByRole("button", { name: "Tự vẽ họa tiết", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Tự vẽ họa tiết",
    exact: true,
  });
  const board = dialog.getByRole("group", { name: "Bảng vẽ họa tiết" });
  await expect(
    dialog.getByRole("button", { name: "Dùng họa tiết này", exact: true }),
  ).toBeDisabled();
  await draw(page, board, petal);
  await draw(page, board, [
    [50, 72],
    [48, 80],
    [43, 92],
  ]);
  await draw(page, board, [
    [49, 79],
    [59, 72],
    [69, 74],
    [60, 82],
    [49, 79],
  ]);
  await expect(board.locator("[data-drawn-stroke]")).toHaveCount(3);
  if (isMobile) {
    await board.scrollIntoViewIfNeeded();
    const p = await coords(board, 16, 16);
    await page.touchscreen.tap(p.x, p.y);
    await expect(board.locator("[data-drawn-stroke]")).toHaveCount(4);
    await dialog
      .getByRole("button", { name: "Hoàn tác nét vẽ", exact: true })
      .click();
  }
  await dialog
    .getByRole("button", { name: "Hoàn tác nét vẽ", exact: true })
    .click();
  await expect(board.locator("[data-drawn-stroke]")).toHaveCount(2);
  await dialog
    .getByRole("button", { name: "Làm lại nét vẽ", exact: true })
    .click();
  await expect(board.locator("[data-drawn-stroke]")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Xóa nét", exact: true }).click();
  await board.scrollIntoViewIfNeeded();
  const p = await coords(board, 50, 16);
  await page.mouse.click(p.x, p.y);
  await expect(board.locator("[data-drawn-stroke]")).toHaveCount(2);
  await dialog
    .getByRole("button", { name: "Hoàn tác nét vẽ", exact: true })
    .click();
  await expect(board.locator("[data-drawn-stroke]")).toHaveCount(3);
  await dialog
    .getByRole("button", { name: "Nét vẽ Đỏ gạch", exact: true })
    .click();
  await dialog
    .getByRole("slider", { name: "Độ dày nét tự vẽ", exact: true })
    .fill("1.8");
  await dialog
    .getByRole("textbox", { name: "Tên họa tiết tự vẽ", exact: true })
    .fill("Cánh hoa của mình");
  await expect(board.locator("[data-drawn-stroke]").first()).toHaveCSS(
    "stroke",
    "rgb(188, 71, 73)",
  );
  await expect(board.locator("[data-drawn-stroke]").first()).toHaveCSS(
    "stroke-width",
    "1.8px",
  );
  await dialog
    .getByRole("button", { name: "Xóa toàn bộ nét", exact: true })
    .click();
  await expect(board.locator("[data-drawn-stroke]")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Hoàn tác nét vẽ", exact: true })
    .click();
  await expect(board.locator("[data-drawn-stroke]")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Bút vẽ", exact: true }).click();
  await board.scrollIntoViewIfNeeded();
  await dialog.screenshot({
    path: `test-results/${info.project.name}-freehand-board.png`,
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Dùng họa tiết này", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const motif = page.locator('.preview-canvas [data-part="garment-pattern"]');
  await expect(motif).toHaveAttribute("data-motif", "custom");
  await expect(motif).toHaveAttribute("stroke", "#BC4749");
  await expect(motif.locator("path")).toHaveCount(3);
  await expect(
    page.getByRole("complementary", { name: "Quyền trải nghiệm" }),
  ).toContainText("AI còn 3/3");
  await page
    .locator(".studio-preview")
    .screenshot({
      path: `test-results/${info.project.name}-freehand-garment.png`,
      animations: "disabled",
      style: ".site-header{visibility:hidden}",
    });
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
  await expect(
    page.locator('.saved-card [data-part="garment-pattern"]'),
  ).toHaveAttribute("stroke", "#BC4749");
  await expect(
    page.locator('.saved-card [data-part="garment-pattern"] path'),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "Phối tiếp", exact: true }).click();
  await page
    .getByRole("button", { name: "Tự vẽ họa tiết", exact: true })
    .click();
  await draw(page, board, [
    [10, 10],
    [80, 80],
  ]);
  await dialog.getByRole("button", { name: "Hủy bản vẽ", exact: true }).click();
  await expect(motif.locator("path")).toHaveCount(3);
  expect(aiRequests).toBe(0);
});

test("draw a motif inside the direct editor, place it on the sleeve and reopen it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu phối đồ" }).click();
  await page
    .getByRole("button", { name: "Trang trí trực tiếp", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Trang trí ngay trên áo",
    exact: true,
  });
  await editor
    .getByRole("button", { name: "Tự vẽ họa tiết mới", exact: true })
    .click();
  const drawing = page.getByRole("dialog", {
    name: "Tự vẽ họa tiết",
    exact: true,
  });
  const board = drawing.getByRole("group", { name: "Bảng vẽ họa tiết" });
  await draw(page, board, petal);
  await drawing
    .getByRole("button", { name: "Nét vẽ Vàng ấm", exact: true })
    .click();
  await drawing
    .getByRole("textbox", { name: "Tên họa tiết tự vẽ", exact: true })
    .fill("Nét vàng riêng");
  await drawing
    .getByRole("button", { name: "Dùng họa tiết này", exact: true })
    .click();
  await expect(drawing).toHaveCount(0);
  await expect(editor).toBeVisible();
  const canvas = editor.getByRole("group", { name: "Vùng trang trí áo" });
  await canvas.scrollIntoViewIfNeeded();
  const p = await coords(canvas.locator(".garment-svg"), 210, 205);
  await page.mouse.click(p.x, p.y);
  const placed = canvas.locator('[data-placed-motif][data-motif="custom"]');
  await expect(placed).toHaveCount(1);
  await expect(placed).toHaveAttribute("stroke", "#D8B56D");
  await editor
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
  await expect(
    page.locator('.saved-card [data-motif="custom"]'),
  ).toHaveAttribute("stroke", "#D8B56D");
});
