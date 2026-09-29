// Browser-safe domain: shared by API, offline UI, and storage validation.
// Never import environment variables or Gemini SDK in this module.
import { z } from "zod";
import catalog from "./data/catalog.json" with { type: "json" };
import cultureFacts from "./data/cultureFacts.json" with { type: "json" };
import cautionRules from "./data/cautionRules.json" with { type: "json" };
import presets from "./data/fallbackLooks.json" with { type: "json" };
import {
  patternSchema,
  defaultPattern,
  type GarmentPattern,
} from "./patterns.js";
export {
  patternSchema,
  defaultPattern,
  motifCatalog,
  lineMotifSchema,
  patternGenerationRequest,
  toFreePattern,
  presetPatternPositions,
  MAX_DECORATIONS,
} from "./patterns.js";
export type { GarmentPattern, LineMotif, Decoration } from "./patterns.js";

export { catalog };
export const publicFacts = cultureFacts.filter(
  (f) => f.verificationStatus === "verified",
);
export const publicRules = cautionRules.filter((r) =>
  ["verified", "editorial"].includes(r.verificationStatus),
);
export type Catalog = typeof catalog;
export type CulturalFact = (typeof cultureFacts)[number];
export type CautionRule = (typeof cautionRules)[number];
export type AccessoryOption = Catalog["accessories"][number];
export type Garment = Catalog["garments"][number];
export type EventOption = Catalog["events"][number];
export type ColorOption = Catalog["colorPalette"][number];
export const genderSchema = z.enum(["nu", "nam"]);
export type Gender = z.infer<typeof genderSchema>;

const knownId = (items: { id: string }[]) =>
  z
    .string()
    .refine(
      (id) => items.some((x) => x.id === id),
      "Lựa chọn không có trong danh mục.",
    );
const color = z
  .string()
  .regex(/^#[\da-fA-F]{6}$/, "Màu phải có định dạng #RRGGBB.")
  .transform((s) => s.toUpperCase());
export const exclusiveAccessoryGroups = [
  ["acc_guoc_moc", "acc_sneaker_trang"],
  ["acc_kieng_bac", "acc_chuoi_ngoc"],
  ["acc_tui_coi", "acc_tui_deo_cheo"],
];
export function toggleAccessorySelection(selected: string[], id: string) {
  if (selected.includes(id)) return selected.filter((item) => item !== id);
  const group = exclusiveAccessoryGroups.find((items) => items.includes(id));
  return [...selected.filter((item) => !group?.includes(item)), id];
}
const accessoryIds = z
  .array(knownId(catalog.accessories))
  .max(catalog.accessories.length)
  .refine((ids) => new Set(ids).size === ids.length, "Phụ kiện bị lặp.")
  .refine(
    (ids) =>
      exclusiveAccessoryGroups.every(
        (group) => ids.filter((id) => group.includes(id)).length <= 1,
      ),
    "Chỉ chọn một đôi giày/guốc, một vòng cổ và một túi trong mỗi bản phối.",
  );
export const requestSchema = z
  .object({
    garmentId: knownId(catalog.garments),
    eventId: knownId(catalog.events),
    styleId: knownId(catalog.styles),
    gender: genderSchema.default("nu"),
    primaryColor: color,
    accentColor: color,
    selectedAccessories: accessoryIds,
    pattern: patternSchema.default(defaultPattern),
  })
  .strict();
export type StylingRequest = z.infer<typeof requestSchema>;

export const rawLookSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    garmentId: knownId(catalog.garments),
    eventId: knownId(catalog.events),
    // Optional keeps old saved looks and Gemini responses compatible; groundLook always fills it.
    gender: genderSchema.optional(),
    pattern: patternSchema.optional(),
    palette: z.tuple([color, color]),
    accessoryIds,
    stylingReason: z.string().trim().min(1).max(1000),
    culturalFactIds: z.array(z.string()).min(1).max(3),
    cautionRuleIds: z.array(z.string()).max(5),
  })
  .strict();
export const modelResponseSchema = z
  .object({ looks: z.array(rawLookSchema).min(1).max(3) })
  .strict();
