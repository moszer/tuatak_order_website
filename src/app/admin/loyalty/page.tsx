'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

interface QRCodeItem {
  id: number;
  code: string;
  points_value: number;
  label: string | null;
  expires_at: string;
  is_active: boolean;
  max_uses: number;
  used_count: number;
  createdAt: string;
}

interface Member {
  id: number;
  phone: string;
  name: string;
  email: string | null;
  points: number;
  tier: 'bronze' | 'silver' | 'gold';
  createdAt: string;
}

const TIER_COLORS = { bronze: '#cd7f32', silver: '#94a3b8', gold: '#fbbf24' };
const TIER_EMOJI = { bronze: '🥉', silver: '🥈', gold: '🥇' };

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export default function AdminLoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'qr' | 'members'>('qr');
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingQr, setLoadingQr] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Generate form
  const [genLabel, setGenLabel] = useState('');
  const [genPoints, setGenPoints] = useState(10);
  const [genHours, setGenHours] = useState(24);
  const [genMaxUses, setGenMaxUses] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Preview QR modal
  const [previewQr, setPreviewQr] = useState<QRCodeItem | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState('');

  const loadQrCodes = useCallback(async () => {
    setLoadingQr(true);
    const res = await fetch('/api/loyalty/qr');
    const data = await res.json();
    setQrCodes(data.qrCodes || []);
    setLoadingQr(false);
  }, []);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    const res = await fetch('/api/members');
    const data = await res.json();
    setMembers(data.members || []);
    setLoadingMembers(false);
  }, []);

  useEffect(() => { loadQrCodes(); }, [loadQrCodes]);
  useEffect(() => { if (activeTab === 'members') loadMembers(); }, [activeTab, loadMembers]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/loyalty/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points_value: genPoints, label: genLabel || undefined, expires_hours: genHours, max_uses: genMaxUses }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadQrCodes();
        setGenLabel('');
        // Auto-open preview
        openPreview(data.qrCode);
      } else {
        setGenError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setGenError('เกิดข้อผิดพลาด');
    } finally {
      setGenerating(false);
    }
  };

  const toggleActive = async (qr: QRCodeItem) => {
    await fetch(`/api/loyalty/qr/${qr.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !qr.is_active }),
    });
    await loadQrCodes();
  };

  const deleteQr = async (qr: QRCodeItem) => {
    if (!confirm(`ลบ QR Code "${qr.label || qr.code.slice(0, 8)}" ?`)) return;
    await fetch(`/api/loyalty/qr/${qr.id}`, { method: 'DELETE' });
    await loadQrCodes();
  };

  const openPreview = async (qr: QRCodeItem) => {
    setPreviewQr(qr);
    const scanUrl = `${BASE_URL}/loyalty/scan?code=${qr.code}`;
    const dataUrl = await QRCode.toDataURL(scanUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    setPreviewDataUrl(dataUrl);
  };

  const downloadQr = () => {
    if (!previewDataUrl || !previewQr) return;
    const a = document.createElement('a');
    a.download = `qr-${previewQr.label || previewQr.code.slice(0, 8)}.png`;
    a.href = previewDataUrl;
    a.click();
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .ly-admin-input{width:100%;padding:9px 12px;border-radius:8px;border:1px solid #1e293b;background:#0d1117;color:#f1f5f9;font-size:0.875rem;outline:none;box-sizing:border-box;transition:border-color 0.15s;font-family:inherit}
        .ly-admin-input:focus{border-color:#fbbf24}
        .ly-tab-btn{padding:8px 18px;border:none;background:transparent;color:#64748b;font-size:0.875rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;font-family:inherit}
        .ly-tab-btn.active{color:#fbbf24;border-bottom-color:#fbbf24}
      `}</style>

      {/* Page title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>⭐ Loyalty Rewards</h1>
        <p style={{ color: '#475569', fontSize: '0.82rem', margin: '4px 0 0' }}>จัดการ QR Code และสมาชิก</p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1e293b', marginBottom: '24px', display: 'flex' }}>
        <button className={`ly-tab-btn${activeTab === 'qr' ? ' active' : ''}`} onClick={() => setActiveTab('qr')}>
          QR Codes
        </button>
        <button className={`ly-tab-btn${activeTab === 'members' ? ' active' : ''}`} onClick={() => setActiveTab('members')}>
          สมาชิก ({members.length || '...'})
        </button>
      </div>

      {/* QR Tab */}
      {activeTab === 'qr' && (
        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'start' }}>

          {/* Generate form */}
          <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', padding: '20px', animation: 'fadeUp 0.3s ease' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 18px' }}>สร้าง QR Code ใหม่</h2>

            {genError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '0.82rem' }}>
                {genError}
              </div>
            )}

            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ชื่อ / คำอธิบาย
                </label>
                <input className="ly-admin-input" type="text" placeholder="เช่น มาทาน 3 ครั้งแล้ว" value={genLabel} onChange={e => setGenLabel(e.target.value)} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  จำนวนแต้ม
                </label>
                <input className="ly-admin-input" type="number" min={1} max={10000} value={genPoints} onChange={e => setGenPoints(Number(e.target.value))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    หมดอายุ (ชั่วโมง)
                  </label>
                  <input className="ly-admin-input" type="number" min={1} value={genHours} onChange={e => setGenHours(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ใช้ได้กี่ครั้ง
                  </label>
                  <input className="ly-admin-input" type="number" min={0} value={genMaxUses} onChange={e => setGenMaxUses(Number(e.target.value))} placeholder="0 = ไม่จำกัด" />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: generating ? '#334155' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {generating ? 'กำลังสร้าง...' : '+ สร้าง QR Code'}
              </button>
            </form>
          </div>

          {/* QR list */}
          <div style={{ animation: 'fadeUp 0.3s ease 0.1s both' }}>
            <h2 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>
              QR Codes ({qrCodes.length})
            </h2>

            {loadingQr ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>กำลังโหลด...</div>
            ) : qrCodes.length === 0 ? (
              <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#475569' }}>
                ยังไม่มี QR Code
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
                {qrCodes.map(qr => {
                  const expired = isExpired(qr.expires_at);
                  const statusColor = !qr.is_active ? '#475569' : expired ? '#f87171' : '#4ade80';
                  const statusLabel = !qr.is_active ? 'ปิด' : expired ? 'หมดอายุ' : 'ใช้งานได้';
                  return (
                    <div key={qr.id} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '10px', padding: '14px 16px', opacity: (!qr.is_active || expired) ? 0.65 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}>+{qr.points_value} แต้ม</span>
                            <span style={{ background: `${statusColor}22`, color: statusColor, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                              {statusLabel}
                            </span>
                          </div>
                          {qr.label && <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '3px' }}>{qr.label}</div>}
                          <div style={{ color: '#334155', fontSize: '0.72rem', marginTop: '4px' }}>
                            ใช้แล้ว {qr.used_count}{qr.max_uses > 0 ? `/${qr.max_uses}` : ''} ครั้ง · หมดอายุ {new Date(qr.expires_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => openPreview(qr)}
                            title="ดู QR"
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            QR
                          </button>
                          <button
                            onClick={() => toggleActive(qr)}
                            title={qr.is_active ? 'ปิด' : 'เปิด'}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b', background: 'transparent', color: qr.is_active ? '#fbbf24' : '#475569', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            {qr.is_active ? 'ปิด' : 'เปิด'}
                          </button>
                          <button
                            onClick={() => deleteQr(qr)}
                            title="ลบ"
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#f87171', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
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
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          {loadingMembers ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>กำลังโหลด...</div>
          ) : members.length === 0 ? (
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#475569' }}>
              ยังไม่มีสมาชิก
            </div>
          ) : (
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a2332' }}>
                    {['ชื่อ', 'เบอร์โทร', 'แต้ม', 'ระดับ', 'สมัครวันที่'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? '1px solid #0d1117' : 'none', transition: 'background 0.1s' }}>
                      <td style={{ padding: '13px 16px', color: '#f1f5f9', fontWeight: 500 }}>{m.name}</td>
                      <td style={{ padding: '13px 16px', color: '#64748b' }}>{m.phone}</td>
                      <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 700 }}>{m.points.toLocaleString()}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ color: TIER_COLORS[m.tier], fontSize: '0.82rem', fontWeight: 600 }}>
                          {TIER_EMOJI[m.tier]} {m.tier.charAt(0).toUpperCase() + m.tier.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', color: '#475569', fontSize: '0.8rem' }}>
                        {new Date(m.createdAt).toLocaleDateString('th-TH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QR Preview Modal */}
      {previewQr && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setPreviewQr(null)}
        >
          <div
            style={{ background: '#0d1117', borderRadius: '16px', padding: '28px', maxWidth: '360px', width: '100%', border: '1px solid #1e293b', textAlign: 'center', animation: 'fadeUp 0.2s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>
              {previewQr.label || 'QR Code'}
            </h3>
            <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '0.82rem' }}>
              +{previewQr.points_value} แต้ม · หมดอายุ {new Date(previewQr.expires_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
            </p>

            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="QR Code"
                style={{ width: '220px', height: '220px', borderRadius: '12px', background: '#fff', padding: '8px', boxSizing: 'border-box' }}
              />
            ) : (
              <div style={{ width: '220px', height: '220px', background: '#1e293b', borderRadius: '12px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                กำลังโหลด...
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setPreviewQr(null)}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ปิด
              </button>
              <button
                onClick={downloadQr}
                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ดาวน์โหลด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
