import { z } from "zod";
import catalog from "../data/catalog.json" with { type: "json" };
import facts from "../data/cultureFacts.json" with { type: "json" };
import { patternSchema, defaultPattern } from "../patterns.js";

const factFor = (garmentId: string) =>
  facts.filter(
    (f) => f.garmentId === garmentId && f.verificationStatus === "verified",
  );
export const fittingGarments = [
  {
    id: "ao_dai",
    name: "Áo dài",
    subtitle: "Hai tà mềm mại, phom hiện đại",
    sourceStatus: "reference",
    facts: factFor("ao_dai"),
  },
  {
    id: "ao_dai_cach_tan",
    name: "Áo dài cách tân",
    subtitle: "Biến tấu đương đại, thể hiện chất riêng",
    sourceStatus: "creative",
    facts: [],
  },
  {
    id: "ao_ngu_than",
    name: "Áo ngũ thân tay chẽn",
    subtitle: "Cổ đứng, tay gọn, hàng khuy bên",
    sourceStatus: "reference",
    facts: factFor("ao_ngu_than"),
  },
  {
    id: "ao_tac",
    name: "Áo tấc / tay thụng",
    subtitle: "Khám phá dáng tay rộng",
    sourceStatus: "reference",
    facts: factFor("ao_ngu_than").filter((f) => f.id === "fact_ngu_than_02"),
  },
  {
    id: "nhat_binh",
    name: "Áo Nhật bình",
    subtitle: "Minh họa cổ và nẹp áo mở rộng",
    sourceStatus: "unverified",
    facts: [],
  },
  {
    id: "giao_linh",
    name: "Áo Giao lĩnh",
    subtitle: "Minh họa dáng cổ giao nhau",
    sourceStatus: "unverified",
    facts: [],
  },
  {
    id: "doi_kham",
    name: "Áo Đối khâm",
    subtitle: "Minh họa hai mép áo mở giữa",
    sourceStatus: "unverified",
    facts: [],
  },
] as const;

export const fittingAccessories = [
  ...catalog.accessories,
  {
    id: "acc_non_ba_tam",
    name: "Nón ba tầm",
    category: "Mẫu 3D minh họa",
    icon: "hat",
  },
  {
    id: "acc_hai",
    name: "Hài thêu",
    category: "Mẫu 3D minh họa",
    icon: "shoes",
  },
  {
    id: "acc_tram",
    name: "Trâm cài",
    category: "Mẫu 3D minh họa",
    icon: "pin",
  },
  {
    id: "acc_ngoc_boi",
    name: "Ngọc bội",
    category: "Mẫu 3D minh họa",
    icon: "pendant",
  },
  {
    id: "acc_the_bai",
    name: "Thẻ bài",
    category: "Mẫu 3D minh họa",
    icon: "tag",
  },
];
export const fittingExclusiveGroups = [
  ["acc_guoc_moc", "acc_sneaker_trang", "acc_hai"],
  ["acc_kieng_bac", "acc_chuoi_ngoc"],
  ["acc_tui_coi", "acc_tui_deo_cheo"],
  ["acc_non_la", "acc_non_ba_tam"],
  ["acc_ngoc_boi", "acc_the_bai"],
];
export const fittingColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((value) => value.toUpperCase());
export const fittingAccessoriesSchema = z
  .array(
    z
      .string()
      .refine(
        (id) => fittingAccessories.some((a) => a.id === id),
        "Phụ kiện chưa có trong danh mục.",
      ),
  )
  .max(12)
  .refine((ids) => new Set(ids).size === ids.length, "Phụ kiện bị lặp.")
  .refine(
    (ids) =>
      fittingExclusiveGroups.every(
        (group) => ids.filter((id) => group.includes(id)).length <= 1,
      ),
    "Mỗi nhóm giày, vòng cổ, túi hoặc nón chỉ chọn một món.",
  );
export const fittingGarmentIdSchema = z.enum([
  "ao_dai",
  "ao_dai_cach_tan",
  "ao_ngu_than",
  "ao_tac",
  "nhat_binh",
  "giao_linh",
  "doi_kham",
]);
export const fittingColorsSchema = z
  .object({
    main: fittingColorSchema,
    pants: fittingColorSchema,
    lining: fittingColorSchema,
    pattern: fittingColorSchema,
  })
  .strict();
