import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { z } from "zod";

export interface StylistConsultationInput {
  height: number; // in cm
  weight: number; // in kg
  color_preference: string;
  model_type: "female_traditional" | "male_robot" | "nu_truyentong" | "nam_robot" | string;
  chest?: number;
  waist?: number;
  hip?: number;
}

export interface StylistConsultationResult {
  size_recommendation: {
    size: "S" | "M" | "L" | "XL" | "XXL";
    fit_notes: string;
  };
  body_analysis: string;
  optimal_fabric: {
    id: "gam_hoa_van" | "lua_bong" | "nhung_cao_cap";
    name: string;
    reason: string;
  };
  color_palette: {
    primary: string;
    secondary: string;
    accent: string;
    explanation: string;
  };
  accessories_advice: Array<{
    item: string;
    note: string;
  }>;
  stylist_message: string;
  source: "gemini" | "fallback";
}

export const stylistResponseSchema = z.object({
  size_recommendation: z.object({
    size: z.enum(["S", "M", "L", "XL", "XXL"]),
    fit_notes: z.string().min(1),
  }),
  body_analysis: z.string().min(1),
  optimal_fabric: z.object({
    id: z.enum(["gam_hoa_van", "lua_bong", "nhung_cao_cap"]),
    name: z.string().min(1),
    reason: z.string().min(1),
  }),
  color_palette: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    explanation: z.string().min(1),
  }),
  accessories_advice: z.array(
    z.object({
      item: z.string().min(1),
      note: z.string().min(1),
    }),
  ).min(2),
  stylist_message: z.string().min(1),
});

export const stylistSystemInstruction = `Bạn là Trợ lý Ảo Stylist Chuyên nghiệp cho Hệ Thống Thử Đồ 3D Áo Dài Truyền Thống Việt Nam & Gen Z Remix.
Nhiệm vụ của bạn:
1. Phân tích chỉ số hình thể của người dùng (chiều cao, cân nặng, số đo nếu có) một cách tích cực, tinh tế và tôn vinh vóc dáng.
2. Gợi ý chọn size áo dài chuẩn xác (S: <155cm & <48kg, M: 155-163cm & 48-55kg, L: 163-170cm & 55-63kg, XL: 170-178cm & 63-73kg, XXL: >178cm hoặc >73kg; điều chỉnh theo tà áo và ngực/eo).
3. Đề xuất chất liệu vải tối ưu trong 3 loại:
   - "gam_hoa_van" (Gấm hoa văn): Đứng phom sang trọng, hoa văn chìm nổi, hợp dáng người cần tạo phom hoặc diện sự kiện trang trọng.
   - "lua_bong" (Lụa bóng): Mềm rủ, thướt tha, bay tà nhẹ nhàng, tôn nét duyên dáng, thích hợp chụp ảnh nghệ thuật hoặc vóc dáng thanh mảnh.
   - "nhung_cao_cap" (Nhung cao cấp): Quý phái, có chiều sâu thị giác dưới ánh đèn studio, che khuyết điểm tốt, cực hợp mùa thu đông hoặc phong cách quyền quý.
4. Lời khuyên phối phụ kiện đặc trưng Việt Nam: Mấn đội đầu (cho nữ), khăn đóng/mấn nam, kiềng vàng/kiềng bạc chạm khắc hoa sen, thẻ bài ngọc bội, quạt tre thư pháp, hài thêu, hoặc sneaker trắng phá cách phong cách Gen Z.
5. Luôn trả lời bằng định dạng JSON chuẩn đúng schema, không chứa markdown bên ngoài JSON.`;

/**
 * Thuật toán tính toán đề xuất nội bộ (Fallback) khi không có mạng hoặc không cấu hình Gemini API Key
 */
