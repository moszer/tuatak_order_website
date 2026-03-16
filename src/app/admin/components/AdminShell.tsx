'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

const NAV_LINKS = [
  {
    href: '/admin/orders',
    label: 'คำสั่งซื้อ',
    sublabel: 'Orders',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 16h4"/>
      </svg>
    ),
  },
  {
    href: '/admin/menu',
    label: 'จัดการเมนู',
    sublabel: 'Menu',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
      </svg>
    ),
  },
  {
    href: '/admin/tables',
    label: 'จัดการโต๊ะ',
    sublabel: 'Tables',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/admin/cashflow',
    label: 'สรุปยอดเงิน',
    sublabel: 'Revenue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    href: '/admin/loyalty',
    label: 'Loyalty Points',
    sublabel: 'QR & Members',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/orders': 'คำสั่งซื้อ',
  '/admin/menu': 'จัดการเมนู',
  '/admin/tables': 'จัดการโต๊ะ',
  '/admin/cashflow': 'สรุปยอดเงิน',
  '/admin/loyalty': 'Loyalty Points',
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const currentPageTitle = PAGE_TITLES[pathname] ?? 'Admin';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify');
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'เปลี่ยนรหัสผ่านสำเร็จ', confirmButtonColor: '#10b981', confirmButtonText: 'ตกลง' });
        setShowChangePasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setPasswordError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setChangingPassword(false);
    }
  };

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const play = (f: number, d: number, t: number) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.01, t + d);
        o.start(t); o.stop(t + d);
      };
      play(523.25, 0.2, 0); play(659.25, 0.3, 0.15);
    } catch { /* ignore */ }
  };

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'shell-spin 0.8s linear infinite' }} />
        <span style={{ color: '#475569', fontSize: '0.875rem', letterSpacing: '0.3px' }}>กำลังตรวจสอบสิทธิ์...</span>
        <style>{`@keyframes shell-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const SIDEBAR_W = 240;

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes shell-spin { to { transform: rotate(360deg); } }
        @keyframes shell-fade { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shell-pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
        .shell-nav-item { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:8px; text-decoration:none; color:#64748b; font-size:0.875rem; font-weight:500; transition:all 0.15s ease; cursor:pointer; border:none; background:transparent; width:100%; text-align:left; }
        .shell-nav-item:hover { background:rgba(255,255,255,0.05); color:#cbd5e1; }
        .shell-nav-item.active { background:rgba(16,185,129,0.12); color:#10b981; font-weight:600; }
        .shell-nav-item.active svg { stroke:#10b981; }
        .shell-input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid #1e293b; background:#0d1117; color:#f1f5f9; font-size:0.875rem; outline:none; box-sizing:border-box; transition:border-color 0.15s; font-family:inherit; }
        .shell-input:focus { border-color:#10b981; }
        .shell-btn-primary { padding:10px 20px; border-radius:8px; border:none; background:#10b981; color:#fff; font-size:0.875rem; font-weight:600; cursor:pointer; transition:background 0.15s; font-family:inherit; }
        .shell-btn-primary:hover:not(:disabled) { background:#059669; }
        .shell-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .shell-btn-ghost { padding:10px 20px; border-radius:8px; border:1px solid #1e293b; background:transparent; color:#64748b; font-size:0.875rem; font-weight:500; cursor:pointer; transition:all 0.15s; font-family:inherit; }
        .shell-btn-ghost:hover:not(:disabled) { border-color:#334155; color:#94a3b8; }
        .shell-btn-ghost:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>

      {/* ── Sidebar ── */}
      {(!isMobile || sidebarOpen) && (
        <>
          {isMobile && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:199 }} onClick={() => setSidebarOpen(false)} />
          )}
          <aside style={{
            width: SIDEBAR_W, minHeight:'100vh', background:'#0a0f1a',
            borderRight:'1px solid #1a2332',
            display:'flex', flexDirection:'column',
            position: isMobile ? 'fixed' : 'sticky',
            top:0, left:0, height:'100vh', zIndex:200,
            flexShrink:0,
          }}>
            {/* Logo */}
            <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid #1a2332' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{
                  width:'38px', height:'38px', borderRadius:'10px',
                  background:'linear-gradient(135deg,#10b981,#059669)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'18px', flexShrink:0,
                  boxShadow:'0 4px 12px rgba(16,185,129,0.25)',
                }}>🍲</div>
                <div>
                  <div style={{ color:'#f1f5f9', fontWeight:700, fontSize:'0.95rem', lineHeight:1.2 }}>TUATAK</div>
                  <div style={{ color:'#10b981', fontWeight:600, fontSize:'0.75rem', letterSpacing:'0.5px' }}>Shabunt</div>
                </div>
              </div>
              <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', animation:'shell-pulse 2s infinite' }} />
                <span style={{ color:'#334155', fontSize:'0.72rem', letterSpacing:'0.5px', textTransform:'uppercase', fontWeight:600 }}>POS System · Online</span>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex:1, padding:'16px 12px', display:'flex', flexDirection:'column', gap:'2px', overflowY:'auto' }}>
              <div style={{ color:'#1e293b', fontSize:'0.68rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', padding:'8px 14px 6px' }}>
                เมนูหลัก
              </div>
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={`shell-nav-item${isActive ? ' active' : ''}`}
                  >
                    {link.icon}
                    <div style={{ flex:1 }}>
                      <div style={{ lineHeight:1.3 }}>{link.label}</div>
                      <div style={{ fontSize:'0.7rem', opacity:0.55, fontWeight:400 }}>{link.sublabel}</div>
                    </div>
                    {isActive && (
                      <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User footer */}
            <div style={{ padding:'12px', borderTop:'1px solid #1a2332' }}>
              <button
                className="shell-nav-item"
                onClick={() => { setShowUserMenu(!showUserMenu); }}
                style={{ marginBottom:'4px' }}
              >
                <div style={{
                  width:'32px', height:'32px', borderRadius:'8px',
                  background:'linear-gradient(135deg,#1e3a5f,#1e293b)',
                  border:'1px solid #334155',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, fontSize:'14px',
                }}>👤</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.82rem', color:'#cbd5e1', fontWeight:600, lineHeight:1.2 }}>Administrator</div>
                  <div style={{ fontSize:'0.7rem', color:'#475569' }}>Admin Account</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {showUserMenu && (
                <div style={{ animation:'shell-fade 0.15s ease', marginTop:'4px', background:'#0d1117', borderRadius:'8px', border:'1px solid #1e293b', overflow:'hidden' }}>
                  <button
                    className="shell-nav-item"
                    style={{ borderRadius:0, fontSize:'0.82rem', gap:'10px' }}
                    onClick={() => { setSoundEnabled(s => !s); if (!soundEnabled) playSound(); }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {soundEnabled
                        ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                        : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
                      }
                    </svg>
                    <span>{soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}</span>
                  </button>
                  <button
                    className="shell-nav-item"
                    style={{ borderRadius:0, fontSize:'0.82rem', gap:'10px' }}
                    onClick={() => { setShowChangePasswordModal(true); setShowUserMenu(false); }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>เปลี่ยนรหัสผ่าน</span>
                  </button>
                  <div style={{ height:'1px', background:'#1e293b' }} />
                  <button
                    className="shell-nav-item"
                    style={{ borderRadius:0, fontSize:'0.82rem', gap:'10px', color:'#ef4444' }}
                    onClick={handleLogout}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── Main area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Top bar */}
        <header style={{
          height:'60px', background:'#0a0f1a',
          borderBottom:'1px solid #1a2332',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 24px', position:'sticky', top:0, zIndex:100, flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:'4px', display:'flex' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            {/* Breadcrumb */}
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ color:'#334155', fontSize:'0.8rem' }}>Admin</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span style={{ color:'#94a3b8', fontSize:'0.8rem', fontWeight:600 }}>{currentPageTitle}</span>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{
              display:'flex', alignItems:'center', gap:'6px',
              padding:'5px 12px', borderRadius:'6px',
              background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.15)',
            }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#10b981', animation:'shell-pulse 2s infinite' }} />
              <span style={{ color:'#10b981', fontSize:'0.75rem', fontWeight:600 }}>ออนไลน์</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex:1, padding: isMobile ? '20px 16px' : '28px 32px', overflowY:'auto' }}>
          <div style={{ maxWidth:'1600px', width:'100%', margin:'0 auto' }}>
            {children}
          </div>
        </main>
      </div>

      {/* ── Change Password Modal ── */}
      {showChangePasswordModal && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}
          onClick={() => { setShowChangePasswordModal(false); setPasswordForm({ currentPassword:'', newPassword:'', confirmPassword:'' }); setPasswordError(''); }}
        >
          <div
            style={{ background:'#0d1117', borderRadius:'12px', padding:'28px', maxWidth:'440px', width:'100%', border:'1px solid #1e293b', boxShadow:'0 24px 64px rgba(0,0,0,0.6)', animation:'shell-fade 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <div>
                <h2 style={{ color:'#f1f5f9', fontSize:'1.1rem', fontWeight:700, margin:0 }}>เปลี่ยนรหัสผ่าน</h2>
                <p style={{ color:'#475569', fontSize:'0.8rem', margin:'4px 0 0' }}>Change password</p>
              </div>
              <button
                onClick={() => { setShowChangePasswordModal(false); setPasswordForm({ currentPassword:'', newPassword:'', confirmPassword:'' }); setPasswordError(''); }}
                style={{ background:'#1e293b', border:'none', borderRadius:'6px', width:'30px', height:'30px', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {passwordError && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'8px', padding:'10px 14px', marginBottom:'18px', color:'#f87171', fontSize:'0.82rem' }}>
                {passwordError}
              </div>
            )}

            {[
              { key:'currentPassword', label:'รหัสผ่านเดิม', placeholder:'กรอกรหัสผ่านเดิม' },
              { key:'newPassword', label:'รหัสผ่านใหม่', placeholder:'อย่างน้อย 6 ตัวอักษร' },
              { key:'confirmPassword', label:'ยืนยันรหัสผ่านใหม่', placeholder:'กรอกรหัสผ่านใหม่อีกครั้ง' },
            ].map((field, i) => (
              <div key={field.key} style={{ marginBottom: i < 2 ? '16px' : '24px' }}>
                <label style={{ display:'block', color:'#64748b', fontSize:'0.78rem', fontWeight:600, marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  {field.label}
                </label>
                <input
                  type="password"
                  className="shell-input"
                  value={passwordForm[field.key as keyof typeof passwordForm]}
                  onChange={(e) => setPasswordForm({ ...passwordForm, [field.key]: e.target.value })}
                  disabled={changingPassword}
                  placeholder={field.placeholder}
                  onKeyDown={(e) => { if (e.key === 'Enter' && i === 2) handleChangePassword(); }}
                />
              </div>
            ))}

            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button className="shell-btn-ghost" disabled={changingPassword}
                onClick={() => { setShowChangePasswordModal(false); setPasswordForm({ currentPassword:'', newPassword:'', confirmPassword:'' }); setPasswordError(''); }}>
                ยกเลิก
              </button>
              <button className="shell-btn-primary" disabled={changingPassword} onClick={handleChangePassword}>
                {changingPassword
                  ? <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'shell-spin 0.8s linear infinite' }} />
                      กำลังบันทึก...
                    </span>
                  : 'บันทึก'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
