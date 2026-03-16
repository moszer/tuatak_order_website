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
  return { nextTier: 'GOLD', threshold: 5000, prevThreshold: 1000 };
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
        background: 'linear-gradient(135deg,#C53030,#E53E3E)',
        borderRadius: 16,
        padding: '20px 20px 20px 20px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 180,
        boxShadow: '0 4px 20px rgba(197,48,48,0.4)',
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <style>{`@keyframes scanLine{0%{top:12%}50%{top:83%}100%{top:12%}} @keyframes spin2{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#1A202C' }}>สแกน QR Code</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', overflowY: 'auto' }}>

        {/* Success */}
        {scanState === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#38A169', marginBottom: 6 }}>+{pointsEarned} แต้ม!</div>
            <div style={{ color: '#718096', marginBottom: 32 }}>สะสมแต้มสำเร็จ</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={reset} style={{ padding: '11px 22px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: '#718096', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>สแกนอีกครั้ง</button>
              <button onClick={() => { onSuccess(pointsEarned); handleClose(); }} style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#C53030,#E53E3E)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>ตกลง</button>
            </div>
          </div>
        )}

        {/* Error */}
        {scanState === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#E53E3E', marginBottom: 8 }}>ไม่สำเร็จ</div>
            <div style={{ color: '#718096', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>{message}</div>
            <button onClick={reset} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#C53030,#E53E3E)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>ลองใหม่</button>
          </div>
        )}

        {/* Processing */}
        {scanState === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #FED7D7', borderTopColor: '#E53E3E', borderRadius: '50%', animation: 'spin2 0.8s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ color: '#718096' }}>กำลังประมวลผล...</div>
          </div>
        )}

        {/* Idle */}
        {scanState === 'idle' && (
          <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📷</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1A202C', marginBottom: 8 }}>พร้อมสแกน QR Code</div>
            <div style={{ color: '#718096', fontSize: 13, marginBottom: 28 }}>กดปุ่มเปิดกล้อง หรืออัปโหลดรูป QR จาก Gallery</div>
            <button onClick={startCamera} style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#C53030,#E53E3E)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 16px rgba(197,48,48,0.35)' }}>
              📷 เปิดกล้องสแกน
            </button>
            <label style={{ display: 'block', width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', color: '#718096', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
              🖼️ อัปโหลดรูปจาก Gallery
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) scanFromFile(f); e.target.value = ''; }} />
            </label>
          </div>
        )}

        {/* Camera view */}
        <div style={{ width: '100%', maxWidth: 360, display: scanState === 'scanning' ? 'block' : 'none' }}>
          <div style={{ color: '#718096', textAlign: 'center', marginBottom: 10, fontSize: 13 }}>{debugMsg || 'วาง QR Code ให้อยู่ในกรอบ'}</div>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1', width: '100%' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {(['tl','tr','bl','br'] as const).map(pos => (
              <div key={pos} style={{ position: 'absolute', width: 40, height: 40,
                top: pos[0]==='t'?'12%':'auto', bottom: pos[0]==='b'?'12%':'auto',
                left: pos[1]==='l'?'12%':'auto', right: pos[1]==='r'?'12%':'auto',
                borderTop: pos[0]==='t'?'3px solid #E53E3E':'none', borderBottom: pos[0]==='b'?'3px solid #E53E3E':'none',
                borderLeft: pos[1]==='l'?'3px solid #E53E3E':'none', borderRight: pos[1]==='r'?'3px solid #E53E3E':'none',
                borderRadius: pos==='tl'?'6px 0 0 0':pos==='tr'?'0 6px 0 0':pos==='bl'?'0 0 0 6px':'0 0 6px 0',
              }}/>
            ))}
            <div style={{ position: 'absolute', left: '12%', right: '12%', height: 2, background: 'linear-gradient(90deg,transparent,#E53E3E,transparent)', animation: 'scanLine 2s ease-in-out infinite', boxShadow: '0 0 8px rgba(229,62,62,0.8)' }} />
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 20% rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <button onClick={reset} style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: '#718096', fontSize: 14, cursor: 'pointer' }}>ยกเลิก</button>
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

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 20px 12px',
      }}>
        <div>
          <div style={{ fontSize: 13, color: '#718096' }}>ยินดีต้อนรับ</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>{member.name}</div>
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
          style={{
            display: 'block', width: '100%', marginTop: 14,
            background: '#fff', color: '#E53E3E',
            border: '2px solid #E53E3E', borderRadius: 10,
            padding: '12px 0', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', textAlign: 'center',
          }}
        >
          สแกน QR CODE สะสมคะแนน
        </button>

        {/* Points progress */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: 16, marginTop: 16,
          boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: '#1A202C', fontSize: 15 }}>คะแนนสะสม</span>
            <span style={{ fontWeight: 800, color: '#E53E3E', fontSize: 20 }}>
              {pts.toLocaleString()} <span style={{ fontWeight: 400, color: '#718096', fontSize: 13 }}>แต้ม</span>
            </span>
          </div>
          <div style={{ height: 10, background: '#FED7D7', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#C53030,#E53E3E)', borderRadius: 10, transition: 'width 0.4s' }} />
          </div>
          {!isMaxTier ? (
            <div style={{ marginTop: 8, fontSize: 12, color: '#718096' }}>
              สะสมอีก <span style={{ color: '#E53E3E', fontWeight: 700 }}>{remaining.toLocaleString()} แต้ม</span> เพื่อเลื่อนระดับเป็น {tierInfo.nextTier}
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, color: '#E53E3E', fontWeight: 600 }}>
              คุณอยู่ในระดับสูงสุด GOLD แล้ว 🥇
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          <button style={{
            background: '#fff', border: 'none', borderRadius: 14, padding: '16px 12px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: 'pointer',
          }}>
            <IconLocation color="#E53E3E" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>สาขา & การจอง</span>
          </button>
          <button style={{
            background: '#fff', border: 'none', borderRadius: 14, padding: '16px 12px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            cursor: 'pointer',
          }}>
            <IconTruck color="#E53E3E" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>เดลิเวอรี่</span>
          </button>
        </div>
      </div>
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
      color: '#718096',
      bg: '#F7FAFC',
      threshold: '0 แต้ม',
      benefits: ['สะสมคะแนนทุกการสแกน QR', 'รับส่วนลด 5% วันเกิด'],
    },
    {
      tier: 'SILVER',
      key: 'silver',
      color: '#A0AEC0',
      bg: '#EDF2F7',
      threshold: '1,000 แต้ม',
      benefits: ['ทุกสิทธิ์ของ Member', 'รับส่วนลด 8% วันเกิด', 'ฟรีเครื่องดื่ม 1 แก้ว/เดือน'],
    },
    {
      tier: 'GOLD',
      key: 'gold',
      color: '#D4A017',
      bg: '#FFFFF0',
      threshold: '5,000 แต้ม',
      benefits: ['ทุกสิทธิ์ของ Silver', 'รับส่วนลด 10% วันเกิด', 'ฟรีของหวาน/เดือน'],
    },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C', marginBottom: 16 }}>บัตรสมาชิก</h2>
        <MemberCard member={member} />

        <button onClick={onScan} style={{
          display: 'block', width: '100%', marginTop: 14,
          background: '#E53E3E', color: '#fff',
          border: 'none', borderRadius: 10,
          padding: '13px 0', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', textAlign: 'center',
          boxShadow: '0 3px 12px rgba(229,62,62,0.35)',
        }}>
          สแกน QR Code สะสมคะแนน
        </button>

        {/* Inner tab switcher */}
        <div style={{
          display: 'flex', background: '#F3F4F6', borderRadius: 10,
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
                color: innerTab === t.key ? '#E53E3E' : '#718096',
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
            <div style={{ background: 'linear-gradient(135deg,#C53030,#E53E3E)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>คะแนนสะสมของคุณ</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{pts.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 400 }}>แต้ม</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>ระดับปัจจุบัน</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{currentTier.toUpperCase()}</div>
              </div>
            </div>

            {tierCards.map((tc) => (
              <div key={tc.tier} style={{
                background: tc.bg,
                border: `2px solid ${currentTier === tc.key ? tc.color : 'transparent'}`,
                borderRadius: 12, padding: '14px 16px', marginBottom: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: tc.color, letterSpacing: 1 }}>{tc.tier}</span>
                    {currentTier === tc.key && <span style={{ background: tc.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>ระดับของคุณ</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#718096' }}>ตั้งแต่ {tc.threshold}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {tc.benefits.map((b, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#4A5568', marginBottom: 3 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Tier progression */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', marginTop: 4, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C', marginBottom: 12 }}>ระดับความสำเร็จ</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {tierCards.map((tc, idx) => (
                  <div key={tc.tier} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: currentTier === tc.key ? tc.color : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px', border: currentTier === tc.key ? `2px solid ${tc.color}` : '2px solid transparent' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: currentTier === tc.key ? '#fff' : '#A0AEC0' }}>{tc.tier[0]}</span>
                      </div>
                      <div style={{ fontSize: 9, color: '#718096', fontWeight: 600 }}>{tc.tier}</div>
                    </div>
                    {idx < tierCards.length - 1 && <div style={{ width: 32, height: 2, background: '#E2E8F0', margin: '0 4px 14px' }} />}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#718096', marginTop: 10, textAlign: 'center' }}>
                Member (0) → Silver (1,000) → Gold (5,000 แต้ม)
              </div>
            </div>
          </div>
        )}

        {/* History tab */}
        {innerTab === 'history' && (
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#A0AEC0' }}>
                <div style={{ fontSize: 14 }}>ยังไม่มีประวัติการสะสมคะแนน</div>
              </div>
            ) : (
              history.map((h) => (
                <div key={h.id} style={{
                  background: '#fff', borderRadius: 10, padding: '12px 16px',
                  marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>
                      {h.description || (h.type === 'earn' ? 'สะสมคะแนน' : 'แลกคะแนน')}
                    </div>
                    <div style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2 }}>
                      {formatDate(h.createdAt)}
                      {h.tableNumber ? ` • โต๊ะ ${h.tableNumber}` : ''}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 800, fontSize: 16,
                    color: h.type === 'earn' ? '#38A169' : '#E53E3E',
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

function TabRewards() {
  const [innerTab, setInnerTab] = useState<'available' | 'used'>('available');

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: '20px 16px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C', margin: 0 }}>รางวัลของฉัน</h2>
          <button style={{
            background: '#E53E3E', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
            แลกรางวัล
          </button>
        </div>

        {/* Inner tabs */}
        <div style={{
          display: 'flex', background: '#F3F4F6', borderRadius: 10,
          padding: 4,
        }}>
          {[
            { key: 'available', label: 'คูปองที่ใช้ได้' },
            { key: 'used', label: 'ใช้แล้ว หรือหมดอายุ' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setInnerTab(t.key as 'available' | 'used')}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: innerTab === t.key ? '#fff' : 'transparent',
                color: innerTab === t.key ? '#E53E3E' : '#718096',
                boxShadow: innerTab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ marginBottom: 16, opacity: 0.3 }}>
            <IconTicket color="#E53E3E" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#4A5568', marginBottom: 8 }}>
            ยังไม่มีคูปองในขณะนี้
          </div>
          <div style={{ fontSize: 13, color: '#A0AEC0', lineHeight: 1.6 }}>
            สะสมคะแนนจากการใช้บริการ<br />เพื่อรับสิทธิพิเศษและคูปองส่วนลด
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: หน้าโปรไฟล์ ─────────────────────────────────────────────────────────

function TabProfile({ member, onLogout }: { member: Member; onLogout: () => void }) {
  const initial = member.name ? member.name[0].toUpperCase() : 'M';

  const menuItems = [
    { label: 'ข้อมูลส่วนตัว' },
    { label: 'ที่อยู่' },
    { label: 'คำถามที่พบบ่อย' },
    { label: 'ข้อกำหนดและเงื่อนไข' },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Red top area */}
      <div style={{
        background: 'linear-gradient(135deg,#C53030,#E53E3E)',
        padding: '40px 20px 60px',
        textAlign: 'center',
      }}>
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
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{member.name}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{member.phone}</div>
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

      {/* White card overlap */}
      <div style={{
        margin: '-28px 16px 0',
        background: '#fff', borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Points summary */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #F3F4F6',
        }}>
          <div style={{ flex: 1, padding: '16px 0', textAlign: 'center', borderRight: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#E53E3E' }}>{member.points}</div>
            <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>คะแนน</div>
          </div>
          <div style={{ flex: 1, padding: '16px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#E53E3E' }}>{member.totalVisits}</div>
            <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>ครั้ง</div>
          </div>
        </div>

        {/* Menu list */}
        {menuItems.map((item, idx) => (
          <button
            key={item.label}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '16px 20px',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: idx < menuItems.length - 1 ? '1px solid #F3F4F6' : 'none',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14, color: '#2D3748', fontWeight: 500 }}>{item.label}</span>
            <IconChevronRight color="#A0AEC0" />
          </button>
        ))}
      </div>

      {/* Logout button */}
      <div style={{ padding: '24px 16px' }}>
        <button
          onClick={onLogout}
          style={{
            display: 'block', width: '100%',
            background: '#fff', color: '#E53E3E',
            border: '2px solid #E53E3E', borderRadius: 10,
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

// ─── Login / Register ─────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (member: Member) => void }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // LINE setup mode (first-time LINE user needs to enter phone)
  const [lineSetup, setLineSetup] = useState(false);
  const [lineUid, setLineUid] = useState('');
  const [linePic, setLinePic] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('line_setup') === '1') {
      setLineSetup(true);
      setLineUid(params.get('line_uid') || '');
      setLinePic(params.get('line_pic') || '');
      setName(params.get('line_name') || '');
    }
    const err = params.get('error');
    if (err === 'line_denied') setError('ยกเลิกการเข้าสู่ระบบด้วย LINE');
    else if (err) setError('เกิดข้อผิดพลาดจาก LINE กรุณาลองใหม่');
  }, []);

  function handleLineLogin() {
    const clientId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    if (!clientId) {
      setError('LINE Login ยังไม่ได้ตั้งค่า');
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/line/callback`;
    const state = Math.random().toString(36).substring(2, 10);
    const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile`;
    window.location.href = url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const needPhone = !phone.trim();
    const needName = !name.trim();
    if (needPhone || needName) {
      setError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: Record<string, string> = { name: name.trim() };
      if (phone.trim()) body.phone = phone.trim();
      if (lineUid) { body.lineUid = lineUid; body.linePictureUrl = linePic; }

      const res = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      onLogin(data.member);
      // Clean up URL params
      window.history.replaceState({}, '', '/member');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#C53030 0%,#E53E3E 40%,#FFF5F5 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>Tuatak</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, letterSpacing: 3 }}>LOYALTY CARD</div>
      </div>

      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 24px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {lineSetup ? (
          <>
            {/* LINE setup mode — link phone to LINE account */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {linePic && (
                <img
                  src={linePic}
                  alt="LINE profile"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 10 }}
                />
              )}
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A202C', marginBottom: 4 }}>
                ยืนยันตัวตนด้วย LINE
              </h2>
              <p style={{ fontSize: 13, color: '#718096' }}>กรุณากรอกเบอร์โทรศัพท์เพื่อสมัครสมาชิก</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>ชื่อ *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อ - นามสกุล"
                  style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', color: '#2D3748' }}
                  onFocus={(e) => (e.target.style.borderColor = '#E53E3E')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>เบอร์โทรศัพท์ *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                  style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', color: '#2D3748' }}
                  onFocus={(e) => (e.target.style.borderColor = '#E53E3E')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
              {error && (
                <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C53030', marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '13px 0', background: loading ? '#68D391' : '#06C755', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(6,199,85,0.4)', transition: 'background 0.2s' }}
              >
                {loading ? 'กำลังดำเนินการ...' : 'ยืนยันและสมัครสมาชิก'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C', marginBottom: 6, textAlign: 'center' }}>
              สมัครสมาชิก / เข้าสู่ระบบ
            </h2>
            <p style={{ fontSize: 13, color: '#718096', textAlign: 'center', marginBottom: 24 }}>
              กรอกข้อมูลเพื่อสมัครสมาชิกหรือเข้าสู่ระบบ
            </p>

            {/* LINE Login Button */}
            <button
              onClick={handleLineLogin}
              style={{
                width: '100%', padding: '13px 0',
                background: '#06C755', color: '#fff',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 3px 12px rgba(6,199,85,0.35)',
                marginBottom: 16,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="8" fill="#fff" fillOpacity="0.2" />
                <path d="M18 7C11.925 7 7 11.477 7 17.012c0 4.97 4.41 9.129 10.376 9.914.404.087.953.267 1.092.614.125.314.082.806.04 1.124l-.177 1.062c-.054.314-.25 1.23 1.077.671 1.327-.558 7.163-4.22 9.773-7.227C30.822 21.5 31 19.32 31 17.012 31 11.477 24.075 7 18 7z" fill="white" />
                <path d="M15.2 19.8h-2.5v-5H14v3.8h1.2v1.2zm1.6 0h-1.2v-5h1.2v5zm4.8 0h-1.2l-2-3.1v3.1h-1.2v-5h1.2l2 3.1v-3.1h1.2v5zm3.8-3.8h-2v.8h2v1.2h-2v.8h2v1.2h-3.2v-5h3.2v1z" fill="#06C755" />
              </svg>
              เข้าสู่ระบบด้วย LINE
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              <span style={{ fontSize: 12, color: '#A0AEC0' }}>หรือ</span>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                  style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', color: '#2D3748' }}
                  onFocus={(e) => (e.target.style.borderColor = '#E53E3E')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>
                  ชื่อ - นามสกุล *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="กรุณากรอกชื่อ"
                  style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', color: '#2D3748' }}
                  onFocus={(e) => (e.target.style.borderColor = '#E53E3E')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {error && (
                <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#C53030', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '13px 0', background: loading ? '#FC8181' : '#E53E3E', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 3px 12px rgba(229,62,62,0.4)', transition: 'background 0.2s' }}
              >
                {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ / สมัครสมาชิก'}
              </button>
            </form>
          </>
        )}
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
      background: '#fff', borderTop: '1px solid #F3F4F6',
      display: 'flex',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onTabChange(item.key)}
            style={{
              flex: 1, padding: '8px 4px 10px',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              position: 'relative',
            }}
            aria-label={item.label}
          >
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 3, background: '#E53E3E', borderRadius: 2,
              }} />
            )}
            <item.Icon color={isActive ? '#E53E3E' : '#A0AEC0'} />
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 400,
              color: isActive ? '#E53E3E' : '#A0AEC0',
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

  // Load from localStorage or cookie (set by LINE callback) after hydration
  useEffect(() => {
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMember(JSON.parse(stored));
        setHydrated(true);
        return;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    // Try cookie set by LINE callback
    const match = document.cookie.match(/(?:^|;\s*)restaurant_member=([^;]+)/);
    if (match) {
      try {
        const m = JSON.parse(decodeURIComponent(match[1]));
        setMember(m);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
        // Clear the cookie now that we've stored in localStorage
        document.cookie = 'restaurant_member=; Max-Age=0; path=/';
      } catch {
        // ignore
      }
    }
    setHydrated(true);
  }, []);

  // Fetch fresh member data + history from API when member is set
  useEffect(() => {
    if (!member) return;
    const qs = member.phone
      ? `phone=${encodeURIComponent(member.phone)}`
      : `lineUid=${encodeURIComponent(member.lineUid || '')}`;
    fetch(`/api/member?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.member) {
          setMember(data.member);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.member));
          setHistory(data.history || []);
        }
      })
      .catch(() => {/* ignore */});
  }, [member?.phone, member?.lineUid]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogin(m: Member) {
    setMember(m);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setMember(null);
    setActiveTab('home');
    setHistory([]);
  }

  function handleRefresh() {
    if (!member) return;
    const qs = member.phone
      ? `phone=${encodeURIComponent(member.phone)}`
      : `lineUid=${encodeURIComponent((member as any).lineUid || '')}`;
    fetch(`/api/member?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.member) {
          setMember(data.member);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.member));
          setHistory(data.history || []);
        }
      })
      .catch(() => {/* ignore */});
  }

  if (!hydrated) return null;

  if (!member) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto',
      minHeight: '100vh', background: '#F7FAFC',
      position: 'relative', fontFamily: "'Noto Sans Thai', 'Sarabun', sans-serif",
    }}>
      {activeTab === 'home' && <TabHome member={member} onRefresh={handleRefresh} onScan={() => setShowScanModal(true)} />}
      {activeTab === 'card' && <TabMemberCard member={member} history={history} onScan={() => setShowScanModal(true)} />}
      {activeTab === 'rewards' && <TabRewards />}
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