export function generateFallbackConsultation(
  input: StylistConsultationInput,
  reason = "Gợi ý thông minh dựa trên phân tích hình thể & quy chuẩn may đo Áo Dài.",
): StylistConsultationResult {
  const height = Number(input.height) || 162;
  const weight = Number(input.weight) || 52;
  const isFemale =
    input.model_type?.includes("nu") ||
    input.model_type?.includes("female") ||
    !input.model_type?.includes("nam");

  const bmi = weight / Math.pow(height / 100, 2);

  // Tính size
  let size: "S" | "M" | "L" | "XL" | "XXL" = "M";
  if (height < 155 && weight < 48) size = "S";
  else if (height <= 164 && weight <= 55) size = "M";
  else if (height <= 172 && weight <= 64) size = "L";
  else if (height <= 180 && weight <= 75) size = "XL";
  else size = "XXL";

  // Phân tích dáng
  let bodyDesc = "Vóc dáng cân đối, thanh thoát chuẩn Á Đông.";
  if (bmi < 18.5) {
    bodyDesc = `Vóc dáng mảnh mai, thanh tú (BMI ${bmi.toFixed(1)}). Áo dài với tà buông tự nhiên sẽ tôn lên nét nhẹ nhàng, duyên dáng.`;
  } else if (bmi <= 23) {
    bodyDesc = `Tỉ lệ cơ thể rất chuẩn và cân đối (BMI ${bmi.toFixed(1)}), dễ dàng diện đẹp mọi phom áo dài từ truyền thống đến cách tân.`;
  } else {
    bodyDesc = `Vóc dáng đẫy đà, phúc hậu và tràn đầy năng lượng (BMI ${bmi.toFixed(1)}). Thiết kế chiết eo vừa vặn sẽ tôn trọn đường cong mềm mại.`;
  }

  // Chọn chất liệu phù hợp
  let optimalFabric: StylistConsultationResult["optimal_fabric"] = {
    id: "gam_hoa_van",
    name: "Gấm hoa văn",
    reason: "Chất vải đứng phom giúp định hình dáng áo sắc sảo, hoa văn thêu chìm tăng vẻ quyền quý, sang trọng.",
  };

  const pref = (input.color_preference || "").toLowerCase();
  if (pref.includes("vàng") || pref.includes("trắng") || pref.includes("hồng") || bmi < 19) {
    optimalFabric = {
      id: "lua_bong",
      name: "Lụa bóng",
      reason: "Độ bóng nhẹ và độ rủ mềm mại của lụa tơ tằm giúp tà áo bay bổng khi chuyển động, tạo nét thanh tao, duyên dáng.",
    };
  } else if (pref.includes("đen") || pref.includes("đỏ") || pref.includes("tím") || bmi > 23) {
    optimalFabric = {
      id: "nhung_cao_cap",
      name: "Nhung cao cấp",
      reason: "Bề mặt tuyết nhung bắt sáng tinh tế, tạo chiều sâu thị giác sang trọng và che khuyết điểm vòng eo hiệu quả.",
    };
  }

  // Phối màu
  let primary = "#BC4749"; // Đỏ ruby / gạch ấm
  let secondary = "#FDFBF7"; // Trắng ngà
  let accent = "#E9C46A"; // Vàng kim

  if (pref.includes("xanh") || pref.includes("blue")) {
    primary = "#1E5E58";
    secondary = "#E0F2FE";
    accent = "#38BDF8";
  } else if (pref.includes("vàng") || pref.includes("gold")) {
    primary = "#E9C46A";
    secondary = "#264653";
    accent = "#F4A261";
  } else if (pref.includes("đen") || pref.includes("cyber")) {
    primary = "#0F172A";
    secondary = "#00F0FF";
    accent = "#FFD700";
  }

  const accessories: StylistConsultationResult["accessories_advice"] = isFemale
    ? [
        {
          item: "Mấn đội đầu bọc gấm đồng điệu",
          note: "Tạo cảm giác tăng chiều cao tự nhiên và giữ trọn nét trang nghiêm, quý phái của thiếu nữ Việt.",
        },
        {
          item: "Kiềng vàng chạm khắc hoa sen",
          note: "Điểm nhấn lấp lánh ngay cổ áo đứng, làm nổi bật đường nét thanh tú và xương quai xanh.",
        },
        {
          item: "Quạt tre xếp cầm tay",
          note: "Phụ kiện tạo dáng thanh nhã cho những góc máy 360 độ hoặc khung hình ngoại cảnh.",
        },
      ]
    : [
        {
          item: "Khăn đóng nam truyền thống cách điệu",
          note: "Tạo phong thái đĩnh đạc, vững chãi, cân đối hoàn hảo cùng phom áo dài ngũ thân nam.",
        },
        {
          item: "Thẻ bài ngọc bội đeo thắt lưng",
          note: "Chi tiết cổ phong điểm xuyết khí chất phong nhã, quyền quý.",
        },
        {
          item: "Sneaker cổ thấp hiện đại",
          note: "Sự kết hợp bùng nổ giữa tinh hoa truyền thống và năng lượng Gen Z hiện đại.",
        },
      ];

  return {
    size_recommendation: {
      size,
      fit_notes: `Với chiều cao ${height}cm và cân nặng ${weight}kg, size ${size} ôm vừa vặn thân trên, tà áo cách mặt đất khoảng 15-20cm tạo bước đi uyển chuyển.`,
    },
    body_analysis: bodyDesc,
    optimal_fabric: optimalFabric,
    color_palette: {
      primary,
      secondary,
      accent,
      explanation: `Sự kết hợp giữa gam màu chủ đạo cùng điểm nhấn tương phản giúp tôn sắc da và nổi bật hoa văn 3D dưới ánh đèn studio.`,
    },
    accessories_advice: accessories,
    stylist_message: `Chào bạn! Trang phục Áo Dài không chỉ là di sản ngàn năm mà còn là tuyên ngôn phong cách đậm chất Gen Z. Hãy tự tin sải bước! (${reason})`,
    source: "fallback",
  };
}

