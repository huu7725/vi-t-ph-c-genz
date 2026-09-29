import { z } from "zod";

/** Only bounded, absolute SVG geometry. No markup, URLs, CSS, transforms or events. */
export function isSafePath(path: string): boolean {
  if (!/^[MLCQZ0-9.,\s+-]+$/.test(path)) return false;
  const tokens = path.match(/[MLCQZ]|[-+]?(?:\d+\.?\d*|\.\d+)/g);
  if (
    !tokens ||
    tokens[0] !== "M" ||
    path.replace(/[MLCQZ]|[-+]?(?:\d+\.?\d*|\.\d+)|[\s,]/g, "")
  )
    return false;
  const sizes: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };
  let i = 0,
    visible = false;
  while (i < tokens.length) {
    const command = tokens[i++];
    if (!(command in sizes)) return false;
    if (command === "Z") continue;
    let count = 0;
    while (i < tokens.length && !(tokens[i] in sizes)) {
      const value = Number(tokens[i++]);
      if (!Number.isFinite(value) || value < 0 || value > 100) return false;
      count++;
    }
    if (!count || count % sizes[command]) return false;
    if (command !== "M" || count > 2) visible = true;
  }
  return visible;
}
export const lineMotifSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    paths: z
      .array(
        z.string().min(3).max(900).refine(isSafePath, "Nét vẽ không hợp lệ."),
      )
      .min(1)
      .max(16),
  })
  .strict()
  .refine(
    (motif) => motif.paths.reduce((n, d) => n + d.length, 0) <= 6000,
    "Họa tiết quá nhiều chi tiết.",
  );
export type LineMotif = z.infer<typeof lineMotifSchema>;
export const motifIds = [
  "none",
  "botanical",
  "lotus",
  "dragon",
  "phoenix",
  "clouds",
  "bamboo",
  "custom",
] as const;
const decorationColor = z.union([
  z.literal("auto"),
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .transform((s) => s.toUpperCase()),
]);
export const decorationSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
    motifId: z.enum([
      "botanical",
      "lotus",
      "dragon",
      "phoenix",
      "clouds",
      "bamboo",
      "custom",
    ]),
    assetId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,60}$/)
      .optional(),
    x: z.number().finite().min(0).max(320),
    y: z.number().finite().min(0).max(520),
    scale: z.number().finite().min(0.12).max(1.2),
    rotation: z.number().finite().min(-180).max(180),
    color: decorationColor,
    strokeWidth: z.number().min(0.6).max(2.4),
    opacity: z.number().min(0.25).max(1),
  })
  .strict();
export type Decoration = z.infer<typeof decorationSchema>;
export const MAX_DECORATIONS = 24;
export const patternSchema = z
  .object({
    motifId: z.enum(motifIds),
    placement: z.enum(["center", "side", "hem", "free"]),
    color: z.union([
      z.literal("auto"),
      z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .transform((s) => s.toUpperCase()),
    ]),
    scale: z.number().min(0.6).max(1.4),
    strokeWidth: z.number().min(0.6).max(2.4),
    opacity: z.number().min(0.25).max(1),
    custom: lineMotifSchema.optional(),
    decorations: z.array(decorationSchema).max(MAX_DECORATIONS).optional(),
    assets: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
            motif: lineMotifSchema,
          })
          .strict(),
      )
      .max(4)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.placement === "free") {
      if (!value.decorations)
        ctx.addIssue({
          code: "custom",
          message: "Thiếu bố cục trang trí.",
          path: ["decorations"],
        });
      const ids = value.decorations?.map((d) => d.id) || [];
      const assetIds = value.assets?.map((a) => a.id) || [];
      if (
        new Set(ids).size !== ids.length ||
        new Set(assetIds).size !== assetIds.length
      )
        ctx.addIssue({ code: "custom", message: "Mã hoa văn bị trùng." });
      for (const item of value.decorations || []) {
        if (
          item.motifId === "custom"
            ? !assetIds.includes(item.assetId || "")
            : item.assetId !== undefined
        )
          ctx.addIssue({
            code: "custom",
            message: "Hoa văn không có nguồn nét vẽ hợp lệ.",
            path: ["decorations"],
          });
      }
    } else if (value.decorations !== undefined || value.assets !== undefined)
      ctx.addIssue({
        code: "custom",
        message: "Bố cục có sẵn không nhận hoa văn tự đặt.",
      });
    if (JSON.stringify(value).length > 10000)
      ctx.addIssue({
        code: "custom",
        message: "Bố cục quá nhiều chi tiết. Hãy bớt một số hoa văn riêng.",
      });
    if (value.motifId === "custom" && !value.custom)
      ctx.addIssue({
        code: "custom",
        message: "Thiếu nét vẽ hoa văn riêng.",
        path: ["custom"],
      });
    if (value.motifId !== "custom" && value.custom)
      ctx.addIssue({
        code: "custom",
        message: "Mẫu có sẵn không nhận nét vẽ riêng.",
        path: ["custom"],
      });
  });
