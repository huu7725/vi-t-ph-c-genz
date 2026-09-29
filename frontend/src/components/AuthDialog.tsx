import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Eye, EyeOff, Flower2, LogOut, X } from 'lucide-react';
import type { AccountSession } from '../lib/account';
export type AuthMode = 'login' | 'register' | 'account';
export interface AuthFields { name?: string; email: string; password: string; importGuestLooks: boolean }
interface Props {
  initialMode: AuthMode; session: AccountSession | null; reason?: string; onClose: () => void;
  onSubmit: (mode: 'login' | 'register', values: AuthFields) => Promise<void>; onLogout: () => Promise<void>;
}
export function AuthDialog({ initialMode, session, reason, onClose, onSubmit, onLogout }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState(''), [email, setEmail] = useState('');
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [importLooks, setImportLooks] = useState(initialMode === 'register');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { const d = dialogRef.current; d?.showModal(); return () => d?.close(); }, []);
  useEffect(() => { setMode(initialMode); setError(''); setImportLooks(initialMode === 'register'); }, [initialMode]);
  const changeMode = (next: 'login' | 'register') => { setMode(next); setError(''); setPassword(''); setConfirm(''); setImportLooks(next === 'register'); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || mode === 'account') return;
    if (mode === 'register' && password !== confirm) { setError('Hai mật khẩu chưa khớp. Vui lòng kiểm tra lại.'); return; }
    setBusy(true); setError('');
    try { await onSubmit(mode, { ...(mode === 'register' ? { name: name.trim() } : {}), email: email.trim(), password, importGuestLooks: importLooks }); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa thể đăng nhập. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };
  const logout = async () => { setBusy(true); setError(''); try { await onLogout(); onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Chưa thể đăng xuất.'); } finally { setBusy(false); } };
  return <dialog ref={dialogRef} className="auth-dialog" aria-labelledby="auth-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} onClick={e => { if (e.currentTarget === e.target && !busy) onClose(); }}>
    <div className="auth-shell"><div className="auth-top"><span className="eyebrow"><Flower2 size={17}/> GÓC PHONG CÁCH CỦA BẠN</span><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Đóng đăng nhập"><X size={20}/></button></div>
      {mode === 'account' && session?.role === 'member' ? <>
        <span className="account-avatar">{session.user?.name.charAt(0).toUpperCase()}</span><h2 id="auth-title">Chào {session.user?.name}.</h2><p className="auth-subtitle">{session.user?.email}</p>
        <div className="account-summary"><span><Check size={16}/> Tài khoản thành viên</span><strong>{session.usage.lookbookCount} / {session.limits.lookbook} bản phối đã lưu</strong><p>Tủ đồ được lưu theo tài khoản. Đăng nhập để mở lại trên trình duyệt khác.</p></div>
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button className="button secondary full" onClick={logout} disabled={busy}><LogOut size={16}/>{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}</button>
      </> : <>
        <div className="auth-tabs" role="group" aria-label="Chọn đăng nhập hoặc đăng ký"><button aria-pressed={mode === 'login'} onClick={() => changeMode('login')} disabled={busy}>Đăng nhập</button><button aria-pressed={mode === 'register'} onClick={() => changeMode('register')} disabled={busy}>Đăng ký</button></div>
        <h2 id="auth-title">{mode === 'register' ? 'Giữ lại chất riêng của bạn.' : 'Mừng bạn trở lại.'}</h2>
        <p className="auth-subtitle">{mode === 'register' ? 'Tạo tài khoản để có tủ đồ riêng và tiếp tục khám phá cùng AI.' : 'Đăng nhập để mở tủ đồ và tiếp tục bản phối đang chờ.'}</p>
        {reason && <div className="auth-reason">{reason}</div>}
        <div className="auth-benefits"><span><Check size={13}/> Lưu đến 100 bản phối</span><span><Check size={13}/> Không áp giới hạn AI của khách</span></div>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Tên của bạn<input name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={60} required placeholder="Bạn muốn được gọi là gì?" disabled={busy}/></label>}
          <label>Email<input name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} placeholder="ban@example.com" disabled={busy}/></label>
          <label htmlFor="auth-password">Mật khẩu</label><div className="password-field"><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} minLength={10} maxLength={128} required placeholder="Ít nhất 10 ký tự" disabled={busy}/><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(s => !s)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
          {mode === 'register' && <label>Nhập lại mật khẩu<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={10} maxLength={128} required placeholder="Nhập lại mật khẩu của bạn" disabled={busy}/></label>}
          {(session?.usage.lookbookCount || 0) > 0 && <label className="import-checkbox"><input type="checkbox" checked={importLooks} onChange={e => setImportLooks(e.target.checked)} disabled={busy}/><span>Chuyển {session?.usage.lookbookCount} bản phối khách vào tài khoản này.</span></label>}
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button className="button primary full" type="submit" disabled={busy || !session}>{busy ? 'Đang xử lý…' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập vào tài khoản'}<ArrowUpRight size={16}/></button>
        </form>
        <button className="guest-continue" disabled={busy} onClick={onClose}>Tiếp tục với vai trò khách trải nghiệm <ArrowUpRight size={14}/></button>
        <p className="auth-guest-note">Khách có 3 lượt AI/ngày và tối đa 3 bản phối. Tự phối và xem kiến thức luôn mở.</p>
      </>}
    </div>
  </dialog>;
}