/**
 * Gọi Google Gemini API để phân tích dáng người và tạo tư vấn thời trang Áo Dài 3D chuẩn xác
 */
export async function consultStylistWithGemini(
  input: StylistConsultationInput,
): Promise<StylistConsultationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return generateFallbackConsultation(
      input,
      "Hệ thống chuyên gia thời trang tự động (Chưa cấu hình GEMINI_API_KEY).",
    );
  }

  try {
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 15000, retryOptions: { attempts: 1 } },
    });

    const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

    const promptMessage = `
Dưới đây là thông số của người dùng yêu cầu tư vấn thử đồ Áo Dài 3D:
- Chiều cao: ${input.height} cm
- Cân nặng: ${input.weight} kg
- Sở thích màu sắc: ${input.color_preference || "Tự nhiên / Thanh lịch"}
- Mẫu áo dài đang chọn: ${input.model_type === "male_robot" || input.model_type === "nam_robot" ? "Mẫu nam 'Robot-man' mặc áo dài cách tân hiện đại" : "Mẫu nữ truyền thống (Áo dài gấm, lụa)"}
${input.chest ? `- Vòng ngực: ${input.chest} cm` : ""}
${input.waist ? `- Vòng eo: ${input.waist} cm` : ""}
${input.hip ? `- Vòng mông: ${input.hip} cm` : ""}

Hãy phân tích dáng người, chọn size tối ưu (S/M/L/XL/XXL), gợi ý chất liệu vải tối ưu (gam_hoa_van, lua_bong, hoặc nhung_cao_cap), bảng màu và phụ kiện thích hợp (mấn đội đầu, kiềng vàng, quạt tre,...). Trả về JSON đúng cấu trúc.
`;

    const response = await client.models.generateContent({
      model: modelName,
      contents: promptMessage,
      config: {
        systemInstruction: stylistSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            size_recommendation: {
              type: Type.OBJECT,
              properties: {
                size: { type: Type.STRING, enum: ["S", "M", "L", "XL", "XXL"] },
                fit_notes: { type: Type.STRING },
              },
              required: ["size", "fit_notes"],
            },
            body_analysis: { type: Type.STRING },
            optimal_fabric: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, enum: ["gam_hoa_van", "lua_bong", "nhung_cao_cap"] },
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["id", "name", "reason"],
            },
            color_palette: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING },
                accent: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["primary", "secondary", "accent", "explanation"],
            },
            accessories_advice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  note: { type: Type.STRING },
                },
                required: ["item", "note"],
              },
            },
            stylist_message: { type: Type.STRING },
          },
          required: [
            "size_recommendation",
            "body_analysis",
            "optimal_fabric",
            "color_palette",
            "accessories_advice",
            "stylist_message",
          ],
        },
        temperature: 0.6,
        maxOutputTokens: 2048,
        ...(modelName.startsWith("gemini-3")
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : {}),
      },
    });

    const text = response.text || "";
    const parsed = stylistResponseSchema.parse(JSON.parse(text));
    return {
      ...parsed,
      source: "gemini",
    };
  } catch (error) {
    console.warn("[GeminiStylist] Không kết nối được Gemini, dùng fallback thông minh:", error);
    return generateFallbackConsultation(
      input,
      "Tư vấn thông minh từ hệ thống may đo Áo Dài 3D (Đang chuyển tiếp do mạng bận).",
    );
  }
}
