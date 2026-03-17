'use client';

import { useState, useEffect, useCallback } from 'react';

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
  createdAt: string;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', alignItems: 'start' }}>

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

            <div style={{ marginBottom: '20px' }}>
              <label className="cp-label">ใช้ได้กี่ครั้ง</label>
              <input
                className="cp-input"
                type="number"
                min={0}
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))}
                placeholder="0 = ไม่จำกัด"
              />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
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
                          <span>หมดอายุ {new Date(c.expires_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
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
    </div>
  );
}
