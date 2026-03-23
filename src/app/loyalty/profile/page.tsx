'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Member {
  id: number;
  phone: string;
  name: string;
  email: string | null;
  points: number;
  tier: string;
  createdAt: string;
}

interface HistoryItem {
  id: number;
  points: number;
  type: 'earn' | 'redeem';
  description: string;
  qr_label: string | null;
  createdAt: string;
}

interface LoyaltyTierConfig {
  id: number;
  tier_key: string;
  tier_name: string;
  min_points: number;
  color: string;
  sort_order: number;
}

const TIER_EMOJI: Record<string, string> = {
  member: '👤', bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎',
};

const FALLBACK_TIERS: LoyaltyTierConfig[] = [
  { id: 0, tier_key: 'member', tier_name: 'MEMBER', min_points: 0,   color: '#b5a99d', sort_order: 0 },
  { id: 1, tier_key: 'silver', tier_name: 'SILVER', min_points: 1000, color: '#8a7a72', sort_order: 1 },
  { id: 2, tier_key: 'gold',   tier_name: 'GOLD',   min_points: 5000, color: '#F6AD55', sort_order: 2 },
];

function getTierConf(points: number, tiers: LoyaltyTierConfig[]) {
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  let idx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (points >= sorted[i].min_points) idx = i;
  }
  const cur = sorted[idx];
  const next = sorted[idx + 1] || null;
  return {
    color: cur.color,
    emoji: TIER_EMOJI[cur.tier_key] || '⭐',
    label: cur.tier_name,
    next: next ? next.min_points : null,
    nextLabel: next ? next.tier_name : null,
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTierConfig[]>([]);

  useEffect(() => {
    fetch('/api/loyalty/tiers')
      .then(r => r.json())
      .then(d => setLoyaltyTiers(d.tiers || []))
      .catch((e) => console.error('Failed to load loyalty tiers:', e));
  }, []);

  useEffect(() => {
    fetch('/api/members/me')
      .then(res => {
        if (res.status === 401) { router.replace('/loyalty'); return null; }
        return res.json();
      })
      .then(data => {
        if (data) {
          setMember(data.member);
          setHistory(data.history || []);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/members/logout', { method: 'POST' });
    router.push('/loyalty');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(251,191,36,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!member) return null;

  const activeTiers = loyaltyTiers.length > 0 ? loyaltyTiers : FALLBACK_TIERS;
  const tierConf = getTierConf(member.points, activeTiers);
  const progressPct = tierConf.next
    ? Math.min(100, (member.points / tierConf.next) * 100)
    : 100;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '0 0 40px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', borderBottom: '1px solid #334155', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>⭐</span>
          <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '1rem' }}>TUATAK Rewards</span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ออกจากระบบ
        </button>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Member card */}
        <div style={{ background: `linear-gradient(135deg,${tierConf.color}22,#1e293b)`, borderRadius: '16px', border: `1px solid ${tierConf.color}44`, padding: '24px', marginBottom: '20px', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>สมาชิก</div>
              <div style={{ color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 700 }}>{member.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px' }}>{member.phone}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px' }}>{tierConf.emoji}</div>
              <div style={{ color: tierConf.color, fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>{tierConf.label}</div>
            </div>
          </div>

          {/* Points display */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>แต้มสะสม</div>
            <div style={{ color: tierConf.color, fontSize: '2.5rem', fontWeight: 800 }}>{member.points.toLocaleString()}</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>คะแนน</div>
          </div>

          {/* Progress to next tier */}
          {tierConf.next && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span>ความก้าวหน้าสู่ระดับ {tierConf.nextLabel}</span>
                <span>{member.points.toLocaleString()} / {tierConf.next.toLocaleString()}</span>
              </div>
              <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg,${tierConf.color},${tierConf.color}cc)`, borderRadius: '3px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '6px' }}>
                ต้องการอีก {(tierConf.next - member.points).toLocaleString()} แต้ม
              </div>
            </div>
          )}
          {!tierConf.next && (
            <div style={{ textAlign: 'center', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 600 }}>
              🎉 คุณอยู่ในระดับสูงสุดแล้ว!
            </div>
          )}
        </div>

        {/* Scan button */}
        <Link href="/loyalty/scan" style={{ display: 'block', textDecoration: 'none', marginBottom: '20px', animation: 'fadeUp 0.4s ease 0.1s both' }}>
          <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
              📷
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>สแกน QR Code</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', marginTop: '2px' }}>สแกนเพื่อรับแต้มสะสม</div>
            </div>
            <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)', fontSize: '20px' }}>›</div>
          </div>
        </Link>

        {/* Points history */}
        <div style={{ animation: 'fadeUp 0.4s ease 0.2s both' }}>
          <h2 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', margin: '0 0 12px' }}>
            ประวัติแต้ม
          </h2>
          {history.length === 0 ? (
            <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '32px', textAlign: 'center', color: '#475569' }}>
              ยังไม่มีประวัติแต้ม<br />
              <span style={{ fontSize: '0.8rem' }}>สแกน QR Code เพื่อเริ่มสะสมแต้ม</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map(item => (
                <div key={item.id} style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                    <div style={{ color: '#cbd5e1', fontSize: '0.88rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description}
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '2px' }}>
                      {new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div style={{ color: item.type === 'earn' ? '#4ade80' : '#f87171', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>
                    {item.type === 'earn' ? '+' : '-'}{Math.abs(item.points)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
