'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

export default function ScanPage() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [message, setMessage] = useState('');
  const [pointsEarned, setPointsEarned] = useState(0);
  const [newTotal, setNewTotal] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(false);

  // Check auth
  useEffect(() => {
    fetch('/api/members/me').then(res => {
      if (res.status === 401) router.replace('/loyalty');
      else setAuthChecked(true);
    }).catch(() => router.replace('/loyalty'));
  }, [router]);

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setScanState('scanning');
    setMessage('');

    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import('html5-qrcode');

    const qrRegion = document.getElementById('qr-reader');
    if (!qrRegion) return;

    const html5QrCode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!mountedRef.current) return;
          stopScanner();
          setScanState('processing');

          // Extract code — support both plain UUID and URL format
          let code = decodedText.trim();
          try {
            const url = new URL(decodedText);
            code = url.searchParams.get('code') || decodedText.trim();
          } catch { /* not a URL */ }

          try {
            const res = await fetch('/api/loyalty/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            const data = await res.json();

            if (!mountedRef.current) return;

            if (res.ok) {
              setPointsEarned(data.points_earned);
              setNewTotal(data.new_total);
              setScanState('success');
            } else {
              setMessage(data.error || 'เกิดข้อผิดพลาด');
              setScanState('error');
            }
          } catch {
            if (mountedRef.current) {
              setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
              setScanState('error');
            }
          }
        },
        () => { /* ignore frame errors */ }
      );
    } catch (err: any) {
      if (mountedRef.current) {
        setMessage(err?.message?.includes('Permission') ? 'กรุณาอนุญาตการเข้าถึงกล้อง' : 'ไม่สามารถเปิดกล้องได้');
        setScanState('error');
      }
    }
  };

  const reset = () => {
    stopScanner();
    setScanState('idle');
    setMessage('');
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(251,191,36,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        #qr-reader video{border-radius:12px}
        #qr-reader{border:none!important}
        #qr-reader__scan_region{border:none!important}
        #qr-reader__dashboard{display:none!important}
      `}</style>

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/loyalty/profile" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </Link>
        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>สแกน QR Code</span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Success state */}
        {scanState === 'success' && (
          <div style={{ width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ color: '#4ade80', fontSize: '1.8rem', fontWeight: 800, margin: '0 0 8px' }}>
              +{pointsEarned} แต้ม!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 8px' }}>สะสมแต้มสำเร็จ</p>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 32px' }}>
              แต้มรวม: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{newTotal.toLocaleString()} แต้ม</span>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#334155', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                สแกนอีกครั้ง
              </button>
              <Link href="/loyalty/profile" style={{ padding: '12px 24px', borderRadius: '10px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                ดูแต้มของฉัน
              </Link>
            </div>
          </div>
        )}

        {/* Error state */}
        {scanState === 'error' && (
          <div style={{ width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ color: '#f87171', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px' }}>ไม่สำเร็จ</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 32px' }}>{message}</p>
            <button
              onClick={reset}
              style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Processing state */}
        {scanState === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid rgba(251,191,36,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#94a3b8' }}>กำลังประมวลผล...</p>
          </div>
        )}

        {/* Idle state */}
        {scanState === 'idle' && (
          <div style={{ width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ width: '120px', height: '120px', background: 'rgba(251,191,36,0.1)', border: '2px dashed rgba(251,191,36,0.3)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', margin: '0 auto 24px', animation: 'pulse 2s infinite' }}>
              📷
            </div>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px' }}>พร้อมสแกน QR Code</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 32px' }}>กดปุ่มด้านล่างเพื่อเปิดกล้องและสแกน</p>
            <button
              onClick={startScanner}
              style={{ padding: '14px 40px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              เปิดกล้องสแกน
            </button>
          </div>
        )}

        {/* Scanning state — camera view */}
        {scanState === 'scanning' && (
          <div style={{ width: '100%', animation: 'fadeUp 0.3s ease' }}>
            <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '16px', fontSize: '0.9rem' }}>
              วาง QR Code ให้อยู่ในกรอบ
            </p>
            <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#1e293b', border: '1px solid #334155' }}>
              <div id="qr-reader" style={{ width: '100%' }} />
            </div>
            <button
              onClick={reset}
              style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
