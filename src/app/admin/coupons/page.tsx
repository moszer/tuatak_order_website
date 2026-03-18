'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Coupon {
  id: number;
  code: string;
  title: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number;
  points_cost: number;
  expires_at: string;
  is_active: boolean;
  max_uses: number;
  used_count: number;
  per_member_uses: number;
  createdAt: string;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const EXPIRY_PRESETS = [
  { label: '1 วัน', hours: 24 },
  { label: '3 วัน', hours: 72 },
  { label: '7 วัน', hours: 168 },
  { label: '30 วัน', hours: 720 },
  { label: 'กำหนดเอง', hours: 0 },
];

/* ─── Scan Modal ──────────────────────────────────────── */
function CouponScanModal({ onClose }: { onClose: () => void }) {
  type State = 'idle' | 'scanning' | 'processing' | 'success' | 'error';
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<{ memberName: string; memberPhone: string; couponTitle: string; discountType: string; discountValue: number } | null>(null);
  const [errMsg, setErrMsg] = useState('');
  const [manualInput, setManualInput] = useState('');
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

  const submitToken = useCallback(async (token: string) => {
    processingRef.current = true;
    stopCamera();
    setState('processing');
    try {
      const res = await fetch('/api/coupons/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setResult(data); setState('success'); }
      else { setErrMsg(data.error || 'เกิดข้อผิดพลาด'); setState('error'); }
    } catch {
      setErrMsg('เกิดข้อผิดพลาด กรุณาลองใหม่'); setState('error');
    }
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setErrMsg(''); processingRef.current = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    } catch {
      setErrMsg('ไม่สามารถเปิดกล้องได้'); setState('error'); return;
    }
    streamRef.current = stream;
    setState('scanning');
    await new Promise(r => setTimeout(r, 100));
    const video = videoRef.current;
    if (!video) { stopCamera(); return; }
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play().catch(() => {});
    let jsQR: any;
    try { const mod = await import('jsqr'); jsQR = mod.default ?? mod; }
    catch { setErrMsg('โหลด QR scanner ไม่สำเร็จ'); setState('error'); stopCamera(); return; }
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
      const r = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (r?.data) submitToken(r.data);
    }, 200);
  }, [stopCamera, submitToken]);

  const reset = () => { stopCamera(); processingRef.current = false; setState('idle'); setErrMsg(''); setResult(null); setManualInput(''); };
  const discountLabel = result ? (result.discountType === 'percent' ? `ลด ${result.discountValue}%` : `ลด ฿${result.discountValue.toLocaleString()}`) : '';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <style>{`@keyframes cp-spin{to{transform:rotate(360deg)}} @keyframes cp-scanLine{0%{top:8%}50%{top:88%}100%{top:8%}}`}</style>
      <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #1a2332' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>สแกนคูปองลูกค้า</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>สแกน QR จากแอปสมาชิกเพื่อใช้คูปอง</div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: '#94a3b8', width: 32, height: 32, borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {state === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={startCamera} style={{ padding: '14px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#0a0f1a', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                เปิดกล้องสแกน QR
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 1, background: '#1a2332' }} />
                <span style={{ color: '#334155', fontSize: 12 }}>หรือพิมพ์ token</span>
                <div style={{ flex: 1, height: 1, background: '#1a2332' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && manualInput && submitToken(manualInput)}
                  placeholder="วาง token จาก QR..."
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #1e293b', background: '#0d1117', color: '#f1f5f9', fontSize: 13, outline: 'none', fontFamily: 'monospace', letterSpacing: '0.5px' }}
                />
                <button onClick={() => manualInput && submitToken(manualInput)} disabled={!manualInput}
                  style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: manualInput ? '#f59e0b' : '#1e293b', color: manualInput ? '#0a0f1a' : '#334155', fontSize: 13, fontWeight: 700, cursor: manualInput ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  ใช้
                </button>
              </div>
            </div>
          )}

          {state === 'scanning' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: '100%', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '55%', aspectRatio: '1', position: 'relative' }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ position: 'absolute', width: 20, height: 20, borderColor: '#f59e0b', borderStyle: 'solid', borderWidth: 0, ...(i===0?{top:0,left:0,borderTopWidth:3,borderLeftWidth:3}:i===1?{top:0,right:0,borderTopWidth:3,borderRightWidth:3}:i===2?{bottom:0,left:0,borderBottomWidth:3,borderLeftWidth:3}:{bottom:0,right:0,borderBottomWidth:3,borderRightWidth:3}) }} />
                    ))}
                    <div style={{ position: 'absolute', left: '12%', right: '12%', height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)', animation: 'cp-scanLine 2s ease-in-out infinite', boxShadow: '0 0 6px rgba(245,158,11,0.8)' }} />
                  </div>
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>วาง QR ให้อยู่ในกรอบ...</div>
              <button onClick={reset} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
            </div>
          )}

          {state === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 44, height: 44, border: '3px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'cp-spin 0.8s linear infinite' }} />
              <div style={{ color: '#64748b', fontSize: 14 }}>กำลังตรวจสอบคูปอง...</div>
            </div>
          )}

          {state === 'success' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '2px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginBottom: 6 }}>ใช้คูปองสำเร็จ!</div>
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 20px', marginBottom: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{discountLabel}</div>
                  <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600, marginTop: 4 }}>{result.couponTitle}</div>
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>👤 {result.memberName}{result.memberPhone ? ` · ${result.memberPhone}` : ''}</div>
              </div>
              <button onClick={reset} style={{ padding: '11px 32px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#0a0f1a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                สแกนอีกครั้ง
              </button>
            </div>
          )}

          {state === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <div style={{ fontSize: 14, color: '#f87171', fontWeight: 600 }}>{errMsg}</div>
              <button onClick={reset} style={{ padding: '11px 32px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#0a0f1a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ลองใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Copy-code button ───────────────────────────────── */
function CopyCodeBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <button onClick={copy} title="คัดลอกรหัส"
      style={{ padding: '3px 8px', borderRadius: 5, border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : '#1e293b'}`, background: copied ? 'rgba(52,211,153,0.08)' : 'transparent', color: copied ? '#34d399' : '#475569', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', fontFamily: 'inherit' }}>
      {copied
        ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>คัดลอกแล้ว</>
        : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>คัดลอก</>}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'disabled'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [customExpiry, setCustomExpiry] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [form, setForm] = useState({
    code: generateCode(),
    title: '',
    description: '',
    discount_type: 'fixed' as 'percent' | 'fixed',
    discount_value: 50,
    min_order: 0,
    points_cost: 100,
    expires_hours: 168,
    max_uses: 0,
    per_member_uses: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/coupons?admin=1');
    const data = await res.json();
    setCoupons(data.coupons || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess(`สร้างคูปอง "${data.coupon.code}" สำเร็จ!`);
        setForm(f => ({ ...f, code: generateCode(), title: '', description: '' }));
        await loadCoupons();
      } else {
        setFormError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setFormError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    await fetch(`/api/coupons/${coupon.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !coupon.is_active }),
    });
    await loadCoupons();
  };

  const deleteCoupon = async (id: number) => {
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    await loadCoupons();
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const getCouponStatus = (c: Coupon) => {
    if (!c.is_active) return 'disabled';
    if (isExpired(c.expires_at)) return 'expired';
    if (c.max_uses > 0 && c.used_count >= c.max_uses) return 'maxed';
    return 'active';
  };

  const STATUS_META = {
    active:   { label: 'ใช้งานได้', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    expired:  { label: 'หมดอายุ',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    maxed:    { label: 'หมดสิทธิ์', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    disabled: { label: 'ปิดใช้งาน', color: '#475569', bg: 'rgba(71,85,105,0.15)' },
  };

  const discountLabel = (c: Coupon) =>
    c.discount_type === 'percent' ? `ลด ${c.discount_value}%` : `ลด ฿${c.discount_value.toLocaleString()}`;

  const stats = {
    total:    coupons.length,
    active:   coupons.filter(c => getCouponStatus(c) === 'active').length,
    expired:  coupons.filter(c => getCouponStatus(c) === 'expired' || getCouponStatus(c) === 'maxed').length,
    disabled: coupons.filter(c => getCouponStatus(c) === 'disabled').length,
  };

  const filtered = coupons.filter(c => {
    const st = getCouponStatus(c);
    if (statusFilter === 'active' && st !== 'active') return false;
    if (statusFilter === 'expired' && st !== 'expired' && st !== 'maxed') return false;
    if (statusFilter === 'disabled' && st !== 'disabled') return false;
    if (search) {
      const q = search.toLowerCase();
      return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .cp-input{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #1e293b;background:#0d1117;color:#f1f5f9;font-size:0.875rem;outline:none;box-sizing:border-box;transition:border-color 0.15s;font-family:inherit}
        .cp-input:focus{border-color:#f59e0b}
        .cp-select{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #1e293b;background:#0d1117;color:#f1f5f9;font-size:0.875rem;outline:none;box-sizing:border-box;cursor:pointer;font-family:inherit;appearance:none}
        .cp-label{display:block;color:#64748b;font-size:0.72rem;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
        .cp-preset{padding:6px 12px;border-radius:7px;border:1px solid #1e293b;background:transparent;color:#64748b;font-size:0.78rem;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap}
        .cp-preset.active{background:#1a2c1a;border-color:#4ade80;color:#4ade80;font-weight:600}
        .cp-preset:hover{border-color:#334155;color:#94a3b8}
        .cp-filter-btn{padding:6px 14px;border-radius:7px;border:1px solid transparent;background:transparent;color:#475569;font-size:0.78rem;cursor:pointer;transition:all 0.15s;font-family:inherit;white-space:nowrap}
        .cp-filter-btn.active{background:#1e293b;border-color:#334155;color:#f1f5f9;font-weight:600}
        .cp-filter-btn:hover:not(.active){color:#94a3b8}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>🎟️ จัดการคูปอง</h1>
          <p style={{ color: '#475569', fontSize: '0.78rem', margin: '4px 0 0' }}>สร้างและจัดการคูปองส่วนลดสำหรับสมาชิก</p>
        </div>
        <button
          onClick={() => setScanModal(true)}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#0a0f1a', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zm3 3h3v3h-3zm-3 3h3"/></svg>
          สแกนคูปองลูกค้า
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'ทั้งหมด',   value: stats.total,    color: '#94a3b8' },
          { label: 'ใช้งานได้', value: stats.active,   color: '#4ade80' },
          { label: 'หมดอายุ',   value: stats.expired,  color: '#f87171' },
          { label: 'ปิดใช้งาน', value: stats.disabled, color: '#475569' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 10, padding: '10px 16px', minWidth: 70 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1.6fr)', alignItems: 'start' }}>

        {/* ── Create Form ── */}
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 14, padding: 20, animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            สร้างคูปองใหม่
          </h2>

          {/* Live preview */}
          {form.title && (
            <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.05))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 800, letterSpacing: '1px', fontSize: 14 }}>{form.code || 'CODE'}</span>
                  <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: 12, fontWeight: 700, padding: '1px 8px', borderRadius: 4 }}>
                    {form.discount_type === 'percent' ? `ลด ${form.discount_value}%` : `ลด ฿${form.discount_value.toLocaleString()}`}
                  </span>
                  {form.points_cost > 0 && <span style={{ color: '#fbbf24', fontSize: 12 }}>⭐ {form.points_cost}</span>}
                </div>
                <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.title}</div>
              </div>
              <div style={{ fontSize: 10, color: '#334155', textAlign: 'right', flexShrink: 0 }}>
                <div>ตัวอย่าง</div>
              </div>
            </div>
          )}

          {formError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: '0.82rem' }}>{formError}</div>
          )}
          {formSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#4ade80', fontSize: '0.82rem' }}>{formSuccess}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Code */}
            <div>
              <label className="cp-label">รหัสคูปอง</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="cp-input"
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="เช่น TUATAK50"
                  required maxLength={50}
                  style={{ textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, fontFamily: 'monospace' }}
                />
                <button type="button" onClick={() => setForm(f => ({ ...f, code: generateCode() }))}
                  title="สุ่มรหัสใหม่"
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  สุ่ม
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="cp-label">ชื่อคูปอง</label>
              <input
                className="cp-input"
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="เช่น ลด 50 บาท สำหรับสมาชิกใหม่"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="cp-label">รายละเอียด <span style={{ color: '#334155', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(ไม่บังคับ)</span></label>
              <input
                className="cp-input"
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="เช่น ใช้ได้เฉพาะวันธรรมดา"
              />
            </div>

            {/* Discount */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a2332', borderRadius: 10, padding: 12 }}>
              <div className="cp-label" style={{ marginBottom: 10 }}>ส่วนลด</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="cp-label">ประเภท</label>
                  <div style={{ position: 'relative' }}>
                    <select className="cp-select" value={form.discount_type}
                      onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}>
                      <option value="fixed">บาท (฿)</option>
                      <option value="percent">เปอร์เซ็นต์ (%)</option>
                    </select>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div>
                  <label className="cp-label">มูลค่า {form.discount_type === 'percent' ? '(%)' : '(฿)'}</label>
                  <input className="cp-input" type="number" min={1}
                    max={form.discount_type === 'percent' ? 100 : 100000}
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                    required />
                </div>
              </div>
            </div>

            {/* Points cost */}
            <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, padding: 12 }}>
              <label className="cp-label" style={{ color: '#fbbf24' }}>⭐ แต้มที่ต้องใช้แลก</label>
              <input className="cp-input" type="number" min={0}
                value={form.points_cost}
                onChange={e => setForm(f => ({ ...f, points_cost: Number(e.target.value) }))}
                placeholder="0 = ฟรี ไม่ต้องใช้แต้ม"
              />
              <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 5 }}>
                {form.points_cost === 0 ? 'สมาชิกทุกคนแลกได้ฟรี' : `ต้องมีอย่างน้อย ${form.points_cost} แต้ม`}
              </div>
            </div>

            {/* Expiry presets */}
            <div>
              <label className="cp-label">วันหมดอายุ</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: customExpiry ? 8 : 0 }}>
                {EXPIRY_PRESETS.map(p => {
                  const isActive = p.hours === 0 ? customExpiry : (!customExpiry && form.expires_hours === p.hours);
                  return (
                    <button key={p.label} type="button"
                      className={`cp-preset${isActive ? ' active' : ''}`}
                      onClick={() => {
                        if (p.hours === 0) { setCustomExpiry(true); }
                        else { setCustomExpiry(false); setForm(f => ({ ...f, expires_hours: p.hours })); }
                      }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {customExpiry && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <input className="cp-input" type="number" min={1} value={form.expires_hours}
                    onChange={e => setForm(f => ({ ...f, expires_hours: Number(e.target.value) }))}
                    style={{ maxWidth: 120 }} />
                  <span style={{ color: '#64748b', fontSize: 13 }}>ชั่วโมง</span>
                </div>
              )}
              {!customExpiry && (
                <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>
                  หมดอายุ: {new Date(Date.now() + form.expires_hours * 3600000).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              )}
            </div>

            {/* Min order + Uses */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label className="cp-label">ยอดขั้นต่ำ</label>
                <input className="cp-input" type="number" min={0}
                  value={form.min_order}
                  onChange={e => setForm(f => ({ ...f, min_order: Number(e.target.value) }))}
                  placeholder="฿ 0" />
                <div style={{ color: '#334155', fontSize: '0.68rem', marginTop: 3 }}>0 = ไม่กำหนด</div>
              </div>
              <div>
                <label className="cp-label">ทั้งหมด</label>
                <input className="cp-input" type="number" min={0}
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))}
                  placeholder="0" />
                <div style={{ color: '#334155', fontSize: '0.68rem', marginTop: 3 }}>0 = ไม่จำกัด</div>
              </div>
              <div>
                <label className="cp-label">ต่อคน</label>
                <input className="cp-input" type="number" min={1}
                  value={form.per_member_uses}
                  onChange={e => setForm(f => ({ ...f, per_member_uses: Number(e.target.value) }))}
                  placeholder="1" />
                <div style={{ color: '#334155', fontSize: '0.68rem', marginTop: 3 }}>ครั้ง/คน</div>
              </div>
            </div>

            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: submitting ? '#1e293b' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: submitting ? '#475569' : '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s', marginTop: 4 }}>
              {submitting
                ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'cp-spin 0.8s linear infinite' }} />กำลังสร้าง...</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>สร้างคูปอง</>}
            </button>
          </form>
        </div>

        {/* ── Coupon List ── */}
        <div style={{ animation: 'fadeUp 0.3s ease 0.1s both' }}>

          {/* Search + filter */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} >
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาคูปอง..."
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid #1e293b', background: '#0d1117', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {([
                { key: 'all',      label: `ทั้งหมด (${stats.total})` },
                { key: 'active',   label: `ใช้งานได้ (${stats.active})` },
                { key: 'expired',  label: `หมดอายุ (${stats.expired})` },
                { key: 'disabled', label: `ปิด (${stats.disabled})` },
              ] as const).map(f => (
                <button key={f.key} className={`cp-filter-btn${statusFilter === f.key ? ' active' : ''}`}
                  onClick={() => setStatusFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, padding: 48, textAlign: 'center', color: '#475569' }}>
              {search ? `ไม่พบคูปอง "${search}"` : 'ยังไม่มีคูปอง'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: isMobile ? 'none' : '65vh', overflowY: isMobile ? 'visible' : 'auto', paddingRight: isMobile ? 0 : 2 }}>
              {filtered.map(c => {
                const st = getCouponStatus(c);
                const { label: stLabel, color: stColor, bg: stBg } = STATUS_META[st];
                const usePct = c.max_uses > 0 ? Math.min((c.used_count / c.max_uses) * 100, 100) : 0;
                const isConfirmDelete = confirmDeleteId === c.id;

                return (
                  <div key={c.id} style={{ background: '#0a0f1a', border: `1px solid ${isConfirmDelete ? 'rgba(239,68,68,0.35)' : '#1a2332'}`, borderRadius: 12, padding: '14px 16px', opacity: st === 'disabled' || st === 'expired' ? 0.7 : 1, transition: 'border-color 0.2s' }}>

                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Code + discount + status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
                          <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '1.5px', fontFamily: 'monospace' }}>{c.code}</span>
                          <CopyCodeBtn code={c.code} />
                          <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 5 }}>
                            {discountLabel(c)}
                          </span>
                          <span style={{ background: stBg, color: stColor, fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 5 }}>
                            {stLabel}
                          </span>
                        </div>
                        {/* Title */}
                        <div style={{ color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 600, marginBottom: c.description ? 2 : 0 }}>{c.title}</div>
                        {c.description && <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 4 }}>{c.description}</div>}

                        {/* Meta row */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                          <span style={{ color: '#fbbf24', fontSize: '0.72rem' }}>⭐ {c.points_cost > 0 ? `${c.points_cost} แต้ม` : 'ฟรี'}</span>
                          {c.min_order > 0 && <span style={{ color: '#475569', fontSize: '0.72rem' }}>ขั้นต่ำ ฿{c.min_order.toLocaleString()}</span>}
                          {c.per_member_uses > 1 && <span style={{ color: '#60a5fa', fontSize: '0.72rem' }}>ใช้ได้ {c.per_member_uses}×/คน</span>}
                          <span style={{ color: '#334155', fontSize: '0.72rem' }}>หมดอายุ {new Date(c.expires_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>

                        {/* Usage progress */}
                        <div style={{ marginTop: 8 }}>
                          {c.max_uses > 0 ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ color: '#334155', fontSize: '0.68rem' }}>ใช้ไปแล้ว</span>
                                <span style={{ color: usePct >= 100 ? '#f87171' : '#64748b', fontSize: '0.68rem', fontWeight: 600 }}>{c.used_count}/{c.max_uses}</span>
                              </div>
                              <div style={{ height: 4, borderRadius: 2, background: '#1a2332', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${usePct}%`, borderRadius: 2, background: usePct >= 100 ? '#f87171' : usePct >= 75 ? '#f59e0b' : '#4ade80', transition: 'width 0.4s' }} />
                              </div>
                            </>
                          ) : (
                            <span style={{ color: '#334155', fontSize: '0.68rem' }}>ใช้แล้ว {c.used_count} ครั้ง · ไม่จำกัด</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        {/* Toggle */}
                        <button onClick={() => toggleActive(c)}
                          style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid', borderColor: c.is_active ? 'rgba(245,158,11,0.35)' : '#1e293b', background: c.is_active ? 'rgba(245,158,11,0.08)' : 'transparent', color: c.is_active ? '#f59e0b' : '#475569', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.is_active ? '#f59e0b' : '#334155' }} />
                          {c.is_active ? 'เปิด' : 'ปิด'}
                        </button>

                        {/* Delete — two-step */}
                        {isConfirmDelete ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => deleteCoupon(c.id)}
                              style={{ flex: 1, padding: '6px 8px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              ยืนยัน
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              style={{ flex: 1, padding: '6px 8px', borderRadius: 7, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(c.id)}
                            style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#f87171', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {scanModal && <CouponScanModal onClose={() => setScanModal(false)} />}
    </div>
  );
}
