'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'login' | 'register';

export default function LoyaltyPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');

  const [loginPhone, setLoginPhone] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');

  useEffect(() => {
    fetch('/api/members/me').then(res => {
      if (res.ok) router.replace('/loyalty/profile');
      else setCheckingAuth(false);
    }).catch(() => setCheckingAuth(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/members/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/loyalty/profile');
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone, name: regName, email: regEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/loyalty/profile');
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(251,191,36,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e293b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .ly-input{width:100%;padding:12px 16px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-size:0.95rem;outline:none;box-sizing:border-box;transition:border-color 0.15s;font-family:inherit}
        .ly-input:focus{border-color:#fbbf24}
        .ly-btn{width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:1rem;font-weight:700;cursor:pointer;transition:opacity 0.15s;font-family:inherit}
        .ly-btn:hover:not(:disabled){opacity:0.9}
        .ly-btn:disabled{opacity:0.5;cursor:not-allowed}
        .ly-tab{flex:1;padding:10px;border:none;background:transparent;color:#64748b;font-size:0.9rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;font-family:inherit}
        .ly-tab.active{color:#fbbf24;border-bottom-color:#fbbf24}
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
        <h1 style={{ color: '#fbbf24', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>TUATAK Rewards</h1>
        <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.9rem' }}>สะสมแต้ม รับสิทธิพิเศษ</p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '400px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', animation: 'fadeUp 0.4s ease 0.1s both' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
          <button className={`ly-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>
            เข้าสู่ระบบ
          </button>
          <button className={`ly-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>
            สมัครสมาชิก
          </button>
        </div>

        <div style={{ padding: '28px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', color: '#f87171', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  เบอร์โทรศัพท์
                </label>
                <input
                  className="ly-input"
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </div>
              <button className="ly-btn" type="submit" disabled={loading}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ชื่อ-นามสกุล
                </label>
                <input
                  className="ly-input"
                  type="text"
                  placeholder="ชื่อของคุณ"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  เบอร์โทรศัพท์
                </label>
                <input
                  className="ly-input"
                  type="tel"
                  placeholder="08X-XXX-XXXX"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  อีเมล <span style={{ color: '#475569', fontWeight: 400 }}>(ไม่บังคับ)</span>
                </label>
                <input
                  className="ly-input"
                  type="email"
                  placeholder="email@example.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                />
              </div>
              <button className="ly-btn" type="submit" disabled={loading}>
                {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Tier info */}
      <div style={{ marginTop: '28px', display: 'flex', gap: '12px', maxWidth: '400px', width: '100%', animation: 'fadeUp 0.4s ease 0.2s both' }}>
        {[
          { tier: 'Bronze', range: '0–999', color: '#cd7f32', emoji: '🥉' },
          { tier: 'Silver', range: '1,000–4,999', color: '#94a3b8', emoji: '🥈' },
          { tier: 'Gold', range: '5,000+', color: '#fbbf24', emoji: '🥇' },
        ].map(t => (
          <div key={t.tier} style={{ flex: 1, background: '#1e293b', borderRadius: '10px', border: `1px solid ${t.color}33`, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px' }}>{t.emoji}</div>
            <div style={{ color: t.color, fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>{t.tier}</div>
            <div style={{ color: '#475569', fontSize: '0.65rem', marginTop: '2px' }}>{t.range}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
