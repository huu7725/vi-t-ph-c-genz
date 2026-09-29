import { Bookmark, Sparkles, UserRound } from 'lucide-react';
import type { AccountSession } from '../lib/account';
export function AccessBanner({ session, error, onRegister, onReconnect }: { session: AccountSession | null; error: string; onRegister: () => void; onReconnect: () => void }) {
  if (!session || error) return <div className="access-banner offline-banner"><span>{error || 'Đang kết nối tủ đồ của bạn…'}</span>{error && <button className="text-link" onClick={onReconnect}>Kết nối lại</button>}</div>;
  const guest = session.role === 'guest';
  return <aside className={`access-banner ${guest ? 'guest-banner' : 'member-banner'}`} aria-label="Quyền trải nghiệm"><div className="access-role"><UserRound size={17}/><strong>{guest ? 'Khách trải nghiệm' : `Xin chào, ${session.user?.name}`}</strong></div><div className="access-counts"><span><Sparkles size={14}/>{guest ? `AI còn ${session.usage.aiRemaining}/${session.limits.aiPerDay} lượt hôm nay` : 'AI dành cho thành viên'}</span><span><Bookmark size={14}/>{session.usage.lookbookCount}/{session.limits.lookbook} bản phối</span></div>{guest && <button className="text-link" onClick={onRegister}>Tạo tài khoản miễn phí ↗</button>}<p>{guest ? 'Lượt AI làm mới lúc 00:00 giờ Việt Nam. Gợi ý mẫu không trừ lượt.' : 'Tủ đồ được lưu riêng theo tài khoản của bạn.'}</p></aside>;
}