export type GarmentPattern = z.infer<typeof patternSchema>;
export const defaultPattern: GarmentPattern = {
  motifId: "botanical",
  placement: "center",
  color: "auto",
  scale: 1,
  strokeWidth: 1,
  opacity: 0.55,
};

/** Shared coordinates keep preset-to-editor conversion visually identical. */
export function presetPatternPositions(
  pattern: GarmentPattern,
  nguThan: boolean,
  male: boolean,
): Array<[number, number, number]> {
  if (pattern.placement === "side")
    return [0, 1, 2, 3].map((i) => [
      male ? 128 : 132,
      210 + i * 45,
      0.36 * pattern.scale,
    ]);
  if (pattern.placement === "hem")
    return [0, 1, 2].map((i) => [
      124 + i * 25,
      nguThan ? 386 : male ? 399 : 421,
      0.25 * pattern.scale,
    ]);
  return [[124, nguThan ? 291 : 306, 0.72 * pattern.scale]];
}
export function toFreePattern(
  pattern: GarmentPattern,
  nguThan: boolean,
  male: boolean,
): GarmentPattern {
  if (pattern.placement === "free") return patternSchema.parse(pattern);
  const { custom, ...base } = pattern;
  const assetId = "imported-motif";
  const decorations: Decoration[] =
    pattern.motifId === "none"
      ? []
      : presetPatternPositions(pattern, nguThan, male).map(
          ([x, y, scale], i) => ({
            id: `imported-${i}`,
            motifId: pattern.motifId as Decoration["motifId"],
            ...(custom ? { assetId } : {}),
            x: x + 50 * scale,
            y: y + 50 * scale,
            scale,
            rotation: 0,
            color: pattern.color,
            strokeWidth: pattern.strokeWidth,
            opacity: pattern.opacity,
          }),
        );
  return patternSchema.parse({
    ...base,
    motifId: pattern.motifId === "custom" ? "botanical" : pattern.motifId,
    placement: "free",
    decorations,
    assets: custom ? [{ id: assetId, motif: custom }] : [],
  });
}
export const patternGenerationRequest = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(5, "Mô tả ít nhất 5 ký tự.")
      .max(400, "Mô tả tối đa 400 ký tự."),
  })
  .strict();
export const motifCatalog: Array<
  LineMotif & { id: Exclude<(typeof motifIds)[number], "custom"> }
