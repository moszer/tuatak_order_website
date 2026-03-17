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
      if (res.ok) {
        setResult(data);
        setState('success');
      } else {
        setErrMsg(data.error || 'เกิดข้อผิดพลาด');
        setState('error');
      }
    } catch {
      setErrMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
      setState('error');
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
    try { const mod = await import('jsqr'); jsQR = mod.default ?? mod; } catch { setErrMsg('โหลด QR scanner ไม่สำเร็จ'); setState('error'); stopCamera(); return; }
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
      <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1a2332' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>🎟️ สแกนคูปองลูกค้า</span>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Idle */}
          {state === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={startCamera} style={{ padding: '12px 0', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#0a0f1a', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                เปิดกล้องสแกน QR
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 1, background: '#1a2332' }} />
                <span style={{ color: '#334155', fontSize: 12 }}>หรือ</span>
                <div style={{ flex: 1, height: 1, background: '#1a2332' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  placeholder="วาง token จาก QR..."
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #1e293b', background: '#0d1117', color: '#f1f5f9', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => manualInput && submitToken(manualInput)} disabled={!manualInput} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: manualInput ? '#f59e0b' : '#1e293b', color: manualInput ? '#0a0f1a' : '#334155', fontSize: 13, fontWeight: 700, cursor: manualInput ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  ใช้
                </button>
              </div>
            </div>
          )}

          {/* Scanning */}
          {state === 'scanning' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: '100%', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {/* Scan overlay */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '55%', aspectRatio: '1', position: 'relative' }}>
                    {[['0 0 0 auto','0 auto auto 0'],['0 auto auto 0','0 0 0 auto'],['auto 0 0 auto','auto auto 0 0'],['auto auto 0 0','auto 0 0 auto']].map(([inset], i) => (
                      <div key={i} style={{ position: 'absolute', width: 20, height: 20, borderColor: '#f59e0b', borderStyle: 'solid', borderWidth: 0, ...(i===0?{top:0,left:0,borderTopWidth:3,borderLeftWidth:3}:i===1?{top:0,right:0,borderTopWidth:3,borderRightWidth:3}:i===2?{bottom:0,left:0,borderBottomWidth:3,borderLeftWidth:3}:{bottom:0,right:0,borderBottomWidth:3,borderRightWidth:3}) }} />
                    ))}
                    <div style={{ position: 'absolute', left: '12%', right: '12%', height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)', animation: 'cp-scanLine 2s ease-in-out infinite', boxShadow: '0 0 6px rgba(245,158,11,0.8)' }} />
                  </div>
                </div>
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>กำลังสแกน QR คูปอง...</div>
              <button onClick={reset} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
            </div>
          )}

          {/* Processing */}
          {state === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 0' }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'cp-spin 0.8s linear infinite' }} />
              <div style={{ color: '#64748b', fontSize: 14 }}>กำลังตรวจสอบ...</div>
            </div>
          )}

          {/* Success */}
          {state === 'success' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>ใช้คูปองสำเร็จ!</div>
                <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>{result.couponTitle}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b', margin: '8px 0' }}>{discountLabel}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{result.memberName}{result.memberPhone ? ` · ${result.memberPhone}` : ''}</div>
              </div>
              <button onClick={reset} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#0a0f1a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                สแกนอีกครั้ง
              </button>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <div style={{ fontSize: 14, color: '#f87171' }}>{errMsg}</div>
              <button onClick={reset} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#0a0f1a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ลองใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [scanModal, setScanModal] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Form state
  const [form, setForm] = useState({
    code: generateCode(),
    title: '',
    description: '',
    discount_type: 'fixed' as 'percent' | 'fixed',
    discount_value: 50,
    min_order: 0,
    points_cost: 100,
    expires_hours: 168, // 7 days
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
    setFormError('');
    setFormSuccess('');
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

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm(`ลบคูปอง "${coupon.code}" ?`)) return;
    await fetch(`/api/coupons/${coupon.id}`, { method: 'DELETE' });
    await loadCoupons();
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const discountLabel = (c: Coupon) =>
    c.discount_type === 'percent'
      ? `ลด ${c.discount_value}%`
      : `ลด ฿${c.discount_value.toLocaleString()}`;

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .cp-input{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #1e293b;background:#0d1117;color:#f1f5f9;font-size:0.875rem;outline:none;box-sizing:border-box;transition:border-color 0.15s;font-family:inherit}
        .cp-input:focus{border-color:#f59e0b}
        .cp-select{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #1e293b;background:#0d1117;color:#f1f5f9;font-size:0.875rem;outline:none;box-sizing:border-box;cursor:pointer;font-family:inherit}
        .cp-label{display:block;color:#64748b;font-size:0.75rem;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🎟️ จัดการคูปอง</h1>
        <p style={{ color: '#475569', fontSize: '0.82rem', margin: '4px 0 0' }}>สร้างและจัดการคูปองส่วนลดสำหรับลูกค้า</p>
        <button
          onClick={() => setScanModal(true)}
          style={{ marginTop: 12, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#0a0f1a', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zm3 3h3v3h-3zm-3 3h3"/></svg>
          สแกนคูปองลูกค้า
        </button>
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1.5fr)', alignItems: 'start' }}>

        {/* Create Form */}
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', padding: '20px', animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 18px' }}>สร้างคูปองใหม่</h2>

          {formError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#f87171', fontSize: '0.82rem' }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#4ade80', fontSize: '0.82rem' }}>
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Code */}
            <div style={{ marginBottom: '14px' }}>
              <label className="cp-label">รหัสคูปอง</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="cp-input"
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="เช่น TUATAK50"
                  required
                  maxLength={50}
                  style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, code: generateCode() }))}
                  title="สุ่มรหัส"
                  style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #1e293b', background: 'transparent', color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.8rem', fontFamily: 'inherit' }}
                >
                  สุ่ม
                </button>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '14px' }}>
              <label className="cp-label">ชื่อคูปอง</label>
              <input
                className="cp-input"
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="เช่น ลด 50 บาท สำหรับการสั่งครั้งแรก"
                required
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '14px' }}>
              <label className="cp-label">รายละเอียด (ไม่บังคับ)</label>
              <input
                className="cp-input"
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="เช่น ใช้ได้เฉพาะวันธรรมดา"
              />
            </div>

            {/* Discount type + value */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label className="cp-label">ประเภทส่วนลด</label>
                <select
                  className="cp-select"
                  value={form.discount_type}
                  onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))}
                >
                  <option value="fixed">บาท (฿)</option>
                  <option value="percent">เปอร์เซ็นต์ (%)</option>
                </select>
              </div>
              <div>
                <label className="cp-label">มูลค่า {form.discount_type === 'percent' ? '(%)' : '(฿)'}</label>
                <input
                  className="cp-input"
                  type="number"
                  min={1}
                  max={form.discount_type === 'percent' ? 100 : 100000}
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            {/* Points cost */}
            <div style={{ marginBottom: '14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px', padding: '12px' }}>
              <label className="cp-label" style={{ color: '#fbbf24' }}>แต้มที่ต้องใช้แลก ⭐</label>
              <input
                className="cp-input"
                type="number"
                min={0}
                value={form.points_cost}
                onChange={e => setForm(f => ({ ...f, points_cost: Number(e.target.value) }))}
                placeholder="0 = ฟรี ไม่ต้องใช้แต้ม"
              />
              <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '5px' }}>
                สมาชิกต้องมีแต้มอย่างน้อย {form.points_cost} แต้มจึงจะแลกได้
              </div>
            </div>

            {/* Min order + Expiry */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label className="cp-label">ยอดขั้นต่ำ (฿)</label>
                <input
                  className="cp-input"
                  type="number"
                  min={0}
                  value={form.min_order}
                  onChange={e => setForm(f => ({ ...f, min_order: Number(e.target.value) }))}
                  placeholder="0 = ไม่กำหนด"
                />
              </div>
              <div>
                <label className="cp-label">หมดอายุ (ชั่วโมง)</label>
                <input
                  className="cp-input"
                  type="number"
                  min={1}
                  value={form.expires_hours}
                  onChange={e => setForm(f => ({ ...f, expires_hours: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label className="cp-label">ใช้ได้ทั้งหมด (ครั้ง)</label>
                <input
                  className="cp-input"
                  type="number"
                  min={0}
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))}
                  placeholder="0 = ไม่จำกัด"
                />
                <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: 4 }}>รวมทุกสมาชิก (0 = ไม่จำกัด)</div>
              </div>
              <div>
                <label className="cp-label">ต่อสมาชิก (ครั้ง)</label>
                <input
                  className="cp-input"
                  type="number"
                  min={1}
                  value={form.per_member_uses}
                  onChange={e => setForm(f => ({ ...f, per_member_uses: Number(e.target.value) }))}
                  placeholder="1"
                />
                <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: 4 }}>แต่ละคนใช้ได้กี่ครั้ง</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: submitting ? '#334155' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {submitting ? 'กำลังสร้าง...' : '+ สร้างคูปอง'}
            </button>
          </form>
        </div>

        {/* Coupon List */}
        <div style={{ animation: 'fadeUp 0.3s ease 0.1s both' }}>
          <h2 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
            คูปองทั้งหมด ({coupons.length})
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>กำลังโหลด...</div>
          ) : coupons.length === 0 ? (
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#475569' }}>
              ยังไม่มีคูปอง
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isMobile ? 'none' : '600px', overflowY: isMobile ? 'visible' : 'auto' }}>
              {coupons.map(c => {
                const expired = isExpired(c.expires_at);
                const maxed = c.max_uses > 0 && c.used_count >= c.max_uses;
                const statusColor = !c.is_active ? '#475569' : expired ? '#f87171' : maxed ? '#f87171' : '#4ade80';
                const statusLabel = !c.is_active ? 'ปิด' : expired ? 'หมดอายุ' : maxed ? 'หมดสิทธิ์' : 'ใช้งานได้';
                return (
                  <div key={c.id} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '10px', padding: '14px 16px', opacity: (!c.is_active || expired || maxed) ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px' }}>{c.code}</span>
                          <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                            {discountLabel(c)}
                          </span>
                          <span style={{ background: `${statusColor}22`, color: statusColor, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500, marginTop: '4px' }}>{c.title}</div>
                        {c.description && <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>{c.description}</div>}
                        <div style={{ color: '#334155', fontSize: '0.72rem', marginTop: '5px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#fbbf24' }}>⭐ {c.points_cost > 0 ? `${c.points_cost} แต้ม` : 'ฟรี'}</span>
                          {c.min_order > 0 && <span>ขั้นต่ำ ฿{c.min_order.toLocaleString()}</span>}
                          <span>ใช้แล้ว {c.used_count}{c.max_uses > 0 ? `/${c.max_uses}` : ''} ครั้ง</span>
                          {c.per_member_uses > 1 && (
                            <span style={{ color: '#60a5fa', fontSize: '0.72rem' }}>· ต่อคน: {c.per_member_uses}x</span>
                          )}
                          <span>หมดอายุ {new Date(c.expires_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => toggleActive(c)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b', background: 'transparent', color: c.is_active ? '#f59e0b' : '#475569', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {c.is_active ? 'ปิด' : 'เปิด'}
                        </button>
                        <button
                          onClick={() => deleteCoupon(c)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#f87171', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          ลบ
                        </button>
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