export type RawLook = z.infer<typeof rawLookSchema>;
export type LookSource = "gemini" | "fallback" | "manual";
export interface Look extends RawLook {
  pattern: GarmentPattern;
  gender: Gender;
  id: string;
  styleId: string;
  garmentName: string;
  eventName: string;
  accessories: AccessoryOption[];
  culturalFacts: CulturalFact[];
  cautionRules: CautionRule[];
  source: LookSource;
  isFallback: boolean;
  savedAt?: string;
}
export interface RecommendationResult {
  looks: Look[];
  isFallback: boolean;
  note: string;
}
export const defaultRequest: StylingRequest = {
  garmentId: "ao_ngu_than",
  eventId: "ky_yeu",
  styleId: "thanh_lich",
  gender: "nu",
  primaryColor: "#1E5E58",
  accentColor: "#FDFBF7",
  selectedAccessories: ["acc_quat_tre", "acc_sneaker_trang"],
  pattern: defaultPattern,
};

export function getRelevantFacts(garmentId: string) {
  return publicFacts.filter((f) => f.garmentId === garmentId);
}
export function getRelevantRules(garmentId: string) {
  return publicRules.filter(
    (r) => r.garmentId === "all" || r.garmentId === garmentId,
  );
}
export function lookIdentity(
  look: Pick<
    Look,
    | "garmentId"
    | "eventId"
    | "styleId"
    | "palette"
    | "accessoryIds"
    | "gender"
    | "pattern"
  >,
) {
  // Keep the original hash for legacy female/default looks so stored row IDs still work.
  const identity: unknown[] = [
    look.garmentId,
    look.eventId,
    look.styleId,
    look.palette,
    [...look.accessoryIds].sort(),
  ];
  if (look.gender === "nam") identity.push("nam");
  if (JSON.stringify(look.pattern) !== JSON.stringify(defaultPattern))
    identity.push(look.pattern);
  const value = JSON.stringify(identity);
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++)
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return `look_${(hash >>> 0).toString(36)}`;
}

export function groundLook(
  input: unknown,
  request: StylingRequest,
  source: LookSource,
): Look {
  const raw = rawLookSchema.parse(input);
  if (raw.garmentId !== request.garmentId || raw.eventId !== request.eventId)
    throw new Error("Gợi ý không khớp trang phục hoặc sự kiện.");
  if (raw.gender && raw.gender !== request.gender)
    throw new Error("Gợi ý không khớp với lựa chọn Nam/Nữ.");
  const facts = getRelevantFacts(request.garmentId);
  const rules = getRelevantRules(request.garmentId).filter(
    (r) => r.verificationStatus === "verified",
  );
  if (raw.culturalFactIds.some((id) => !facts.some((f) => f.id === id)))
    throw new Error("Nguồn văn hóa không phù hợp hoặc chưa kiểm chứng.");
  if (raw.cautionRuleIds.some((id) => !rules.some((r) => r.id === id)))
    throw new Error("Quy tắc chưa được kiểm chứng.");
  // Required source-based guidance is attached by the application, not left to AI.
  const result = {
    ...raw,
    gender: request.gender,
    pattern: patternSchema.parse(request.pattern),
    styleId: request.styleId,
    garmentName: catalog.garments.find((g) => g.id === raw.garmentId)!.name,
    eventName: catalog.events.find((e) => e.id === raw.eventId)!.name,
    accessories: raw.accessoryIds.map(
      (id) => catalog.accessories.find((a) => a.id === id)!,
    ),
    culturalFacts: [...new Set(raw.culturalFactIds)].map(
      (id) => facts.find((f) => f.id === id)!,
    ),
    cautionRules: getRelevantRules(request.garmentId),
    source,
    isFallback: source === "fallback",
  };
  return { ...result, id: lookIdentity(result) };
}

export function manualLook(request: StylingRequest): Look {
  const style = catalog.styles.find((s) => s.id === request.styleId)!;
  return groundLook(
    {
      title: `${catalog.garments.find((g) => g.id === request.garmentId)!.name} · ${request.gender === "nam" ? "Nam" : "Nữ"} · ${style.name}`,
      garmentId: request.garmentId,
      eventId: request.eventId,
      palette: [request.primaryColor, request.accentColor],
      accessoryIds: request.selectedAccessories,
      stylingReason: `Bản phối ${style.name.toLowerCase()} do bạn tự chọn màu sắc và phụ kiện.`,
      culturalFactIds: getRelevantFacts(request.garmentId).map((f) => f.id),
      cautionRuleIds: ["caution_quan_dai"],
    },
    request,
    "manual",
  );
}