> = [
  { id: "none", name: "Không hoa văn", paths: [] },
  {
    id: "botanical",
    name: "Cành lá",
    paths: [
      "M35 92 Q58 60 49 10",
      "M50 36 Q25 33 26 17 Q46 19 50 36",
      "M50 49 Q75 35 73 19 Q52 24 50 49",
      "M44 69 Q23 63 24 48 Q46 49 44 69",
      "M36 88 Q63 83 67 65 Q46 68 36 88",
    ],
  },
  {
    id: "lotus",
    name: "Hoa sen",
    paths: [
      "M50 61 Q28 41 50 13 Q72 41 50 61Z",
      "M50 62 Q18 58 18 30 Q41 35 50 62Z",
      "M50 62 Q82 58 82 30 Q59 35 50 62Z",
      "M50 66 Q13 75 8 49 Q28 49 50 66Z",
      "M50 66 Q87 75 92 49 Q72 49 50 66Z",
      "M23 73 Q50 86 77 73",
      "M50 70 L50 94",
      "M50 90 Q32 76 26 87 Q34 98 50 90",
      "M22 92 Q13 88 8 92 M71 91 Q83 87 92 92",
    ],
  },
  {
    id: "dragon",
    name: "Rồng",
    paths: [
      "M65 23 C31 9 12 31 28 48 C36 57 73 47 72 67 C70 86 33 94 18 78",
      "M63 32 C40 24 31 33 38 41 C52 48 88 43 85 66 C82 90 44 99 23 88",
      "M61 22 L64 11 L72 18 L84 14 L79 25 L91 29 L89 37 L74 39 L66 33Z",
      "M80 19 L89 8 M69 16 L66 5",
      "M77 27 Q82 24 86 28",
      "M82 32 Q95 36 95 45 M77 36 Q83 50 95 49",
      "M53 17 L49 10 L43 16 L36 12 L33 21 L24 20 L23 29",
      "M33 52 L26 63 L14 61 M26 63 L24 72 M25 63 L15 71",
      "M65 56 L62 46 L53 41 M62 46 L67 39 M62 46 L73 42",
      "M37 88 L30 94 L18 92 L10 81",
      "M39 28 L43 34 M49 27 L53 35 M53 50 L50 56 M64 49 L62 57 M76 66 L81 69 M67 79 L70 84 M52 84 L52 91",
    ],
  },
  {
    id: "phoenix",
    name: "Phượng",
    paths: [
      "M52 35 Q48 17 60 18 Q70 18 66 27 L57 29 Q64 44 56 56 Q48 64 43 52 Q38 43 52 35Z",
      "M63 20 L76 23 L66 26 M59 18 L58 8 L63 12 L69 8",
      "M50 40 Q27 13 10 21 Q19 45 43 48",
      "M45 40 Q31 19 16 23 M43 44 Q27 29 14 29 M39 47 Q24 38 18 36",
      "M60 36 Q74 13 92 16 Q89 37 62 48",
      "M63 42 Q79 21 89 21 M64 46 Q81 30 87 28",
      "M47 57 C19 62 9 91 27 94 C45 96 63 65 56 55",
      "M50 61 C31 63 22 83 29 87 C39 90 49 73 52 63",
      "M56 58 Q70 77 88 90 Q63 92 49 80",
      "M59 65 Q71 85 83 86 M48 67 Q51 89 61 97 M44 58 L37 64 L32 64 M55 55 L64 60 L70 57",
    ],
  },
  {
    id: "clouds",
    name: "Mây cuộn",
    paths: [
      "M11 43 C1 31 17 20 28 29 C31 10 62 10 65 28 C85 16 98 35 86 46 L16 46",
      "M27 35 C26 24 44 22 45 33 C58 21 74 27 72 38",
      "M23 58 C18 47 35 47 39 55 C45 42 64 47 64 58 C81 47 96 63 84 72 L28 72",
      "M42 61 Q50 51 59 63 M17 83 Q44 77 62 83 Q79 90 92 79",
    ],
  },
  {
    id: "bamboo",
    name: "Trúc",
    paths: [
      "M40 95 L42 8 M46 95 L48 8",
      "M39 28 L50 28 M39 51 L49 51 M37 76 L48 76",
      "M47 37 Q69 26 83 13 M43 55 Q24 46 11 28 M46 77 Q65 67 88 54",
      "M64 27 Q66 7 75 6 Q78 17 64 27 M62 28 Q85 24 88 34 Q75 37 62 28",
      "M29 47 Q16 50 8 40 Q20 38 29 47 M31 47 Q36 26 25 18 Q20 30 31 47",
      "M64 69 Q64 51 75 42 Q81 59 64 69 M65 69 Q83 65 93 77 Q81 83 65 69",
    ],
  },
];
