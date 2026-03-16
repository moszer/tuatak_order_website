'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      if (data.authenticated) {
        router.push('/admin');
      }
    } catch (error) {
      // Not authenticated, stay on login page
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing: border-box; }
        .admin-login-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1.5px solid #334155;
          background: #1e293b;
          color: #f1f5f9;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .admin-login-input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }
        .admin-login-input::placeholder {
          color: #475569;
        }
        .admin-login-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          letter-spacing: 0.3px;
        }
        .admin-login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
        }
        .admin-login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}} />
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0
        }}>
          <div style={{
            position: 'absolute', top: '-20%', right: '-10%',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)'
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', left: '-10%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)'
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
          {/* Card */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '44px 40px',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '28px',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)'
              }}>
                🍲
              </div>
              <h1 style={{
                color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 700,
                margin: '0 0 6px', letterSpacing: '-0.3px'
              }}>
                TUATAK Shabunt
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                ระบบจัดการร้านอาหาร
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', color: '#94a3b8', fontSize: '0.8rem',
                  marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="admin-login-input"
                  placeholder="กรอกชื่อผู้ใช้"
                  autoComplete="username"
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block', color: '#94a3b8', fontSize: '0.8rem',
                  marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="admin-login-input"
                  placeholder="กรอกรหัสผ่าน"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  color: '#f87171',
                  fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="admin-login-btn">
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block', animation: 'admin-spin 0.8s linear infinite'
                    }} />
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : 'เข้าสู่ระบบ'}
              </button>
            </form>

            {/* Link to register */}
            <div style={{
              marginTop: '20px', textAlign: 'center'
            }}>
              <span style={{ color: '#475569', fontSize: '0.875rem' }}>ยังไม่มีบัญชี? </span>
              <a href="/register" style={{ color: '#10b981', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
                สมัครสมาชิก
              </a>
            </div>

            {/* Security note */}
            <div style={{
              marginTop: '20px', paddingTop: '20px',
              borderTop: '1px solid rgba(51, 65, 85, 0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <span style={{ fontSize: '0.75rem' }}>🔒</span>
              <span style={{ color: '#475569', fontSize: '0.75rem' }}>
                การเชื่อมต่อที่ปลอดภัย — สำหรับผู้ดูแลระบบเท่านั้น
              </span>
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes admin-spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    </>
  );
}