export const fittingFabricSchema = z.enum([
  "silk",
  "gauze",
  "brocade",
  "satin",
]);
export const fittingOutfitSchema = z
  .object({
    schemaVersion: z.literal("fitting-3d/1"),
    revision: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 1),
    gender: z.enum(["nam", "nu"]),
    garmentId: fittingGarmentIdSchema,
    eventId: z.enum(["ky_yeu", "du_xuan", "ngoai_khoa"]),
    styleId: z
      .string()
      .refine(
        (id) => catalog.styles.some((style) => style.id === id),
        "Phong cách chưa có trong danh mục.",
      ),
    mode: z.enum(["creative", "strict"]),
    colors: fittingColorsSchema,
    fabric: fittingFabricSchema,
    layers: z
      .object({
        base: z.boolean(),
        lining: z.boolean(),
        garment: z.boolean(),
        head: z.boolean(),
        accessories: z.boolean(),
      })
      .strict(),
    accessories: fittingAccessoriesSchema,
    pattern: patternSchema,
    pose: z.enum(["stand", "fan", "walk"]),
    camera: z.enum(["full", "head", "hem"]),
  })
  .strict();
export type FittingOutfit = z.infer<typeof fittingOutfitSchema>;
export const defaultFittingOutfit: FittingOutfit = {
  schemaVersion: "fitting-3d/1",
  revision: 0,
  gender: "nu",
  garmentId: "ao_ngu_than",
  eventId: "ky_yeu",
  styleId: "thanh_lich",
  mode: "creative",
  colors: {
    main: "#1E5E58",
    pants: "#FDFBF7",
    lining: "#FDFBF7",
    pattern: "#E9C46A",
  },
  fabric: "silk",
  layers: {
    base: true,
    lining: false,
    garment: true,
    head: true,
    accessories: true,
  },
  accessories: ["acc_guoc_moc"],
  pattern: defaultPattern,
  pose: "stand",
  camera: "full",
};
export function validateFittingCulture(outfit: FittingOutfit) {
  const garment = fittingGarments.find((item) => item.id === outfit.garmentId)!;
  return {
    status:
      outfit.mode === "strict"
        ? ("unverified" as const)
        : ("creative" as const),
    certified: false,
    title:
      outfit.mode === "strict"
        ? "Chưa đủ căn cứ để chứng nhận phục chế"
        : "Bản phối sáng tạo đương đại",
    message:
      outfit.mode === "strict"
        ? "Mẫu 3D này là minh họa hình khối, chưa có hồ sơ phục dựng được duyệt. Bạn vẫn có thể khám phá và lưu, nhưng bản phối không được gắn nhãn chuẩn lịch sử."
        : "Tự do thử màu và phụ kiện. Hình khối 3D minh họa không thay thế hồ sơ cổ phục hoặc tư vấn kích cỡ.",
    facts: garment.facts,
    notices: [
      ...(!outfit.layers.base
        ? [
            "Lớp nền đang ẩn để xem cấu trúc mẫu; không phải hướng dẫn mặc trang phục ngoài đời.",
          ]
        : []),
      ...(garment.sourceStatus === "unverified"
        ? ["Thông tin phục dựng chi tiết cho phom này đang được bổ sung."]
        : []),
    ],
  };
}
export const savedFittingOutfitSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(100),
    outfit: fittingOutfitSchema,
    storageVersion: z.number().int().positive(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type SavedFittingOutfit = z.infer<typeof savedFittingOutfitSchema>;
export const fittingStylistRequestSchema = z
  .object({
    outfit: fittingOutfitSchema,
    prompt: z.string().trim().max(400),
    requestId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  })
  .strict();
export type FittingStylistRequest = z.infer<typeof fittingStylistRequestSchema>;
export const fittingSuggestionSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(100),
    reason: z.string().trim().min(1).max(600),
    outfit: fittingOutfitSchema,
  })
  .strict();
export const fittingStylistResultSchema = z
  .object({
    baseRevision: z.number().int().min(0),
    requestId: z.string().min(8).max(100),
    source: z.enum(["gemini", "fallback"]),
    note: z.string().max(600),
    suggestions: z.array(fittingSuggestionSchema).min(1).max(3),
  })
  .strict();
export type FittingStylistResult = z.infer<typeof fittingStylistResultSchema>;
