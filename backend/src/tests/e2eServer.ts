// Isolated test server: never loads .env, never calls Gemini, never opens the user database.
import { createApp } from "../app.js";
import { AuthStore } from "../authStore.js";
import { fallbackRecommendations, motifCatalog } from "../domain.js";
import { fallbackFittingSuggestions } from "../fitting3d/stylist.js";
const store = new AuthStore(":memory:");
createApp({
  store,
  fittingStylist: async (request) => {
    const result = fallbackFittingSuggestions(request);
    return {
      ...result,
      source: "gemini" as const,
      note: "Gợi ý 3D giả lập chỉ dùng cho kiểm thử.",
    };
  },
  pattern: async (prompt) => {
    if (prompt.includes("ERROR")) throw new Error("Simulated provider failure");
    const motif = motifCatalog.find((m) => m.id === "lotus")!;
    return {
      motif: { name: "Sen và mây nét viền", paths: motif.paths },
      source: "gemini" as const,
    };
  },
  recommend: async (request) => {
    const result = fallbackRecommendations(request);
    if (request.eventId !== "ngoai_khoa") return result;
    return {
      ...result,
      isFallback: false,
      note: "Kết quả AI giả lập dùng riêng cho kiểm thử.",
      looks: result.looks.map((l) => ({
        ...l,
        isFallback: false,
        source: "gemini" as const,
      })),
    };
  },
}).listen(5101, "127.0.0.1", () => console.log("Isolated test API: 5101"));