export function fallbackRecommendations(
  request: StylingRequest,
  note = "Gợi ý mẫu — chưa sử dụng Gemini.",
): RecommendationResult {
  const preset = presets.find(
    (p) => p.garmentId === request.garmentId && p.eventId === request.eventId,
  )!;
  const facts = getRelevantFacts(request.garmentId).map((f) => f.id);
  const base = {
    garmentId: request.garmentId,
    eventId: request.eventId,
    culturalFactIds: facts,
    cautionRuleIds: ["caution_quan_dai"],
  };
  const style = catalog.styles.find((s) => s.id === request.styleId)!;
  const event = catalog.events.find((e) => e.id === request.eventId)!;
  const suggestedAccessories =
    request.styleId === "toi_gian"
      ? ["acc_guoc_moc"]
      : request.styleId === "tre_trung"
        ? ["acc_tui_deo_cheo", "acc_kep_hoa", "acc_sneaker_trang"]
        : ["acc_quat_tre", "acc_kieng_bac"];
  const variants = [
    {
      ...base,
      title: "Sắc màu của bạn",
      palette: [request.primaryColor, request.accentColor],
      accessoryIds: request.selectedAccessories,
      stylingReason: `Giữ nguyên hai màu và phụ kiện bạn chọn cho ${event.name.toLowerCase()}. Đây là điểm bắt đầu để thử phong cách ${style.name.toLowerCase()}.`,
    },
    {
      ...base,
      title: preset.title,
      palette: preset.palette,
      accessoryIds:
        request.styleId === "toi_gian"
          ? suggestedAccessories
          : preset.accessoryIds,
      stylingReason: preset.stylingReason,
    },
    {
      ...base,
      title: `Một chút ${style.name.toLowerCase()}`,
      palette: [
        request.primaryColor === "#E7A8A5" ? "#264653" : "#E7A8A5",
        "#FDFBF7",
      ],
      accessoryIds: suggestedAccessories,
      stylingReason: `Thử một sắc áo khác cùng quần trắng ngà. Các phụ kiện được gợi ý theo phong cách ${style.name.toLowerCase()}; bạn có thể chỉnh lại trong phòng phối đồ.`,
    },
  ];
  const unique = new Map(
    variants.map((v) => {
      const look = groundLook(v, request, "fallback");
      return [look.id, look] as const;
    }),
  );
  return { looks: [...unique.values()], isFallback: true, note };
}

// Rehydrate only whitelisted fields; stored cultural prose never becomes a trusted source.
export function restoreLooks(value: unknown): Look[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    try {
      if (!item || typeof item !== "object") return [];
      const request = requestSchema.parse({
        garmentId: item.garmentId,
        eventId: item.eventId,
        styleId: item.styleId,
        gender: item.gender ?? "nu",
        primaryColor: item.palette?.[0],
        accentColor: item.palette?.[1],
        selectedAccessories: item.accessoryIds,
        pattern: item.pattern ?? defaultPattern,
      });
      const source: LookSource = ["manual", "gemini", "fallback"].includes(
        item.source,
      )
        ? item.source
        : "manual";
      const look = groundLook(
        {
          title: item.title,
          garmentId: item.garmentId,
          eventId: item.eventId,
          gender: item.gender ?? "nu",
          pattern: item.pattern ?? defaultPattern,
          palette: item.palette,
          accessoryIds: item.accessoryIds,
          stylingReason: item.stylingReason,
          culturalFactIds: getRelevantFacts(item.garmentId).map((f) => f.id),
          cautionRuleIds: ["caution_quan_dai"],
        },
        request,
        source,
      );
      return [
        {
          ...look,
          savedAt:
            typeof item.savedAt === "string" &&
            Number.isFinite(Date.parse(item.savedAt))
              ? item.savedAt
              : undefined,
        },
      ];
    } catch {
      return [];
    }
  });
}
