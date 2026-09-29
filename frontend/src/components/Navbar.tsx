import {
  ArrowUpRight,
  Bookmark,
  Compass,
  Palette,
  Sparkles,
} from "lucide-react";
import type { Tab } from "../types";
import type { AccountSession } from '../lib/account';

interface Props {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  lookbookCount: number;
  session: AccountSession | null;
  onAuth: (mode: 'login' | 'register' | 'account') => void;
}
export function Navbar({ activeTab, setActiveTab, lookbookCount, session, onAuth }: Props) {
  const tabs = [
    { id: "explore", name: "Khám phá", icon: Compass },
    { id: "studio", name: "Phòng phối đồ", icon: Palette },
    { id: "recommend", name: "Gợi ý", icon: Sparkles },
    { id: "lookbook", name: "Lookbook", icon: Bookmark },
  ] as const;
  return (
    <header className="site-header">
      <div className="nav-inner">
        <button
          className="brand"
          onClick={() => setActiveTab("explore")}
          aria-label="Việt Phục Remix — Trang chủ"
        >
          <span className="brand-mark">
            v<span>✳</span>
          </span>
          <span>
            việt phục<span className="brand-sub">REMIX / GEN Z</span>
          </span>
        </button>
        <nav aria-label="Điều hướng chính">
          {tabs.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={`nav-link ${activeTab === id ? "active" : ""}`}
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} />
              <span>{name}</span>
              {id === "lookbook" && lookbookCount > 0 && (
                <b className="nav-count">{lookbookCount}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-account">
          {session?.role === 'member' ? <button className="account-trigger" onClick={() => onAuth('account')} aria-label={`Tài khoản của ${session.user?.name}`}><span>{session.user?.name.charAt(0).toUpperCase()}</span><strong>{session.user?.name}</strong></button> : <><span className="guest-label">Khách trải nghiệm</span><button className="text-link" onClick={() => onAuth('login')}>Đăng nhập</button><button className="button primary nav-register" onClick={() => onAuth('register')}>Đăng ký <ArrowUpRight size={13}/></button></>}
        </div>
      </div>
    </header>
  );
}
