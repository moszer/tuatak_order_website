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
  phone: string | null;
  name: string;
  email: string | null;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'member' | 'platinum';
  memberNumber: string | null;
  validTill: string | null;
  totalVisits: number;
  address: string | null;
  gender: 'male' | 'female' | 'other' | null;
  lineUid: string | null;
  linePictureUrl: string | null;
  createdAt: string;
}

const TIER_COLORS: Record<string, string> = { bronze: '#cd7f32', silver: '#94a3b8', gold: '#fbbf24', member: '#64748b', platinum: '#e2e8f0' };
const TIER_EMOJI: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', member: '👤', platinum: '💎' };

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/* ── TierEditForm component ────────────────────────────────────────────────── */
function TierEditForm({ tier, onChange, onSave, onCancel, saving, showKey, keyValue, onKeyChange }: {
  tier: { id: number; tier_name: string; min_points: number; color: string; benefits: string[]; sort_order: number };
  onChange: (t: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  showKey?: boolean;
  keyValue?: string;
  onKeyChange?: (v: string) => void;
}) {
  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #1e293b', background: '#0d1117', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { display: 'block', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: showKey ? '1fr 1fr' : '1fr 1fr', gap: 10 }}>
        {showKey && (
          <div>
            <label style={lbl}>tier_key (ภาษาอังกฤษ ตัวพิมพ์เล็ก)</label>
            <input style={inp} value={keyValue ?? ''} onChange={e => onKeyChange?.(e.target.value.toLowerCase().replace(/\s/g,''))} placeholder="เช่น gold, platinum" />
          </div>
        )}
        <div>
          <label style={lbl}>ชื่อ Tier</label>
          <input style={inp} value={tier.tier_name} onChange={e => onChange({ ...tier, tier_name: e.target.value.toUpperCase() })} placeholder="เช่น GOLD" />
        </div>
        <div>
          <label style={lbl}>แต้มขั้นต่ำ</label>
          <input style={inp} type="number" min={0} value={tier.min_points} onChange={e => onChange({ ...tier, min_points: Number(e.target.value) })} />
        </div>
        <div>
          <label style={lbl}>สีแสดงผล</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="color" value={tier.color} onChange={e => onChange({ ...tier, color: e.target.value })}
              style={{ width: 36, height: 34, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
            <input style={{ ...inp, flex: 1 }} value={tier.color} onChange={e => onChange({ ...tier, color: e.target.value })} placeholder="#F6AD55" />
          </div>
        </div>
        <div>
          <label style={lbl}>ลำดับแสดง</label>
          <input style={inp} type="number" min={0} value={tier.sort_order} onChange={e => onChange({ ...tier, sort_order: Number(e.target.value) })} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={lbl}>สิทธิพิเศษ</label>
          <button type="button" onClick={() => onChange({ ...tier, benefits: [...tier.benefits, ''] })}
            style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}>+ เพิ่ม</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tier.benefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input style={{ ...inp, flex: 1 }} value={b} onChange={e => { const arr = [...tier.benefits]; arr[i] = e.target.value; onChange({ ...tier, benefits: arr }); }} placeholder={`สิทธิ์ที่ ${i + 1}`} />
              <button type="button" onClick={() => { const arr = tier.benefits.filter((_, j) => j !== i); onChange({ ...tier, benefits: arr }); }}
                style={{ padding: '0 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#f87171', fontSize: '0.78rem', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
        <button onClick={onSave} disabled={saving}
          style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: saving ? '#1e293b' : '#fbbf24', color: saving ? '#475569' : '#0a0f1a', fontSize: '0.82rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  );
}

interface LoyaltyTier {
  id: number;
  tier_key: string;
  tier_name: string;
  min_points: number;
  color: string;
  benefits: string[];
  sort_order: number;
}

export default function AdminLoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'qr' | 'members' | 'tiers'>('qr');
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingQr, setLoadingQr] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // Member detail modal
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  // Tiers
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState('');
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTier, setNewTier] = useState({ tier_key: '', tier_name: '', min_points: 0, color: '#94a3b8', benefits: [''], sort_order: 0 });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const loadTiers = useCallback(async () => {
    setLoadingTiers(true);
    const res = await fetch('/api/loyalty/tiers');
    const data = await res.json();
    setTiers(data.tiers || []);
    setLoadingTiers(false);
  }, []);

  useEffect(() => { loadQrCodes(); }, [loadQrCodes]);
  useEffect(() => { if (activeTab === 'members') loadMembers(); }, [activeTab, loadMembers]);
  useEffect(() => { if (activeTab === 'tiers') loadTiers(); }, [activeTab, loadTiers]);

  const saveTier = async (tier: LoyaltyTier, updates: Partial<LoyaltyTier>) => {
    setTierSaving(true); setTierError('');
    const res = await fetch(`/api/loyalty/tiers/${tier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) { setEditingTier(null); await loadTiers(); }
    else { const d = await res.json(); setTierError(d.error || 'เกิดข้อผิดพลาด'); }
    setTierSaving(false);
  };

  const deleteTier = async (id: number) => {
    if (!confirm('ลบ tier นี้?')) return;
    await fetch(`/api/loyalty/tiers/${id}`, { method: 'DELETE' });
    await loadTiers();
  };

  const addTier = async () => {
    setTierSaving(true); setTierError('');
    const payload = { ...newTier, benefits: newTier.benefits.filter(b => b.trim()) };
    const res = await fetch('/api/loyalty/tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowAddTier(false);
      setNewTier({ tier_key: '', tier_name: '', min_points: 0, color: '#94a3b8', benefits: [''], sort_order: 0 });
      await loadTiers();
    } else { const d = await res.json(); setTierError(d.error || 'เกิดข้อผิดพลาด'); }
    setTierSaving(false);
  };

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

  const deleteMember = async (m: Member) => {
    if (!confirm(`ลบสมาชิก "${m.name}" (${m.phone}) ?\n\nประวัติแต้มทั้งหมดจะถูกลบด้วย`)) return;
    setDeletingId(m.id);
    try {
      const res = await fetch(`/api/members/${m.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMembers(prev => prev.filter(x => x.id !== m.id));
      } else {
        const data = await res.json();
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } finally {
      setDeletingId(null);
    }
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
        <button className={`ly-tab-btn${activeTab === 'tiers' ? ' active' : ''}`} onClick={() => setActiveTab('tiers')}>
          ระดับสมาชิก
        </button>
      </div>

      {/* QR Tab */}
      {activeTab === 'qr' && (
        <div style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
          alignItems: 'start',
        }}>

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isMobile ? 'none' : '520px', overflowY: isMobile ? 'visible' : 'auto' }}>
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

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'flex-end' }}>
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
          {/* Search bar */}
          {!loadingMembers && members.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <input
                className="ly-admin-input"
                type="text"
                placeholder="ค้นหาชื่อ หรือ เบอร์โทร..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ maxWidth: isMobile ? '100%' : '320px' }}
              />
            </div>
          )}

          {loadingMembers ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>กำลังโหลด...</div>
          ) : members.length === 0 ? (
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#475569' }}>
              ยังไม่มีสมาชิก
            </div>
          ) : (() => {
            const filtered = members.filter(m =>
              m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
              (m.phone || '').includes(memberSearch) ||
              (m.memberNumber || '').includes(memberSearch)
            );
            return (
              <>
                {/* Desktop: table */}
                {!isMobile && (
                  <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a2332' }}>
                          {['ชื่อ', 'เบอร์โทร', 'แต้ม', 'ระดับ', 'สมัครวันที่', 'ครั้ง', ''].map(h => (
                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#475569' }}>ไม่พบสมาชิก</td>
                          </tr>
                        ) : filtered.map((m, i) => (
                          <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #0d1117' : 'none' }}>
                            <td style={{ padding: '13px 16px', color: '#f1f5f9', fontWeight: 500 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {m.linePictureUrl && <img src={m.linePictureUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                                <span>{m.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '13px 16px', color: '#64748b' }}>{m.phone || '-'}</td>
                            <td style={{ padding: '13px 16px', color: '#fbbf24', fontWeight: 700 }}>{m.points.toLocaleString()}</td>
                            <td style={{ padding: '13px 16px' }}>
                              <span style={{ color: TIER_COLORS[m.tier] || '#64748b', fontSize: '0.82rem', fontWeight: 600 }}>
                                {TIER_EMOJI[m.tier] || '👤'} {m.tier.charAt(0).toUpperCase() + m.tier.slice(1)}
                              </span>
                            </td>
                            <td style={{ padding: '13px 16px', color: '#475569', fontSize: '0.8rem' }}>
                              {new Date(m.createdAt).toLocaleDateString('th-TH')}
                            </td>
                            <td style={{ padding: '13px 16px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                              {m.totalVisits}
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => setDetailMember(m)}
                                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                                >
                                  ดูข้อมูล
                                </button>
                                <button
                                  onClick={() => deleteMember(m)}
                                  disabled={deletingId === m.id}
                                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: deletingId === m.id ? '#475569' : '#f87171', fontSize: '0.78rem', cursor: deletingId === m.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                                >
                                  {deletingId === m.id ? '...' : 'ลบ'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {memberSearch && (
                      <div style={{ padding: '10px 16px', borderTop: '1px solid #1a2332', color: '#475569', fontSize: '0.78rem' }}>
                        แสดง {filtered.length} จาก {members.length} สมาชิก
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile: cards */}
                {isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filtered.length === 0 ? (
                      <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#475569' }}>
                        ไม่พบสมาชิก
                      </div>
                    ) : filtered.map(m => (
                      <div key={m.id} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: '10px', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              {m.linePictureUrl && <img src={m.linePictureUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                              <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</span>
                              <span style={{ color: TIER_COLORS[m.tier] || '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                                {TIER_EMOJI[m.tier] || '👤'} {m.tier.charAt(0).toUpperCase() + m.tier.slice(1)}
                              </span>
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '2px' }}>{m.phone || '-'}</div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.875rem' }}>⭐ {m.points.toLocaleString()} แต้ม</span>
                              <span style={{ color: '#334155', fontSize: '0.72rem' }}>
                                มาแล้ว {m.totalVisits} ครั้ง
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => setDetailMember(m)}
                              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              ดูข้อมูล
                            </button>
                            <button
                              onClick={() => deleteMember(m)}
                              disabled={deletingId === m.id}
                              style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: deletingId === m.id ? '#475569' : '#f87171', fontSize: '0.78rem', cursor: deletingId === m.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                            >
                              {deletingId === m.id ? '...' : 'ลบ'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {memberSearch && (
                      <div style={{ color: '#475569', fontSize: '0.78rem', textAlign: 'center', padding: '8px 0' }}>
                        แสดง {filtered.length} จาก {members.length} สมาชิก
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Member Detail Modal */}
      {detailMember && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setDetailMember(null)}
        >
          <div
            style={{ background: '#0d1117', borderRadius: '16px', padding: '28px 24px', maxWidth: '420px', width: '100%', border: '1px solid #1e293b', animation: 'fadeUp 0.2s ease', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              {detailMember.linePictureUrl ? (
                <img src={detailMember.linePictureUrl} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e293b', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#f1f5f9', flexShrink: 0 }}>
                  {detailMember.name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.05rem' }}>{detailMember.name}</div>
                <div style={{ color: TIER_COLORS[detailMember.tier] || '#64748b', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>
                  {TIER_EMOJI[detailMember.tier] || '👤'} {detailMember.tier.charAt(0).toUpperCase() + detailMember.tier.slice(1)}
                </div>
              </div>
            </div>

            {/* Info rows */}
            {[
              { label: '📱 เบอร์โทร', value: detailMember.phone || '-' },
              { label: '✉️ อีเมล', value: detailMember.email || '-' },
              { label: '🧬 เพศ', value: detailMember.gender === 'male' ? 'ชาย' : detailMember.gender === 'female' ? 'หญิง' : detailMember.gender === 'other' ? 'อื่นๆ' : '-' },
              { label: '🏠 ที่อยู่', value: detailMember.address || '-' },
              { label: '🎫 เลขบัตร', value: detailMember.memberNumber || '-' },
              { label: '📅 หมดอายุ', value: detailMember.validTill ? new Date(detailMember.validTill).toLocaleDateString('th-TH') : '-' },
              { label: '⭐ คะแนน', value: `${detailMember.points.toLocaleString()} แต้ม` },
              { label: '🍲 มาทั้งหมด', value: `${detailMember.totalVisits} ครั้ง` },
              { label: '📆 สมัครวันที่', value: new Date(detailMember.createdAt).toLocaleDateString('th-TH') },
              { label: '🔗 LINE UID', value: detailMember.lineUid || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid #1a2332', gap: 12 }}>
                <span style={{ color: '#475569', fontSize: '0.82rem', minWidth: 110, flexShrink: 0 }}>{row.label}</span>
                <span style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500, textAlign: 'right', lineHeight: 1.5 }}>{row.value}</span>
              </div>
            ))}

            <button
              onClick={() => setDetailMember(null)}
              style={{ width: '100%', marginTop: 20, padding: '10px', borderRadius: '8px', border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {/* ── Tiers Tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'tiers' && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>จัดการระดับสมาชิก · ธรณีแต้ม · สิทธิพิเศษ</div>
            <button onClick={() => { setShowAddTier(true); setTierError(''); }}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#fbbf24', color: '#0a0f1a', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              เพิ่ม Tier
            </button>
          </div>

          {tierError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: '0.82rem' }}>{tierError}</div>}

          {loadingTiers ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>กำลังโหลด...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tiers.map(tier => (
                <div key={tier.id} style={{ background: '#0a0f1a', border: `2px solid ${tier.color}33`, borderRadius: 12, padding: 16 }}>
                  {editingTier?.id === tier.id ? (
                    /* ── Edit form ── */
                    <TierEditForm tier={editingTier} onChange={setEditingTier}
                      onSave={() => saveTier(tier, { tier_name: editingTier.tier_name, min_points: editingTier.min_points, color: editingTier.color, benefits: editingTier.benefits, sort_order: editingTier.sort_order })}
                      onCancel={() => { setEditingTier(null); setTierError(''); }}
                      saving={tierSaving} />
                  ) : (
                    /* ── Display ── */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                          <span style={{ color: tier.color, fontWeight: 800, fontSize: '1rem', letterSpacing: 1 }}>{tier.tier_name}</span>
                          <span style={{ background: '#1a2332', color: '#475569', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4 }}>ตั้งแต่ {tier.min_points.toLocaleString()} แต้ม</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => { setEditingTier({ ...tier, benefits: [...tier.benefits] }); setTierError(''); }}
                            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>แก้ไข</button>
                          <button onClick={() => deleteTier(tier.id)}
                            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>ลบ</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tier.benefits.map((b, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ color: tier.color, marginTop: 2, flexShrink: 0 }}>•</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{b}</span>
                          </div>
                        ))}
                        {tier.benefits.length === 0 && <span style={{ color: '#334155', fontSize: '0.78rem' }}>ยังไม่มีสิทธิพิเศษ</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {tiers.length === 0 && (
                <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, padding: 48, textAlign: 'center', color: '#475569' }}>ยังไม่มี tier</div>
              )}
            </div>
          )}

          {/* Add tier modal */}
          {showAddTier && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
              <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>เพิ่ม Tier ใหม่</span>
                  <button onClick={() => setShowAddTier(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                {tierError && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, color: '#f87171', fontSize: '0.78rem' }}>{tierError}</div>}
                <TierEditForm
                  tier={{ id: 0, ...newTier } as any}
                  onChange={t => setNewTier({ tier_key: (t as any).tier_key ?? newTier.tier_key, tier_name: t.tier_name, min_points: t.min_points, color: t.color, benefits: t.benefits, sort_order: t.sort_order })}
                  showKey
                  onSave={addTier}
                  onCancel={() => setShowAddTier(false)}
                  saving={tierSaving}
                  keyValue={newTier.tier_key}
                  onKeyChange={v => setNewTier(n => ({ ...n, tier_key: v }))}
                />
              </div>
            </div>
          )}
        </div>
      )}

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
