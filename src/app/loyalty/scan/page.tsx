'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [debugMsg, setDebugMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    fetch('/api/members/me').then(res => {
      if (res.status === 401) router.replace('/loyalty');
      else setAuthChecked(true);
    }).catch(() => router.replace('/loyalty'));
  }, [router]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitCode = useCallback(async (rawText: string) => {
    processingRef.current = true;
    stopCamera();
    setScanState('processing');
    setDebugMsg('');

    let code = rawText.trim();
    try {
      const url = new URL(rawText);
      code = url.searchParams.get('code') || rawText.trim();
    } catch { /* not a URL */ }

    try {
      const res = await fetch('/api/loyalty/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setPointsEarned(data.points_earned);
        setNewTotal(data.new_total);
        setScanState('success');
      } else {
        setMessage(data.error || 'เกิดข้อผิดพลาด');
        setScanState('error');
      }
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setScanState('error');
    }
  }, [stopCamera]);

  const startScanner = useCallback(async () => {
    setMessage('');
    setDebugMsg('กำลังขอสิทธิ์กล้อง...');
    processingRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์'
        : err?.name === 'NotFoundError'
        ? 'ไม่พบกล้องในอุปกรณ์นี้'
        : `ไม่สามารถเปิดกล้องได้ (${err?.name})`;
      setMessage(msg);
      setDebugMsg('');
      setScanState('error');
      return;
    }

    streamRef.current = stream;
    setScanState('scanning');
    setDebugMsg('รอวิดีโอพร้อม...');

    // Wait for video element to render
    await new Promise(r => setTimeout(r, 100));

    const video = videoRef.current;
    if (!video) { stopCamera(); return; }

    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play().catch(() => {});

    // Load jsQR
    let jsQR: any;
    try {
      const mod = await import('jsqr');
      jsQR = mod.default ?? mod;
      setDebugMsg('กำลังสแกน...');
    } catch {
      setMessage('โหลด QR scanner ไม่สำเร็จ');
      setScanState('error');
      stopCamera();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) { stopCamera(); return; }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { stopCamera(); return; }

    // Scan every 200ms
    intervalRef.current = setInterval(() => {
      if (processingRef.current) return;
      if (!video || video.readyState < 3) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);

      // Try normal then inverted
      let result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });

      if (result?.data) {
        submitCode(result.data);
      }
    }, 200);
  }, [stopCamera, submitCode]);

  const scanImageFile = useCallback(async (file: File) => {
    setMessage('');
    processingRef.current = false;
    setScanState('processing');
    setDebugMsg('กำลังอ่านรูปภาพ...');

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setMessage('ไม่สามารถประมวลผลรูปได้'); setScanState('error'); return; }
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const mod = await import('jsqr');
    const jsQR = mod.default ?? mod;
    const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });

    if (result?.data) {
      await submitCode(result.data);
    } else {
      setMessage('ไม่พบ QR Code ในรูปภาพ กรุณาลองใหม่');
      setScanState('error');
    }
  }, [submitCode]);

  const reset = useCallback(() => {
    stopCamera();
    processingRef.current = false;
    setScanState('idle');
    setMessage('');
    setDebugMsg('');
  }, [stopCamera]);

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
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanLine{0%{top:12%}50%{top:83%}100%{top:12%}}
      `}</style>

      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/loyalty/profile" onClick={stopCamera} style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem' }}>สแกน QR Code</span>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Success */}
        {scanState === 'success' && (
          <div style={{ width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ color: '#4ade80', fontSize: '2rem', fontWeight: 800, margin: '0 0 8px' }}>+{pointsEarned} แต้ม!</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 6px' }}>สะสมแต้มสำเร็จ</p>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 32px' }}>
              แต้มรวม: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{newTotal.toLocaleString()} แต้ม</span>
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={reset} style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#334155', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>สแกนอีกครั้ง</button>
              <Link href="/loyalty/profile" style={{ padding: '12px 24px', borderRadius: '10px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>ดูแต้มของฉัน</Link>
            </div>
          </div>
        )}

        {/* Error */}
        {scanState === 'error' && (
          <div style={{ width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ color: '#f87171', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px' }}>ไม่สำเร็จ</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 32px', lineHeight: 1.6 }}>{message}</p>
            <button onClick={reset} style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>ลองใหม่</button>
          </div>
        )}

        {/* Processing */}
        {scanState === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', border: '4px solid rgba(251,191,36,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#94a3b8' }}>กำลังประมวลผล...</p>
          </div>
        )}

        {/* Idle */}
        {scanState === 'idle' && (
          <div style={{ width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ width: '140px', height: '140px', background: 'rgba(251,191,36,0.08)', border: '2px dashed rgba(251,191,36,0.35)', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px', margin: '0 auto 28px', animation: 'pulse 2s infinite' }}>
              📷
            </div>
            <h2 style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px' }}>พร้อมสแกน QR Code</h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 28px' }}>กดปุ่มเพื่อเปิดกล้องหรืออัปโหลดรูป QR จาก gallery</p>

            <button
              onClick={startScanner}
              style={{ display: 'block', width: '100%', padding: '15px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(245,158,11,0.3)', marginBottom: '12px' }}
            >
              📷 เปิดกล้องสแกน
            </button>

            <label style={{ display: 'block', width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
              🖼️ อัปโหลดรูป QR จาก Gallery
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) scanImageFile(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        )}

        {/* Camera view — always rendered when scanning or processing to keep video alive */}
        <div style={{ width: '100%', display: scanState === 'scanning' ? 'block' : 'none', animation: 'fadeUp 0.3s ease' }}>
          <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '12px', fontSize: '0.88rem' }}>
            {debugMsg || 'วาง QR Code ให้อยู่ในกรอบ'}
          </p>

          <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', width: '100%', aspectRatio: '1' }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />

            {/* Corner guides */}
            {(['tl','tr','bl','br'] as const).map(pos => (
              <div key={pos} style={{
                position: 'absolute',
                width: '44px', height: '44px',
                top: pos[0] === 't' ? '12%' : 'auto',
                bottom: pos[0] === 'b' ? '12%' : 'auto',
                left: pos[1] === 'l' ? '12%' : 'auto',
                right: pos[1] === 'r' ? '12%' : 'auto',
                borderTop: pos[0] === 't' ? '3px solid #fbbf24' : 'none',
                borderBottom: pos[0] === 'b' ? '3px solid #fbbf24' : 'none',
                borderLeft: pos[1] === 'l' ? '3px solid #fbbf24' : 'none',
                borderRight: pos[1] === 'r' ? '3px solid #fbbf24' : 'none',
                borderRadius: pos === 'tl' ? '8px 0 0 0' : pos === 'tr' ? '0 8px 0 0' : pos === 'bl' ? '0 0 0 8px' : '0 0 8px 0',
              }} />
            ))}

            {/* Animated scan line */}
            <div style={{
              position: 'absolute', left: '12%', right: '12%', height: '2px',
              background: 'linear-gradient(90deg,transparent,#fbbf24,transparent)',
              animation: 'scanLine 2s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(251,191,36,0.8)',
            }} />

            {/* Dark overlay on sides */}
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 20% rgba(0,0,0,0.6)', pointerEvents: 'none' }} />
          </div>

          {/* Hidden canvas */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <button
            onClick={reset}
            style={{ width: '100%', marginTop: '14px', padding: '13px', borderRadius: '10px', border: '1px solid #334155', background: 'transparent', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ยกเลิก
          </button>
        </div>

      </div>
    </div>
  );
}
