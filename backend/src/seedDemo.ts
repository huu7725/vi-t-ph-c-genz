import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthStore } from './authStore.js';
import { hashPassword } from './auth.js';
import { defaultRequest, defaultPattern, groundLook, getRelevantFacts, type StylingRequest } from './domain.js';

const demoConfigSchema = z.object({
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  name: z.string().trim().min(2).max(60),
  password: z.string().min(6).max(128),
});
export type DemoConfig = z.infer<typeof demoConfigSchema>;
type SeedResult = { status: 'disabled' | 'exists' } | { status: 'created'; email: string; lookCount: number };

export function readDemoConfig(env: NodeJS.ProcessEnv): DemoConfig | null {
  if (env.SEED_DEMO_DATA !== 'true') return null;
  const parsed = demoConfigSchema.safeParse({
    email: env.DEMO_EMAIL || 'demo@vietphuc.vn',
    name: env.DEMO_NAME || 'Nguyễn Hữu Thuận',
    password: env.DEMO_PASSWORD ?? '123456',
  });
  if (!parsed.success) throw new Error('Cấu hình seed chưa hợp lệ: kiểm tra DEMO_EMAIL, DEMO_NAME và DEMO_PASSWORD (6–128 ký tự).');
  return parsed.data;
}

export function demoLooks() {
  const examples: Array<{ title: string; reason: string; request: StylingRequest }> = [
    {
      title: 'Thanh Xuân Di Sản — Ngũ thân & quạt tre',
      reason: 'Áo xanh ngọc, quần trắng ngà và quạt xếp cho ngày chụp kỷ yếu. Sneakers là cách phối đương đại.',
      request: { ...defaultRequest, gender: 'nam', pattern: { ...defaultPattern, motifId: 'lotus', color: '#E9C46A' } },
    },
    {
      title: 'Du Xuân Dịu Dàng — Áo dài đỏ gạch',
      reason: 'Đỏ gạch phối trắng ngà, chuỗi ngọc và túi cói. Hoa sen nét viền tạo điểm nhấn nhẹ trên thân áo.',
      request: { ...defaultRequest, garmentId: 'ao_dai', eventId: 'du_xuan', gender: 'nu', primaryColor: '#BC4749', selectedAccessories: ['acc_chuoi_ngoc','acc_tui_coi','acc_guoc_moc'], pattern: { ...defaultPattern, motifId: 'lotus', opacity: 0.8 } },
    },
    {
      title: 'Nét Việt Gen Z — Mây ngọc ngày hội',
      reason: 'Xanh mint, quần kem, túi mini và nón lá cầm tay tạo một bản phối trẻ trung; họa tiết mây là minh họa đương đại.',
      request: { ...defaultRequest, eventId: 'ngoai_khoa', styleId: 'tre_trung', gender: 'nu', primaryColor: '#B7D7C4', selectedAccessories: ['acc_non_la','acc_kep_hoa','acc_tui_deo_cheo','acc_sneaker_trang'], pattern: { ...defaultPattern, motifId: 'clouds', placement: 'hem', color: '#1E5E58', opacity: 0.85 } },
    },
  ];
  return examples.map(({title,reason,request}) => groundLook({
    title, garmentId: request.garmentId, eventId: request.eventId, gender: request.gender,
    palette: [request.primaryColor,request.accentColor], accessoryIds: request.selectedAccessories,
    stylingReason: reason, culturalFactIds: getRelevantFacts(request.garmentId).map(f=>f.id), cautionRuleIds: ['caution_quan_dai'],
  }, request, 'fallback'));
}

/** Create the complete demo only when its email is absent. Never reset an existing account. */
export async function seedDemoData(store: AuthStore, config: DemoConfig | null): Promise<SeedResult> {
  if (!config) return { status: 'disabled' };
  const validated = demoConfigSchema.parse(config);
  if (store.userByEmail(validated.email)) return { status: 'exists' };
  const passwordHash = await hashPassword(validated.password);
  const looks = demoLooks();
  return store.transaction(() => {
    // Recheck under the write lock if another startup seeded while scrypt ran.
    if (store.userByEmail(validated.email)) return { status: 'exists' };
    const actorId = randomUUID();
    store.db.prepare("INSERT INTO actors (id, role) VALUES (?, 'member')").run(actorId);
    store.db.prepare('INSERT INTO users (actor_id,email,name,password_hash) VALUES (?,?,?,?)').run(actorId,validated.email,validated.name,passwordHash);
    store.db.prepare('INSERT INTO account_limits (actor_id,ai_per_day) VALUES (?,50)').run(actorId);
    const savedAt = new Date(store.now()).toISOString();
    for (const look of looks) store.db.prepare('INSERT INTO looks (actor_id,id,body,saved_at) VALUES (?,?,?,?)').run(actorId,look.id,JSON.stringify(look),savedAt);
    return { status: 'created', email: validated.email, lookCount: looks.length };
  });
}
