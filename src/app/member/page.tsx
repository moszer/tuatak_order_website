'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: number;
  phone: string;
  name: string;
  email?: string;
  points: number;
  totalVisits: number;
  tier: 'member' | 'silver' | 'gold' | 'platinum';
  memberNumber: string;
  validTill: string;
  profileImage?: string;
  lineUid?: string;
  linePictureUrl?: string;
  address?: string;
  gender?: 'male' | 'female' | 'other';
  createdAt: string;
}

interface PointsHistory {
  id: number;
  memberId: number;
  points: number;
  type: 'earn' | 'redeem';
  description?: string;
  tableNumber?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'restaurant_member';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getTierLabel(tier: string): string {
  switch (tier) {
    case 'silver': return 'SILVER';
    case 'gold': return 'GOLD';
    case 'platinum': return 'PLATINUM';
    default: return 'MEMBER';
  }
}

function getNextTierInfo(points: number): { nextTier: string; threshold: number; prevThreshold: number } {
  if (points < 1000) return { nextTier: 'SILVER', threshold: 1000, prevThreshold: 0 };
  if (points < 5000) return { nextTier: 'GOLD', threshold: 5000, prevThreshold: 1000 };
  return { nextTier: 'MAX', threshold: 5000, prevThreshold: 5000 };
}

function getTierFromPoints(points: number): string {
  if (points >= 5000) return 'gold';
  if (points >= 1000) return 'silver';
  return 'member';
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconHome({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconCard({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconGift({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconPerson({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconBell({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconQr({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <line x1="17" y1="14" x2="21" y2="14" />
      <line x1="21" y1="14" x2="21" y2="18" />
      <line x1="17" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconChevronRight({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconTicket({ color }: { color: string }) {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  );
}

function IconLocation({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconTruck({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

// ─── Member Card Component ─────────────────────────────────────────────────────

function MemberCard({ member }: { member: Member }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#c44a1a,#FF6B4A)',
        borderRadius: 16,
        padding: '20px 20px 20px 20px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 180,
        boxShadow: '0 4px 20px rgba(255,107,74,0.4)',
        animation: 'mem-float 5s ease-in-out infinite, mem-pulse-glow 3s ease-in-out infinite',
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', right: -30, top: -30,
        width: 120, height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
      }} />
      <div style={{
        position: 'absolute', right: 20, bottom: -40,
        width: 100, height: 100,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>Tuatak</div>
          <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 2, marginTop: 1 }}>RESTAURANT</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {member.linePictureUrl && (
            <img
              src={member.linePictureUrl}
              alt={member.name}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }}
            />
          )}
          <div style={{ opacity: 0.85 }}>
            <IconQr color="#fff" />
          </div>
        </div>
      </div>

      {/* Tier badge */}
      <div style={{ marginTop: 14 }}>
        <span style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 20,
          padding: '3px 14px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
          border: '1px solid rgba(255,255,255,0.35)',
        }}>
          {getTierLabel(member.tier)}
        </span>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, position: 'relative' }}>
        <div>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>Member no.</div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>{member.memberNumber}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>Valid till</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(member.validTill)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── QR Scan Modal ────────────────────────────────────────────────────────────

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

function QrScanModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (pts: number) => void }) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [message, setMessage] = useState('');
  const [pointsEarned, setPointsEarned] = useState(0);
  const [debugMsg, setDebugMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitCode = useCallback(async (rawText: string) => {
    processingRef.current = true;
    stopCamera();
    setScanState('processing');
    let code = rawText.trim();
    try { const url = new URL(rawText); code = url.searchParams.get('code') || rawText.trim(); } catch {}
    try {
      const res = await fetch('/api/loyalty/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setPointsEarned(data.points_earned);
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

  const startCamera = useCallback(async () => {
    setMessage(''); setDebugMsg('กำลังขอสิทธิ์กล้อง...'); processingRef.current = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError' ? 'กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์'
        : err?.name === 'NotFoundError' ? 'ไม่พบกล้องในอุปกรณ์นี้'
        : `ไม่สามารถเปิดกล้องได้ (${err?.name})`;
      setMessage(msg); setScanState('error'); return;
    }
    streamRef.current = stream;
    setScanState('scanning');
    setDebugMsg('กำลังสแกน...');
    await new Promise(r => setTimeout(r, 100));
    const video = videoRef.current;
    if (!video) { stopCamera(); return; }
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play().catch(() => {});
    let jsQR: any;
    try { const mod = await import('jsqr'); jsQR = mod.default ?? mod; } catch { setMessage('โหลด QR scanner ไม่สำเร็จ'); setScanState('error'); stopCamera(); return; }
    const canvas = canvasRef.current;
    if (!canvas) { stopCamera(); return; }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { stopCamera(); return; }
    intervalRef.current = setInterval(() => {
      if (processingRef.current || !video || video.readyState < 3) return;
      const w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (result?.data) submitCode(result.data);
    }, 200);
  }, [stopCamera, submitCode]);

  const scanFromFile = useCallback(async (file: File) => {
    setScanState('processing'); setDebugMsg(''); processingRef.current = false;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setMessage('ไม่สามารถประมวลผลรูปได้'); setScanState('error'); return; }
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mod = await import('jsqr');
    const jsQR = mod.default ?? mod;
    const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    if (result?.data) await submitCode(result.data);
    else { setMessage('ไม่พบ QR Code ในรูปภาพ กรุณาลองใหม่'); setScanState('error'); }
  }, [submitCode]);

  const reset = () => { stopCamera(); processingRef.current = false; setScanState('idle'); setMessage(''); setDebugMsg(''); };
  const handleClose = () => { stopCamera(); onClose(); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: '#3D352E', animation: 'mem-fadeIn 0.25s ease' }}>
      <style>{`@keyframes scanLine{0%{top:12%}50%{top:83%}100%{top:12%}} @keyframes spin2{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b5a99d" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#ffffff' }}>สแกน QR Code</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', overflowY: 'auto' }}>

        {/* Success */}
        {scanState === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#68D391', marginBottom: 6 }}>+{pointsEarned} แต้ม!</div>
            <div style={{ color: '#b5a99d', marginBottom: 32 }}>สะสมแต้มสำเร็จ</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={reset} style={{ padding: '11px 22px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: '#3D352E', color: '#b5a99d', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>สแกนอีกครั้ง</button>
              <button onClick={() => { onSuccess(pointsEarned); handleClose(); }} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#c44a1a,#FF6B4A)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>ตกลง</button>
            </div>
          </div>
        )}

        {/* Error */}
        {scanState === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FF6B4A', marginBottom: 8 }}>ไม่สำเร็จ</div>
            <div style={{ color: '#b5a99d', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>{message}</div>
            <button onClick={reset} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#c44a1a,#FF6B4A)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>ลองใหม่</button>
          </div>
        )}

        {/* Processing */}
        {scanState === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '4px solid rgba(255,107,74,0.2)', borderTopColor: '#FF6B4A', borderRadius: '50%', animation: 'spin2 0.8s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ color: '#b5a99d' }}>กำลังประมวลผล...</div>
          </div>
        )}

        {/* Idle */}
        {scanState === 'idle' && (
          <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#ffffff', marginBottom: 8 }}>พร้อมสแกน QR Code</div>
            <div style={{ color: '#b5a99d', fontSize: 13, marginBottom: 28 }}>กดปุ่มเปิดกล้อง หรืออัปโหลดรูป QR จาก Gallery</div>
            <button onClick={startCamera} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#c44a1a,#FF6B4A)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 16px rgba(255,107,74,0.35)' }}>
              📷 เปิดกล้องสแกน
            </button>
            <label style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', background: '#3D352E', color: '#b5a99d', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
              🖼️ อัปโหลดรูปจาก Gallery
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) scanFromFile(f); e.target.value = ''; }} />
            </label>
          </div>
        )}

        {/* Camera view */}
        <div style={{ width: '100%', maxWidth: 360, display: scanState === 'scanning' ? 'block' : 'none' }}>
          <div style={{ color: '#b5a99d', textAlign: 'center', marginBottom: 10, fontSize: 13 }}>{debugMsg || 'วาง QR Code ให้อยู่ในกรอบ'}</div>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1', width: '100%' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {(['tl','tr','bl','br'] as const).map(pos => (
              <div key={pos} style={{ position: 'absolute', width: 40, height: 40,
                top: pos[0]==='t'?'12%':'auto', bottom: pos[0]==='b'?'12%':'auto',
                left: pos[1]==='l'?'12%':'auto', right: pos[1]==='r'?'12%':'auto',
                borderTop: pos[0]==='t'?'3px solid #FF6B4A':'none', borderBottom: pos[0]==='b'?'3px solid #FF6B4A':'none',
                borderLeft: pos[1]==='l'?'3px solid #FF6B4A':'none', borderRight: pos[1]==='r'?'3px solid #FF6B4A':'none',
                borderRadius: pos==='tl'?'6px 0 0 0':pos==='tr'?'0 6px 0 0':pos==='bl'?'0 0 0 6px':'0 0 6px 0',
              }}/>
            ))}
            <div style={{ position: 'absolute', left: '12%', right: '12%', height: 2, background: 'linear-gradient(90deg,transparent,#FF6B4A,transparent)', animation: 'scanLine 2s ease-in-out infinite', boxShadow: '0 0 8px rgba(255,107,74,0.8)' }} />
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 20% rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <button onClick={reset} style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: '#3D352E', color: '#b5a99d', fontSize: 14, cursor: 'pointer' }}>ยกเลิก</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: หน้าหลัก ────────────────────────────────────────────────────────────

function TabHome({ member, onRefresh, onScan }: { member: Member; onRefresh: () => void; onScan: () => void }) {
  const pts = member.points ?? 0;
  const tierInfo = getNextTierInfo(pts);
  const currentTier = getTierFromPoints(pts);
  const isMaxTier = pts >= 5000;
  const progressPct = isMaxTier ? 100 : Math.min(100, Math.round(((pts - tierInfo.prevThreshold) / (tierInfo.threshold - tierInfo.prevThreshold)) * 100));
  const remaining = isMaxTier ? 0 : tierInfo.threshold - pts;
  const [showLocation, setShowLocation] = useState(false);

  return (
    <div style={{ paddingBottom: 80, animation: 'mem-fadeInUp 0.35s ease' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 20px 12px',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#b5a99d' }}>ยินดีต้อนรับ</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>{member.name}</div>
        </div>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          aria-label="การแจ้งเตือน"
        >
          <IconBell color="#718096" />
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Member card */}
        <MemberCard member={member} />

        {/* QR scan button */}
        <button
          onClick={onScan}
          className="mem-btn-press"
          style={{
            display: 'block', width: '100%', marginTop: 14,
            background: '#3D352E', color: '#FF6B4A',
            border: '2px solid #FF6B4A', borderRadius: 10,
            padding: '12px 0', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
            transition: 'box-shadow 0.2s, background 0.2s',
          }}
        >
          สแกน QR CODE สะสมคะแนน
        </button>

        {/* Points progress */}
        <div style={{
          background: '#3D352E', borderRadius: 14, padding: 16, marginTop: 16,
          boxShadow: '0 1px 8px rgba(0,0,0,0.35)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: '#ffffff', fontSize: 15 }}>คะแนนสะสม</span>
            <span style={{ fontWeight: 800, color: '#FF6B4A', fontSize: 20, animation: 'mem-countPop 0.5s ease 0.2s both' }}>
              {pts.toLocaleString()} <span style={{ fontWeight: 400, color: '#b5a99d', fontSize: 13 }}>แต้ม</span>
            </span>
          </div>
          <div style={{ height: 10, background: 'rgba(255,107,74,0.2)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#c44a1a,#FF6B4A)', borderRadius: 10, animation: 'mem-progress 1s ease-out' }} />
          </div>
          {!isMaxTier ? (
            <div style={{ marginTop: 8, fontSize: 12, color: '#b5a99d' }}>
              สะสมอีก <span style={{ color: '#FF6B4A', fontWeight: 700 }}>{remaining.toLocaleString()} แต้ม</span> เพื่อเลื่อนระดับเป็น {tierInfo.nextTier}
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, color: '#FF6B4A', fontWeight: 600 }}>
              คุณอยู่ในระดับสูงสุด GOLD แล้ว 🥇
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button onClick={() => setShowLocation(true)} style={{
            background: '#3D352E', border: 'none', borderRadius: 14, padding: '16px 12px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: 'pointer', animation: 'mem-scaleIn 0.4s ease 0.3s both',
          }}>
            <IconLocation color="#FF6B4A" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F5EDE8' }}>สาขา & การจอง</span>
          </button>
          <a
            href="https://web.facebook.com/profile.php?id=61573820348071"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#3D352E', border: 'none', borderRadius: 14, padding: '16px 12px',
              boxShadow: '0 1px 8px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'pointer', animation: 'mem-scaleIn 0.4s ease 0.45s both',
              textDecoration: 'none',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF6B4A">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F5EDE8' }}>ติดต่อเรา</span>
          </a>
        </div>
      </div>

      {/* Location Modal */}
      {showLocation && (
        <div
          onClick={() => setShowLocation(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'mem-fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#3D352E', borderRadius: '20px 20px 0 0',
              padding: '24px 20px 40px', width: '100%', maxWidth: 480,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
              animation: 'mem-fadeInUp 0.3s ease',
            }}
          >
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <IconLocation color="#FF6B4A" />
              <span style={{ fontSize: 17, fontWeight: 700, color: '#ffffff' }}>สาขา Tuatak Shabu</span>
            </div>

            {/* Map thumbnail */}
            <a
              href="https://maps.app.goo.gl/yWH1qWxc3SnqNiTe6"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', background: '#2D2520', borderRadius: 12,
                overflow: 'hidden', marginBottom: 16, textDecoration: 'none',
                border: '1px solid rgba(255,107,74,0.2)',
              }}
            >
              <div style={{
                height: 140,
                background: 'linear-gradient(135deg, #2D2520 0%, #3D2510 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <div style={{ fontSize: 36 }}>📍</div>
                <div style={{ fontSize: 13, color: '#FF6B4A', fontWeight: 600 }}>เปิด Google Maps</div>
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 13, color: '#F5EDE8', fontWeight: 600, marginBottom: 2 }}>
                  หน้าปั้ม ปตท ถนนเส้น แจ้งพัฒนา
                </div>
                <div style={{ fontSize: 12, color: '#b5a99d' }}>จังหวัดปราจีนบุรี</div>
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:0953955532"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#2D2520', borderRadius: 12, padding: '14px 16px',
                textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,107,74,0.15)', border: '1px solid rgba(255,107,74,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.36 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#b5a99d', marginBottom: 2 }}>โทรหาเรา</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FF6B4A', letterSpacing: 1 }}>095 395 5532</div>
              </div>
              <div style={{ marginLeft: 'auto', color: '#b5a99d', fontSize: 12 }}>โทรเลย →</div>
            </a>

            <button
              onClick={() => setShowLocation(false)}
              style={{
                display: 'block', width: '100%', marginTop: 16,
                padding: '13px 0', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                color: '#b5a99d', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: บัตรสมาชิก ──────────────────────────────────────────────────────────

function TabMemberCard({ member, history, onScan }: { member: Member; history: PointsHistory[]; onScan: () => void }) {
  const [innerTab, setInnerTab] = useState<'benefits' | 'history'>('benefits');

  const pts = member.points ?? 0;
  const currentTier = getTierFromPoints(pts);

  const tierCards = [
    {
      tier: 'MEMBER',
      key: 'member',
      color: '#b5a99d',
      bg: '#3D352E',
      threshold: '0 แต้ม',
      benefits: ['สะสมคะแนนทุกการสแกน QR', 'รับส่วนลด 5% วันเกิด'],
    },
    {
      tier: 'SILVER',
      key: 'silver',
      color: '#8a7a72',
      bg: '#4D443C',
      threshold: '1,000 แต้ม',
      benefits: ['ทุกสิทธิ์ของ Member', 'รับส่วนลด 8% วันเกิด', 'ฟรีเครื่องดื่ม 1 แก้ว/เดือน'],
    },
    {
      tier: 'GOLD',
      key: 'gold',
      color: '#F6AD55',
      bg: '#3D3520',
      threshold: '5,000 แต้ม',
      benefits: ['ทุกสิทธิ์ของ Silver', 'รับส่วนลด 10% วันเกิด', 'ฟรีของหวาน/เดือน'],
    },
  ];

  return (
    <div style={{ paddingBottom: 80, animation: 'mem-fadeInUp 0.35s ease' }}>
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>บัตรสมาชิก</h2>
        <MemberCard member={member} />

        <button onClick={onScan} style={{
          display: 'block', width: '100%', marginTop: 14,
          background: '#FF6B4A', color: '#fff',
          border: 'none', borderRadius: 10,
          padding: '13px 0', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', textAlign: 'center',
          boxShadow: '0 3px 12px rgba(255,107,74,0.35)',
        }}>
          สแกน QR Code สะสมคะแนน
        </button>

        {/* Inner tab switcher */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10,
          padding: 4, marginTop: 20,
        }}>
          {[
            { key: 'benefits', label: 'สิทธิพิเศษของฉัน' },
            { key: 'history', label: 'ประวัติสะสมคะแนน' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setInnerTab(t.key as 'benefits' | 'history')}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: innerTab === t.key ? '#fff' : 'transparent',
                color: innerTab === t.key ? '#FF6B4A' : '#b5a99d',
                boxShadow: innerTab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Benefits tab */}
        {innerTab === 'benefits' && (
          <div style={{ marginTop: 16 }}>
            {/* Points summary */}
            <div style={{ background: 'linear-gradient(135deg,#c44a1a,#FF6B4A)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>คะแนนสะสมของคุณ</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{pts.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 400 }}>แต้ม</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>ระดับปัจจุบัน</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{currentTier.toUpperCase()}</div>
              </div>
            </div>

            {tierCards.map((tc, idx) => (
              <div key={tc.tier} style={{
                background: tc.bg,
                border: `2px solid ${currentTier === tc.key ? tc.color : 'transparent'}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 12,
                animation: `mem-scaleIn 0.35s ease ${idx * 0.1}s both`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: tc.color, letterSpacing: 1 }}>{tc.tier}</span>
                    {currentTier === tc.key && <span style={{ background: tc.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>ระดับของคุณ</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#b5a99d' }}>ตั้งแต่ {tc.threshold}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {tc.benefits.map((b, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#c5b3a8', marginBottom: 3 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Tier progression */}
            <div style={{ background: '#3D352E', borderRadius: 12, padding: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.35)', marginTop: 4, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>ระดับความสำเร็จ</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {tierCards.map((tc, idx) => (
                  <div key={tc.tier} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: currentTier === tc.key ? tc.color : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', border: currentTier === tc.key ? `2px solid ${tc.color}` : '2px solid transparent' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: currentTier === tc.key ? '#fff' : '#8a7a72' }}>{tc.tier[0]}</span>
                      </div>
                      <div style={{ fontSize: 9, color: '#b5a99d', fontWeight: 600 }}>{tc.tier}</div>
                    </div>
                    {idx < tierCards.length - 1 && <div style={{ width: 32, height: 2, background: 'rgba(255,255,255,0.12)', margin: '0 4px 14px' }} />}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#b5a99d', marginTop: 10, textAlign: 'center' }}>
                Member (0) → Silver (1,000) → Gold (5,000 แต้ม)
              </div>
            </div>
          </div>
        )}

        {/* History tab */}
        {innerTab === 'history' && (
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a7a72' }}>
                <div style={{ fontSize: 14 }}>ยังไม่มีประวัติการสะสมคะแนน</div>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={h.id} style={{
                  background: '#3D352E', borderRadius: 10, padding: '12px 16px',
                  marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.35)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  animation: `mem-fadeInUp 0.3s ease ${i * 0.06}s both`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F5EDE8' }}>
                      {h.description || (h.type === 'earn' ? 'สะสมคะแนน' : 'แลกคะแนน')}
                    </div>
                    <div style={{ fontSize: 11, color: '#8a7a72', marginTop: 2 }}>
                      {formatDate(h.createdAt)}
                      {h.tableNumber ? ` • โต๊ะ ${h.tableNumber}` : ''}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 800, fontSize: 16,
                    color: h.type === 'earn' ? '#68D391' : '#FF6B4A',
                  }}>
                    {h.type === 'earn' ? '+' : '-'}{h.points}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: รางวัลของฉัน ────────────────────────────────────────────────────────

interface DBCoupon {
  id: number;
  code?: string;          // only present after claiming
  title: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number;
  points_cost: number;
  expires_at: string;
  max_uses: number;
  used_count: number;
  claimed?: boolean;      // has this member already claimed it?
  claimed_at?: string;    // for mine endpoint
  mc_id?: number;
  is_used?: number;
  per_member_uses?: number;
  owned_count?: number;
}

function CouponCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(code); }
    catch { const el = document.createElement('textarea'); el.value = code; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={{
      padding: '6px 14px', borderRadius: 8,
      border: `1px solid ${copied ? '#68D391' : '#FF6B4A'}`,
      background: copied ? 'rgba(104,211,145,0.12)' : 'rgba(255,107,74,0.08)',
      color: copied ? '#68D391' : '#FF6B4A',
      fontSize: 12, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกรหัส'}
    </button>
  );
}

function timeLeftStr(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'หมดอายุแล้ว';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `เหลือ ${days} วัน`;
  if (hours > 0) return `เหลือ ${hours} ชม.`;
  return `เหลือ ${Math.floor((diff % 3600000) / 60000)} นาที`;
}

function CouponQrModal({ couponId, couponTitle, discountType, discountValue, onClose, onUsed }: {
  couponId: number; couponTitle: string; discountType: string; discountValue: number;
  onClose: () => void; onUsed: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef('');

  useEffect(() => {
    fetch(`/api/coupons/mine/qr?couponId=${couponId}`)
      .then(r => r.json())
      .then(async data => {
        if (data.qrToken) {
          tokenRef.current = data.qrToken;
          const QRCode = (await import('qrcode')).default;
          const url = await QRCode.toDataURL(data.qrToken, { width: 240, margin: 1, color: { dark: '#1a1a1a', light: '#ffffff' } });
          setQrDataUrl(url);
          // Poll to check if coupon was used
          pollRef.current = setInterval(async () => {
            const r = await fetch('/api/coupons/mine').then(x => x.json()).catch(() => null);
            if (r?.coupons) {
              const stillExists = r.coupons.some((c: any) => c.id === couponId);
              if (!stillExists) { clearInterval(pollRef.current!); onUsed(); }
            }
          }, 3000);
        } else {
          setError(data.error || 'เกิดข้อผิดพลาด');
        }
      })
      .catch(() => setError('ไม่สามารถโหลด QR ได้'));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [couponId, onUsed]);

  const discountLabel = discountType === 'percent' ? `ลด ${discountValue}%` : `ลด ฿${discountValue.toLocaleString()}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#3D352E', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center', animation: 'mem-scaleIn 0.25s ease' }}>
        <div style={{ fontSize: 13, color: '#b5a99d', marginBottom: 4 }}>คูปองส่วนลด</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>{couponTitle}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#FF6B4A', marginBottom: 20 }}>{discountLabel}</div>

        {error ? (
          <div style={{ color: '#f87171', fontSize: 13, padding: '12px 0' }}>{error}</div>
        ) : !qrDataUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(255,107,74,0.2)', borderTopColor: '#FF6B4A', borderRadius: '50%', animation: 'mem-spin 0.8s linear infinite' }} />
            <div style={{ color: '#b5a99d', fontSize: 13 }}>กำลังสร้าง QR...</div>
          </div>
        ) : (
          <>
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 12, display: 'inline-block', marginBottom: 12 }}>
              <img src={qrDataUrl} alt="Coupon QR" style={{ display: 'block', width: 200, height: 200 }} />
            </div>
            <div style={{ fontSize: 12, color: '#8a7a72', marginBottom: 20, lineHeight: 1.6 }}>
              {checking ? '✓ กำลังตรวจสอบ...' : 'ให้พนักงานสแกน QR เพื่อใช้คูปอง'}
            </div>
          </>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#b5a99d', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ปิด
        </button>
      </div>
    </div>
  );
}

// ─── CouponCard (must be outside TabRewards to avoid remount blinking) ────────

function CouponCard({ c, isMine, member, redeeming, onRedeem, onShowQr }: {
  c: DBCoupon; isMine: boolean; member: Member;
  redeeming: number | null;
  onRedeem: (c: DBCoupon) => void;
  onShowQr: (c: DBCoupon) => void;
}) {
    const isExpiredCoupon = new Date(c.expires_at).getTime() < Date.now();
    const remaining = c.max_uses > 0 ? c.max_uses - c.used_count : null;
    const canAfford = member.points >= c.points_cost;
    const isRedeemed = c.claimed || isMine;

    return (
      <div style={{
        borderRadius: 12,
        border: `1px solid ${isMine && isExpiredCoupon ? 'rgba(255,255,255,0.12)' : 'rgba(255,107,74,0.2)'}`,
        background: (isMine && isExpiredCoupon) ? '#2D2520' : '#3D352E',
        overflow: 'hidden',
        opacity: (isMine && isExpiredCoupon) ? 0.6 : 1,
        boxShadow: (isMine && isExpiredCoupon) ? 'none' : '0 2px 8px rgba(255,107,74,0.06)',
      }}>
        <div style={{ height: 4, background: (isMine && isExpiredCoupon) ? 'rgba(255,255,255,0.15)' : 'linear-gradient(90deg,#FF6B4A,#FC8181)' }} />
        <div style={{ display: 'flex' }}>
          {/* Left: discount value */}
          <div style={{
            width: 80, flexShrink: 0,
            borderRight: '1px dashed #FED7D7',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '12px 4px', textAlign: 'center',
            background: (isMine && isExpiredCoupon) ? 'transparent' : 'rgba(255,107,74,0.08)',
          }}>
            <div style={{ color: (isMine && isExpiredCoupon) ? '#8a7a72' : '#FF6B4A', fontSize: c.discount_type === 'percent' ? 20 : 15, fontWeight: 900, lineHeight: 1 }}>
              {c.discount_type === 'percent' ? `${c.discount_value}%` : `฿${c.discount_value.toLocaleString()}`}
            </div>
            <div style={{ color: '#8a7a72', fontSize: 10, fontWeight: 600, marginTop: 3, textTransform: 'uppercase' }}>
              {c.discount_type === 'percent' ? 'ส่วนลด' : 'บาท'}
            </div>
          </div>

          {/* Right: details */}
          <div style={{ flex: 1, padding: '10px 12px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>{c.title}</div>
            {c.description && <div style={{ fontSize: 11, color: '#b5a99d', marginBottom: 4 }}>{c.description}</div>}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {/* Points cost badge */}
              {c.points_cost > 0 ? (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: isRedeemed ? '#b5a99d' : (canAfford ? '#F6AD55' : '#FF6B4A'),
                  background: isRedeemed ? '#3D352E' : (canAfford ? 'rgba(246,173,85,0.12)' : 'rgba(255,107,74,0.08)'),
                  border: `1px solid ${isRedeemed ? 'rgba(255,255,255,0.12)' : (canAfford ? 'rgba(246,173,85,0.4)' : 'rgba(255,107,74,0.2)')}`,
                  borderRadius: 4, padding: '1px 6px',
                }}>
                  ⭐ {c.points_cost} แต้ม
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#68D391', background: 'rgba(104,211,145,0.12)', border: '1px solid rgba(104,211,145,0.4)', borderRadius: 4, padding: '1px 6px' }}>
                  ฟรี!
                </span>
              )}
              {c.min_order > 0 && (
                <span style={{ fontSize: 11, color: '#b5a99d', background: '#2D2520', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px' }}>
                  ขั้นต่ำ ฿{c.min_order.toLocaleString()}
                </span>
              )}
              {remaining !== null && (
                <span style={{ fontSize: 11, color: remaining <= 5 ? '#FF6B4A' : '#b5a99d', background: '#2D2520', border: `1px solid ${remaining <= 5 ? 'rgba(255,107,74,0.2)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 4, padding: '1px 6px' }}>
                  เหลือ {remaining} สิทธิ์
                </span>
              )}
              <span style={{ fontSize: 11, color: '#b5a99d', background: '#2D2520', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 6px' }}>
                {timeLeftStr(c.expires_at)}
              </span>
              {isMine && c.owned_count && c.owned_count > 1 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, padding: '1px 6px' }}>
                  เหลือ {c.owned_count} ครั้ง
                </span>
              )}
            </div>

            {/* Action area */}
            {isMine && c.code ? (
              // Already claimed — show QR button (if not expired)
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!isExpiredCoupon ? (
                  <button
                    onClick={() => onShowQr(c)}
                    style={{
                      padding: '6px 16px', borderRadius: 8, border: 'none',
                      background: '#FF6B4A', color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zm3 3h3v3h-3zm-3 3h3"/></svg>
                    แสดง QR ใช้คูปอง
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#8a7a72', fontWeight: 600 }}>หมดอายุแล้ว</span>
                )}
              </div>
            ) : isRedeemed && c.code ? (
              // Claimed from available list
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'rgba(255,107,74,0.08)', color: '#FF6B4A', fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 4, letterSpacing: 1, fontFamily: 'monospace' }}>
                  {c.code}
                </span>
                <CouponCopyButton code={c.code} />
              </div>
            ) : (
              // Not yet claimed — show redeem button
              <button
                onClick={() => onRedeem(c)}
                disabled={redeeming === c.id || !canAfford}
                style={{
                  padding: '6px 16px', borderRadius: 8, border: 'none',
                  background: redeeming === c.id ? 'rgba(255,255,255,0.15)' : (canAfford ? '#FF6B4A' : '#4D443C'),
                  color: canAfford ? '#fff' : '#8a7a72',
                  fontSize: 12, fontWeight: 700, cursor: canAfford ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {redeeming === c.id ? 'กำลังแลก...' : (canAfford ? `แลก ${c.points_cost > 0 ? `${c.points_cost} แต้ม` : 'ฟรี'}` : `แต้มไม่พอ (มี ${member.points})`)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
}

// ─── Tab Rewards ──────────────────────────────────────────────────────────────

function TabRewards({ member, onPointsUpdate }: { member: Member; onPointsUpdate: (pts: number) => void }) {
  const [innerTab, setInnerTab] = useState<'available' | 'claimed'>('available');
  const [available, setAvailable] = useState<DBCoupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<DBCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemError, setRedeemError] = useState('');
  const [showQrCoupon, setShowQrCoupon] = useState<DBCoupon | null>(null);

  const silentRefresh = useCallback(async () => {
    const [avRes, myRes] = await Promise.all([
      fetch('/api/coupons').then(r => r.json()).catch(() => ({ coupons: [] })),
      fetch('/api/coupons/mine').then(r => r.json()).catch(() => ({ coupons: [] })),
    ]);
    setAvailable(avRes.coupons || []);
    setMyCoupons(myRes.coupons || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await silentRefresh();
    setLoading(false);
  }, [silentRefresh]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRedeem = async (c: DBCoupon) => {
    setRedeemError('');
    setRedeeming(c.id);
    try {
      const res = await fetch(`/api/coupons/${c.id}/redeem`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        onPointsUpdate(data.newPoints);
        await silentRefresh();
      } else {
        setRedeemError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setRedeemError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setRedeeming(null);
    }
  };

  const list = innerTab === 'available' ? available : myCoupons;

  return (
    <div style={{ paddingBottom: 80, animation: 'mem-fadeInUp 0.35s ease' }}>
      <div style={{ padding: '20px 16px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>รางวัลของฉัน</h2>
          <div style={{ fontSize: 13, color: '#F6AD55', fontWeight: 700 }}>⭐ {member.points.toLocaleString()} แต้ม</div>
        </div>
        <div style={{ fontSize: 12, color: '#8a7a72', marginBottom: 16 }}>แลกแต้มเพื่อรับคูปองส่วนลด</div>

        {redeemError && (
          <div style={{ background: 'rgba(255,107,74,0.08)', border: '1px solid rgba(255,107,74,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#FF6B4A' }}>
            {redeemError}
          </div>
        )}

        {/* Inner tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
          {[
            { key: 'available', label: 'คูปองที่แลกได้' },
            { key: 'claimed', label: `คูปองของฉัน${myCoupons.length > 0 ? ` (${myCoupons.length})` : ''}` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setInnerTab(t.key as 'available' | 'claimed')}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: innerTab === t.key ? '#fff' : 'transparent',
                color: innerTab === t.key ? '#FF6B4A' : '#b5a99d',
                boxShadow: innerTab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a7a72', fontSize: 14 }}>กำลังโหลด...</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: 16, opacity: 0.3 }}><IconTicket color="#FF6B4A" /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#c5b3a8', marginBottom: 8 }}>
              {innerTab === 'available' ? 'ยังไม่มีคูปองให้แลกในขณะนี้' : 'ยังไม่มีคูปองของฉัน'}
            </div>
            <div style={{ fontSize: 13, color: '#8a7a72', lineHeight: 1.6 }}>
              {innerTab === 'available' ? 'ติดตามโปรโมชันจากทางร้านได้เร็วๆ นี้' : 'แลกคูปองจากแท็บ "คูปองที่แลกได้"'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map((c, i) => (
              <div key={c.id} style={{ animation: `mem-fadeInUp 0.35s ease ${i * 0.07}s both` }}>
                <CouponCard c={c} isMine={innerTab === 'claimed'} member={member} redeeming={redeeming} onRedeem={handleRedeem} onShowQr={setShowQrCoupon} />
              </div>
            ))}
          </div>
        )}

        {!loading && innerTab === 'claimed' && myCoupons.some(c => new Date(c.expires_at).getTime() > Date.now()) && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,107,74,0.08)', borderRadius: 8, fontSize: 12, color: '#b5a99d', lineHeight: 1.6 }}>
            💡 กดแสดง QR ให้พนักงานสแกน เพื่อใช้คูปองส่วนลด
          </div>
        )}
      </div>
      {showQrCoupon && (
        <CouponQrModal
          couponId={showQrCoupon.id}
          couponTitle={showQrCoupon.title}
          discountType={showQrCoupon.discount_type}
          discountValue={showQrCoupon.discount_value}
          onClose={() => setShowQrCoupon(null)}
          onUsed={() => { setShowQrCoupon(null); silentRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Tab: หน้าโปรไฟล์ ─────────────────────────────────────────────────────────

function TabProfile({ member, onLogout }: { member: Member; onLogout: () => void }) {
  const initial = member.name ? member.name[0].toUpperCase() : 'M';
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (s: string) => setOpenSection(prev => prev === s ? null : s);

  const genderLabel = member.gender === 'male' ? '👨 ชาย' : member.gender === 'female' ? '👩 หญิง' : member.gender === 'other' ? '🧑 อื่นๆ' : '-';

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 13, color: '#b5a99d', minWidth: 90 }}>{label}</span>
        <span style={{ fontSize: 13, color: '#F5EDE8', fontWeight: 500, textAlign: 'right', maxWidth: 220, lineHeight: 1.5 }}>{value || '-'}</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80, animation: 'mem-fadeInUp 0.35s ease' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#c44a1a,#FF6B4A)',
        padding: '40px 20px 60px',
        textAlign: 'center',
      }}>
        {member.linePictureUrl ? (
          <img src={member.linePictureUrl} alt="profile" style={{
            width: 80, height: 80, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.5)',
            objectFit: 'cover', margin: '0 auto 12px', display: 'block',
          }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            border: '3px solid rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: 32, fontWeight: 800, color: '#fff',
          }}>
            {initial}
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{member.name}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{member.phone || 'ยังไม่ได้ระบุเบอร์'}</div>
        <div style={{ marginTop: 8 }}>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 20, padding: '3px 14px',
            fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#fff',
          }}>
            {getTierLabel(member.tier)}
          </span>
        </div>
      </div>

      {/* Stats card */}
      <div style={{
        margin: '-28px 16px 0',
        background: '#3D352E', borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FF6B4A' }}>{member.points}</div>
            <div style={{ fontSize: 11, color: '#b5a99d', marginTop: 2 }}>คะแนน</div>
          </div>
          <div style={{ flex: 1, padding: '16px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FF6B4A' }}>{member.totalVisits}</div>
            <div style={{ fontSize: 11, color: '#b5a99d', marginTop: 2 }}>ครั้ง</div>
          </div>
        </div>
      </div>

      {/* Accordion sections */}
      <div style={{ margin: '16px 16px 0' }}>

        {/* ข้อมูลส่วนตัว */}
        <div style={{ background: '#3D352E', borderRadius: 14, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <button
            onClick={() => toggle('personal')}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '15px 18px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14, color: '#F5EDE8', fontWeight: 600 }}>👤 ข้อมูลส่วนตัว</span>
            <span style={{ color: '#b5a99d', fontSize: 12, transition: 'transform 0.2s', transform: openSection === 'personal' ? 'rotate(90deg)' : 'none' }}>▶</span>
          </button>
          {openSection === 'personal' && (
            <div style={{ padding: '0 18px 14px', animation: 'mem-fadeInUp 0.2s ease' }}>
              <InfoRow label="ชื่อ" value={member.name} />
              <InfoRow label="เบอร์โทร" value={member.phone || '-'} />
              <InfoRow label="เพศ" value={genderLabel} />
              <InfoRow label="สมาชิกตั้งแต่" value={formatDate(member.createdAt)} />
            </div>
          )}
        </div>

        {/* ที่อยู่ */}
        <div style={{ background: '#3D352E', borderRadius: 14, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <button
            onClick={() => toggle('address')}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '15px 18px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14, color: '#F5EDE8', fontWeight: 600 }}>🏠 ที่อยู่</span>
            <span style={{ color: '#b5a99d', fontSize: 12, transition: 'transform 0.2s', transform: openSection === 'address' ? 'rotate(90deg)' : 'none' }}>▶</span>
          </button>
          {openSection === 'address' && (
            <div style={{ padding: '0 18px 14px', animation: 'mem-fadeInUp 0.2s ease' }}>
              {member.address ? (
                <div style={{ fontSize: 13, color: '#F5EDE8', lineHeight: 1.7, paddingTop: 4 }}>
                  <span style={{ color: '#FF6B4A', marginRight: 6 }}>📍</span>{member.address}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#b5a99d', paddingTop: 4 }}>ยังไม่ได้ระบุที่อยู่</div>
              )}
            </div>
          )}
        </div>

        {/* บัตรสมาชิก */}
        <div style={{ background: '#3D352E', borderRadius: 14, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <button
            onClick={() => toggle('membership')}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '15px 18px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14, color: '#F5EDE8', fontWeight: 600 }}>🎫 ข้อมูลบัตรสมาชิก</span>
            <span style={{ color: '#b5a99d', fontSize: 12, transition: 'transform 0.2s', transform: openSection === 'membership' ? 'rotate(90deg)' : 'none' }}>▶</span>
          </button>
          {openSection === 'membership' && (
            <div style={{ padding: '0 18px 14px', animation: 'mem-fadeInUp 0.2s ease' }}>
              <InfoRow label="เลขบัตร" value={member.memberNumber || '-'} />
              <InfoRow label="ระดับ" value={getTierLabel(member.tier)} />
              <InfoRow label="หมดอายุ" value={member.validTill ? formatDate(member.validTill) : '-'} />
            </div>
          )}
        </div>

      </div>

      {/* Logout */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'block', width: '100%',
            background: '#3D352E', color: '#FF6B4A',
            border: '2px solid #FF6B4A', borderRadius: 10,
            padding: '13px 0', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}

// ─── Profile Complete Screen ───────────────────────────────────────────────────

interface GeoProvince { code: number; name_th: string; name_en: string; }
interface GeoDistrict { code: number; name_th: string; province_code: number; }
interface GeoSubdistrict { code: number; name_th: string; district_code: number; postal_code: number; }

const GEO_BASE = '/api/geo';

function ProfileCompleteScreen({ member, onComplete }: { member: Member; onComplete: (m: Member) => void }) {
  const [phone, setPhone] = useState(member.phone || '');
  const [houseStreet, setHouseStreet] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(member.gender || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Geo state
  const [provinces, setProvinces] = useState<GeoProvince[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [subdistricts, setSubdistricts] = useState<GeoSubdistrict[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<GeoProvince | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<GeoDistrict | null>(null);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<GeoSubdistrict | null>(null);
  const [postalCode, setPostalCode] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  // Load all provinces on mount
  useEffect(() => {
    fetch(`${GEO_BASE}?type=provinces`)
      .then(r => r.json())
      .then(d => setProvinces(d.data || []))
      .catch(() => {});
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (!selectedProvince) { setDistricts([]); setSelectedDistrict(null); setSubdistricts([]); setSelectedSubdistrict(null); setPostalCode(''); return; }
    setGeoLoading(true);
    fetch(`${GEO_BASE}?type=districts&province_code=${selectedProvince.code}`)
      .then(r => r.json())
      .then(d => { setDistricts(d.data || []); setSelectedDistrict(null); setSubdistricts([]); setSelectedSubdistrict(null); setPostalCode(''); })
      .catch(() => {})
      .finally(() => setGeoLoading(false));
  }, [selectedProvince]);

  // Load subdistricts when district changes
  useEffect(() => {
    if (!selectedDistrict) { setSubdistricts([]); setSelectedSubdistrict(null); setPostalCode(''); return; }
    setGeoLoading(true);
    fetch(`${GEO_BASE}?type=subdistricts&district_code=${selectedDistrict.code}`)
      .then(r => r.json())
      .then(d => { setSubdistricts(d.data || []); setSelectedSubdistrict(null); setPostalCode(''); })
      .catch(() => {})
      .finally(() => setGeoLoading(false));
  }, [selectedDistrict]);

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '2px solid rgba(255,255,255,0.15)', borderRadius: 10,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    color: '#F5EDE8', background: '#2D2520',
    appearance: 'none', WebkitAppearance: 'none',
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: '2px solid rgba(255,255,255,0.15)', borderRadius: 10,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    color: '#F5EDE8', background: '#2D2520',
  };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#FF6B4A'; };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; };

  function buildAddress() {
    const parts = [houseStreet.trim()];
    if (selectedSubdistrict) parts.push(`ต.${selectedSubdistrict.name_th}`);
    if (selectedDistrict) parts.push(`อ.${selectedDistrict.name_th}`);
    if (selectedProvince) parts.push(`จ.${selectedProvince.name_th}`);
    if (postalCode) parts.push(postalCode);
    return parts.filter(Boolean).join(' ');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProvince || !selectedDistrict || !selectedSubdistrict || !gender) {
      setError('กรุณาเลือกจังหวัด อำเภอ และตำบล และระบุเพศ');
      return;
    }
    const address = buildAddress();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/members/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() || undefined, address, gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      onComplete(data.member);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  const GENDERS = [
    { value: 'male', label: 'ชาย', emoji: '👨' },
    { value: 'female', label: 'หญิง', emoji: '👩' },
    { value: 'other', label: 'อื่นๆ', emoji: '🧑' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #2D2520 0%, #3D352E 60%, #2D2520 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'mem-fadeInUp 0.4s ease' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>👤</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#FF6B4A', letterSpacing: 1 }}>ยินดีต้อนรับ!</div>
        <div style={{ fontSize: 14, color: '#b5a99d', marginTop: 6 }}>กรอกข้อมูลเพิ่มเติมเพื่อรับสิทธิพิเศษ</div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#3D352E', borderRadius: 20, padding: '28px 24px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'mem-fadeInUp 0.45s ease 0.1s both',
        }}
      >
        {/* Phone */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#c5b3a8', marginBottom: 6 }}>
            📱 เบอร์โทรศัพท์
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="0812345678"
            style={{ ...inputStyle, fontSize: 15 }}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>

        {/* Address header */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#c5b3a8', marginBottom: 10 }}>🏠 ที่อยู่ *</div>

        {/* House / Street */}
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            value={houseStreet}
            onChange={e => setHouseStreet(e.target.value)}
            placeholder="บ้านเลขที่ / ถนน (ไม่บังคับ)"
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>

        {/* Province */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <select
            value={selectedProvince?.code ?? ''}
            onChange={e => {
              const p = provinces.find(x => x.code === Number(e.target.value)) ?? null;
              setSelectedProvince(p);
            }}
            style={selectStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          >
            <option value="">-- เลือกจังหวัด --</option>
            {provinces.map(p => (
              <option key={p.code} value={p.code}>{p.name_th}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#b5a99d', pointerEvents: 'none', fontSize: 12 }}>▼</span>
        </div>

        {/* District */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <select
            value={selectedDistrict?.code ?? ''}
            onChange={e => {
              const d = districts.find(x => x.code === Number(e.target.value)) ?? null;
              setSelectedDistrict(d);
            }}
            disabled={!selectedProvince || geoLoading}
            style={{ ...selectStyle, opacity: !selectedProvince ? 0.45 : 1 }}
            onFocus={focusBorder}
            onBlur={blurBorder}
          >
            <option value="">-- เลือกอำเภอ/เขต --</option>
            {districts.map(d => (
              <option key={d.code} value={d.code}>{d.name_th}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#b5a99d', pointerEvents: 'none', fontSize: 12 }}>▼</span>
        </div>

        {/* Subdistrict */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <select
            value={selectedSubdistrict?.code ?? ''}
            onChange={e => {
              const s = subdistricts.find(x => x.code === Number(e.target.value)) ?? null;
              setSelectedSubdistrict(s);
              setPostalCode(s ? String(s.postal_code) : '');
            }}
            disabled={!selectedDistrict || geoLoading}
            style={{ ...selectStyle, opacity: !selectedDistrict ? 0.45 : 1 }}
            onFocus={focusBorder}
            onBlur={blurBorder}
          >
            <option value="">-- เลือกตำบล/แขวง --</option>
            {subdistricts.map(s => (
              <option key={s.code} value={s.code}>{s.name_th}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#b5a99d', pointerEvents: 'none', fontSize: 12 }}>▼</span>
        </div>

        {/* Postal code (auto-filled) */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={postalCode}
            onChange={e => setPostalCode(e.target.value)}
            placeholder="รหัสไปรษณีย์ (กรอกอัตโนมัติ)"
            style={{ ...inputStyle, color: postalCode ? '#FF6B4A' : '#b5a99d' }}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        </div>

        {/* Address preview */}
        {buildAddress() && (
          <div style={{
            background: 'rgba(255,107,74,0.07)', border: '1px solid rgba(255,107,74,0.2)',
            borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#c5b3a8',
            marginBottom: 16, lineHeight: 1.6,
          }}>
            <span style={{ color: '#FF6B4A', fontWeight: 600, marginRight: 4 }}>📍</span>
            {buildAddress()}
          </div>
        )}

        {/* Gender */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#c5b3a8', marginBottom: 10 }}>
            🧬 เพศ *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {GENDERS.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGender(g.value as 'male' | 'female' | 'other')}
                style={{
                  padding: '12px 6px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${gender === g.value ? '#FF6B4A' : 'rgba(255,255,255,0.12)'}`,
                  background: gender === g.value ? 'rgba(255,107,74,0.15)' : '#2D2520',
                  color: gender === g.value ? '#FF6B4A' : '#b5a99d',
                  fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 20 }}>{g.emoji}</span>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,107,74,0.08)', border: '1px solid rgba(255,107,74,0.3)',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FF6B4A', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0',
            background: loading ? 'rgba(255,107,74,0.4)' : '#FF6B4A',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(255,107,74,0.4)', transition: 'background 0.2s',
          }}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล →'}
        </button>
      </form>
    </div>
  );
}

// ─── Login / Register ─────────────────────────────────────────────────────────

function LoginScreen({ onLogin: _onLogin }: { onLogin: (member: Member) => void }) {
  const [error, setError] = useState('');
  const [lineLoading, setLineLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'line_denied') setError('ยกเลิกการเข้าสู่ระบบด้วย LINE');
    else if (err) setError('เกิดข้อผิดพลาดจาก LINE กรุณาลองใหม่');
  }, []);

  function handleLineLogin() {
    const clientId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    if (!clientId) { setError('LINE Login ยังไม่ได้ตั้งค่า'); return; }
    setLineLoading(true);
    const redirectUri = `${window.location.origin}/api/auth/line/callback`;
    const state = Math.random().toString(36).substring(2, 10);
    const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile`;
    window.location.href = url;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #2D2520 0%, #3D352E 60%, #2D2520 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'mem-fadeInUp 0.4s ease' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: '#FF6B4A', letterSpacing: 2 }}>Tuatak</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 3 }}>LOYALTY CARD</div>
      </div>

      <div style={{
        background: '#3D352E', borderRadius: 20, padding: '28px 24px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'mem-fadeInUp 0.45s ease 0.1s both',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
            สมัครสมาชิก / เข้าสู่ระบบ
          </h2>
          <p style={{ fontSize: 13, color: '#b5a99d' }}>
            เข้าสู่ระบบด้วย LINE เพื่อสะสมแต้มและรับสิทธิพิเศษ
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,107,74,0.08)', border: '1px solid rgba(255,107,74,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FF6B4A', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLineLogin}
          disabled={lineLoading}
          style={{
            width: '100%', padding: '14px 0',
            background: lineLoading ? 'rgba(6,199,85,0.6)' : '#06C755', color: '#fff',
            border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: lineLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 4px 16px rgba(6,199,85,0.4)',
            transition: 'background 0.2s',
          }}
        >
          {lineLoading ? (
            <>
              <div style={{ width: 22, height: 22, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'mem-spin 0.75s linear infinite', flexShrink: 0 }} />
              กำลังเชื่อมต่อ LINE...
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="8" fill="#fff" fillOpacity="0.2" />
                <path d="M18 7C11.925 7 7 11.477 7 17.012c0 4.97 4.41 9.129 10.376 9.914.404.087.953.267 1.092.614.125.314.082.806.04 1.124l-.177 1.062c-.054.314-.25 1.23 1.077.671 1.327-.558 7.163-4.22 9.773-7.227C30.822 21.5 31 19.32 31 17.012 31 11.477 24.075 7 18 7z" fill="white" />
                <path d="M15.2 19.8h-2.5v-5H14v3.8h1.2v1.2zm1.6 0h-1.2v-5h1.2v5zm4.8 0h-1.2l-2-3.1v3.1h-1.2v-5h1.2l2 3.1v-3.1h1.2v5zm3.8-3.8h-2v.8h2v1.2h-2v.8h2v1.2h-3.2v-5h3.2v1z" fill="#06C755" />
              </svg>
              เข้าสู่ระบบด้วย LINE
            </>
          )}
        </button>

        <p style={{ fontSize: 12, color: '#8a7a72', textAlign: 'center', marginTop: 16 }}>
          หากยังไม่มีบัญชี ระบบจะสร้างให้อัตโนมัติ
        </p>
      </div>
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

type Tab = 'home' | 'card' | 'rewards' | 'profile';

const NAV_ITEMS: { key: Tab; label: string; Icon: React.FC<{ color: string }> }[] = [
  { key: 'home', label: 'หน้าหลัก', Icon: IconHome },
  { key: 'card', label: 'บัตรสมาชิก', Icon: IconCard },
  { key: 'rewards', label: 'รางวัลของฉัน', Icon: IconGift },
  { key: 'profile', label: 'หน้าโปรไฟล์', Icon: IconPerson },
];

function BottomNav({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: '#2D2520', borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.4)',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onTabChange(item.key)}
            className="mem-btn-press"
            style={{
              flex: 1, padding: '8px 4px 10px',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              position: 'relative', transition: 'opacity 0.15s',
            }}
            aria-label={item.label}
          >
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 3, background: '#FF6B4A', borderRadius: 2,
                animation: 'mem-navDot 0.25s ease',
              }} />
            )}
            <item.Icon color={isActive ? '#FF6B4A' : '#8a7a72'} />
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 400,
              color: isActive ? '#FF6B4A' : '#8a7a72',
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [hydrated, setHydrated] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  // Always verify session with server on page load — localStorage is only a cache
  useEffect(() => {
    fetch('/api/members/me')
      .then((r) => {
        if (!r.ok) {
          // Session expired or invalid — clear local cache and show login
          localStorage.removeItem(STORAGE_KEY);
          setHydrated(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.member) {
          setMember(data.member);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.member));
          setHistory(data.history || []);
        }
        setHydrated(true);
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setHydrated(true);
      });
  }, []);

  function handleLogin(m: Member) {
    setMember(m);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    // Fetch full profile (includes memberNumber, validTill, history) after login
    fetch('/api/members/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.member) {
          setMember(data.member);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.member));
          setHistory(data.history || []);
        }
      })
      .catch(() => {});
  }

  async function handleLogout() {
    await fetch('/api/members/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    setMember(null);
    setActiveTab('home');
    setHistory([]);
  }

  function handleRefresh() {
    fetch('/api/members/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.member) {
          setMember(data.member);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.member));
          setHistory(data.history || []);
        }
      })
      .catch(() => {});
  }

  if (!hydrated) return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #2D2520 0%, #3D352E 60%, #2D2520 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      fontFamily: "'Noto Sans Thai', 'Sarabun', sans-serif",
    }}>
      <style>{`@keyframes mem-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 48, height: 48, border: '4px solid rgba(255,107,74,0.2)', borderTopColor: '#FF6B4A', borderRadius: '50%', animation: 'mem-spin 0.8s linear infinite' }} />
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>กำลังตรวจสอบ...</div>
    </div>
  );

  if (!member) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  // Profile not complete — show completion screen
  if (!member.address || !member.gender) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
        <ProfileCompleteScreen
          member={member}
          onComplete={(updated) => {
            setMember(updated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto',
      minHeight: '100vh', background: '#2D2520',
      position: 'relative', fontFamily: "'Noto Sans Thai', 'Sarabun', sans-serif",
      color: '#F5EDE8',
    }}>
      <style>{`
        @keyframes mem-fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mem-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes mem-scaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes mem-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes mem-pulse-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(255,107,74,0.4); }
          50%       { box-shadow: 0 8px 36px rgba(255,107,74,0.75), 0 0 60px rgba(255,107,74,0.18); }
        }
        @keyframes mem-progress {
          from { width: 0%; }
        }
        @keyframes mem-countPop {
          0%   { opacity: 0; transform: scale(0.7) translateY(8px); }
          70%  { transform: scale(1.08) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes mem-navDot {
          from { width: 0; opacity: 0; }
          to   { width: 24px; opacity: 1; }
        }
        @keyframes mem-slideRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes mem-ripple {
          0%   { transform: scale(0.95); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes mem-badgePop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes mem-spin {
          to { transform: rotate(360deg); }
        }
        .mem-btn-press:active { transform: scale(0.96); transition: transform 0.1s; }
        .mem-tab-btn { transition: all 0.2s ease; }
        .mem-tab-btn:hover { transform: translateY(-1px); }
      `}</style>
      {activeTab === 'home' && <TabHome member={member} onRefresh={handleRefresh} onScan={() => setShowScanModal(true)} />}
      {activeTab === 'card' && <TabMemberCard member={member} history={history} onScan={() => setShowScanModal(true)} />}
      {activeTab === 'rewards' && <TabRewards member={member} onPointsUpdate={(pts) => setMember(m => m ? { ...m, points: pts } : m)} />}
      {activeTab === 'profile' && <TabProfile member={member} onLogout={handleLogout} />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {showScanModal && (
        <QrScanModal
          onClose={() => setShowScanModal(false)}
          onSuccess={() => { setShowScanModal(false); handleRefresh(); }}
        />
      )}
    </div>
  );
}
