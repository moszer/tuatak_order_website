'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

interface Member {
  id: number;
  phone: string | null;
  name: string;
  email: string | null;
  points: number;
  tier: string;
  memberNumber: string | null;
  validTill: string | null;
  totalVisits: number;
  address: string | null;
  gender: 'male' | 'female' | 'other' | null;
  lineUid: string | null;
  linePictureUrl: string | null;
  createdAt: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#94a3b8', gold: '#fbbf24',
  member: '#64748b', platinum: '#e2e8f0',
};

const GENDER_LABEL: Record<string, string> = { male: 'ชาย', female: 'หญิง', other: 'อื่นๆ' };

function fmt(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH');
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sortKey, setSortKey] = useState<'points' | 'totalVisits' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data.members || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stats
  const total = members.length;
  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalVisits = members.reduce((s, m) => s + m.totalVisits, 0);
  const withAddress = members.filter(m => m.address).length;
  const withLine = members.filter(m => m.lineUid).length;
  const tierCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.tier] = (acc[m.tier] || 0) + 1;
    return acc;
  }, {});

  // Filter + sort
  const filtered = members
    .filter(m => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q) || (m.phone || '').includes(q) || (m.memberNumber || '').includes(q) || (m.address || '').toLowerCase().includes(q);
      const matchTier = !tierFilter || m.tier === tierFilter;
      const matchGender = !genderFilter || m.gender === genderFilter;
      return matchSearch && matchTier && matchGender;
    })
    .sort((a, b) => {
      const av = sortKey === 'createdAt' ? new Date(a.createdAt).getTime() : (a[sortKey] as number);
      const bv = sortKey === 'createdAt' ? new Date(b.createdAt).getTime() : (b[sortKey] as number);
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function exportExcel() {
    const rows = filtered.map(m => ({
      'ชื่อ': m.name,
      'เบอร์โทร': m.phone || '',
      'อีเมล': m.email || '',
      'เพศ': m.gender ? GENDER_LABEL[m.gender] : '',
      'ที่อยู่': m.address || '',
      'ระดับ': m.tier,
      'คะแนน': m.points,
      'จำนวนครั้ง': m.totalVisits,
      'เลขบัตร': m.memberNumber || '',
      'บัตรหมดอายุ': m.validTill ? fmt(m.validTill) : '',
      'LINE UID': m.lineUid || '',
      'วันที่สมัคร': fmt(m.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 8 }, { wch: 40 },
      { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 14 },
      { wch: 30 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'สมาชิก');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `members_${date}.xlsx`);
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #1e293b',
    background: '#0d1117', color: '#f1f5f9', fontSize: '0.875rem',
    outline: 'none', fontFamily: 'inherit',
  };

  const SortArrow = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? <span style={{ marginLeft: 4, color: '#fbbf24' }}>{sortDir === 'desc' ? '↓' : '↑'}</span> : null;

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .mem-row:hover td { background: #0f1e2e !important; }
        .mem-th-btn { background: none; border: none; color: #475569; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; padding: 0; font-family: inherit; white-space: nowrap; }
        .mem-th-btn:hover { color: #94a3b8; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>👥 ข้อมูลสมาชิก</h1>
          <p style={{ color: '#475569', fontSize: '0.82rem', margin: '4px 0 0' }}>สรุปและ export ข้อมูลสมาชิกทั้งหมด</p>
        </div>
        <button
          onClick={exportExcel}
          disabled={filtered.length === 0}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: filtered.length === 0 ? '#1e293b' : 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: filtered.length === 0 ? '#475569' : '#fff',
            fontSize: '0.875rem', fontWeight: 700, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Excel ({filtered.length})
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'สมาชิกทั้งหมด', value: total, color: '#60a5fa', icon: '👥' },
            { label: 'คะแนนรวม', value: totalPoints.toLocaleString(), color: '#fbbf24', icon: '⭐' },
            { label: 'การเข้าร้านรวม', value: totalVisits.toLocaleString(), color: '#34d399', icon: '🍲' },
            { label: 'มี LINE', value: withLine, color: '#06C755', icon: '💬' },
            { label: 'กรอกที่อยู่', value: withAddress, color: '#a78bfa', icon: '🏠' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, padding: '14px 16px', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
          {/* Tier breakdown */}
          {Object.entries(tierCounts).map(([tier, count]) => (
            <div key={tier} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>🏅</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: TIER_COLORS[tier] || '#64748b' }}>{count}</div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, minWidth: 200, flex: 1 }}
          placeholder="ค้นหา ชื่อ / เบอร์ / เลขบัตร / ที่อยู่..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={inputStyle} value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option value="">ทุกระดับ</option>
          <option value="member">Member</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
        <select style={inputStyle} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
          <option value="">ทุกเพศ</option>
          <option value="male">ชาย</option>
          <option value="female">หญิง</option>
          <option value="other">อื่นๆ</option>
        </select>
        {(search || tierFilter || genderFilter) && (
          <button onClick={() => { setSearch(''); setTierFilter(''); setGenderFilter(''); }} style={{ ...inputStyle, cursor: 'pointer', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
            ล้าง
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, padding: 48, textAlign: 'center', color: '#475569' }}>
          ไม่พบสมาชิก
        </div>
      ) : (
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, overflow: 'auto', animation: 'fadeUp 0.3s ease' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2332' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}><span className="mem-th-btn">ชื่อ</span></th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}><span className="mem-th-btn">เบอร์โทร</span></th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}><span className="mem-th-btn">เพศ</span></th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}><span className="mem-th-btn">ที่อยู่</span></th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}><span className="mem-th-btn">ระดับ</span></th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button className="mem-th-btn" onClick={() => toggleSort('points')}>คะแนน<SortArrow k="points" /></button>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button className="mem-th-btn" onClick={() => toggleSort('totalVisits')}>ครั้ง<SortArrow k="totalVisits" /></button>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>
                  <button className="mem-th-btn" onClick={() => toggleSort('createdAt')}>สมัครวันที่<SortArrow k="createdAt" /></button>
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}><span className="mem-th-btn">รายละเอียด</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="mem-row" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #0d1117' : 'none' }}>
                  <td style={{ padding: '11px 16px', color: '#f1f5f9', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.linePictureUrl
                        ? <img src={m.linePictureUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>{m.name[0]?.toUpperCase()}</div>
                      }
                      <span>{m.name}</span>
                      {m.lineUid && <span style={{ fontSize: 10, background: 'rgba(6,199,85,0.15)', color: '#06C755', padding: '1px 6px', borderRadius: 4 }}>LINE</span>}
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#64748b' }}>{m.phone || '-'}</td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8' }}>{m.gender ? GENDER_LABEL[m.gender] : '-'}</td>
                  <td style={{ padding: '11px 16px', color: '#64748b', maxWidth: 220 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.address || ''}>
                      {m.address || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ color: TIER_COLORS[m.tier] || '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                      {m.tier.charAt(0).toUpperCase() + m.tier.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', color: '#fbbf24', fontWeight: 700, textAlign: 'center' }}>{m.points.toLocaleString()}</td>
                  <td style={{ padding: '11px 16px', color: '#94a3b8', textAlign: 'center' }}>{m.totalVisits}</td>
                  <td style={{ padding: '11px 16px', color: '#475569', fontSize: '0.8rem' }}>{fmt(m.createdAt)}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setDetailMember(m)}
                      style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      ดูข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1a2332', color: '#475569', fontSize: '0.78rem' }}>
            แสดง {filtered.length} จาก {total} สมาชิก
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {detailMember && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={() => setDetailMember(null)}
        >
          <div
            style={{ background: '#0d1117', borderRadius: 16, padding: '28px 24px', maxWidth: 440, width: '100%', border: '1px solid #1e293b', animation: 'fadeUp 0.2s ease', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Profile header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              {detailMember.linePictureUrl
                ? <img src={detailMember.linePictureUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e293b', flexShrink: 0 }} />
                : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#f1f5f9', flexShrink: 0 }}>
                    {detailMember.name[0]?.toUpperCase()}
                  </div>
              }
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.1rem' }}>{detailMember.name}</div>
                <div style={{ color: TIER_COLORS[detailMember.tier] || '#64748b', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>
                  {detailMember.tier.charAt(0).toUpperCase() + detailMember.tier.slice(1)}
                </div>
              </div>
            </div>

            {[
              { label: '📱 เบอร์โทร', value: detailMember.phone || '-' },
              { label: '✉️ อีเมล', value: detailMember.email || '-' },
              { label: '🧬 เพศ', value: detailMember.gender ? GENDER_LABEL[detailMember.gender] : '-' },
              { label: '🏠 ที่อยู่', value: detailMember.address || '-' },
              { label: '🎫 เลขบัตร', value: detailMember.memberNumber || '-' },
              { label: '📅 บัตรหมดอายุ', value: fmt(detailMember.validTill) },
              { label: '⭐ คะแนน', value: `${detailMember.points.toLocaleString()} แต้ม` },
              { label: '🍲 มาทั้งหมด', value: `${detailMember.totalVisits} ครั้ง` },
              { label: '📆 สมัครวันที่', value: fmt(detailMember.createdAt) },
              { label: '🔗 LINE UID', value: detailMember.lineUid || '-' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid #1a2332', gap: 12 }}>
                <span style={{ color: '#475569', fontSize: '0.82rem', minWidth: 110, flexShrink: 0 }}>{row.label}</span>
                <span style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500, textAlign: 'right', lineHeight: 1.5 }}>{row.value}</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => {
                  const m = detailMember;
                  const rows = [{
                    'ชื่อ': m.name, 'เบอร์โทร': m.phone || '', 'อีเมล': m.email || '',
                    'เพศ': m.gender ? GENDER_LABEL[m.gender] : '', 'ที่อยู่': m.address || '',
                    'ระดับ': m.tier, 'คะแนน': m.points, 'จำนวนครั้ง': m.totalVisits,
                    'เลขบัตร': m.memberNumber || '', 'บัตรหมดอายุ': fmt(m.validTill),
                    'LINE UID': m.lineUid || '', 'วันที่สมัคร': fmt(m.createdAt),
                  }];
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'สมาชิก');
                  XLSX.writeFile(wb, `member_${m.name}_${m.id}.xlsx`);
                }}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Export Excel
              </button>
              <button
                onClick={() => setDetailMember(null)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
