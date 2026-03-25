'use client';

import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import ReceiptContent, { ReceiptData } from '@/app/admin/components/ReceiptContent';
import { buildBTEscPos, printViaBluetooth } from '@/lib/bluetoothPrint';

interface ReceiptRow {
  id: number;
  tableNumber: string;
  paidAt: string;
  items: ReceiptData['aggregatedItems'];
  bill: ReceiptData['bill'];
  foodTotal: number;
  billTotal: number;
  grandTotal: number;
  qrCode: string | null;
  qrPoints: number;
  qrMaxUses: number;
  qrHours: number;
  createdAt: string;
}

function toReceiptData(row: ReceiptRow): ReceiptData {
  return {
    tableNumber: row.tableNumber,
    paidAt: new Date(row.paidAt),
    aggregatedItems: Array.isArray(row.items) ? row.items : JSON.parse(row.items as unknown as string || '[]'),
    bill: row.bill ? (typeof row.bill === 'object' ? row.bill : JSON.parse(row.bill as unknown as string)) : null,
    foodTotal: Number(row.foodTotal),
    billTotal: Number(row.billTotal),
    grandTotal: Number(row.grandTotal),
    qrDataUrl: '',
    qrCode: row.qrCode || undefined,
    qrPoints: row.qrPoints,
    qrMaxUses: row.qrMaxUses,
    qrHours: row.qrHours,
  };
}

async function printBluetooth(data: ReceiptData | null) {
  if (!data) return;
  try {
    const escData = buildBTEscPos({ ...data }, window.location.origin);
    await printViaBluetooth(escData);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'พิมพ์ Bluetooth สำเร็จ', showConfirmButton: false, timer: 2000, timerProgressBar: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('cancelled') && !msg.includes('User cancelled')) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Bluetooth พิมพ์ไม่สำเร็จ', text: msg, showConfirmButton: false, timer: 3500 });
    }
  }
}

async function printToPOS(data: ReceiptData | null) {
  if (!data) return;
  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        paidAt: data.paidAt instanceof Date ? data.paidAt.toISOString() : data.paidAt,
        printerHost: localStorage.getItem('pos_printer_host') || undefined,
        printerPort: localStorage.getItem('pos_printer_port') ? Number(localStorage.getItem('pos_printer_port')) : undefined,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'พิมพ์สำเร็จ', showConfirmButton: false, timer: 2000, timerProgressBar: true });
    } else {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'พิมพ์ไม่สำเร็จ', text: json.error, showConfirmButton: false, timer: 3500 });
    }
  } catch {
    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'เชื่อมต่อ POS printer ไม่ได้', showConfirmButton: false, timer: 3500 });
  }
}

export default function AdminReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [selected, setSelected] = useState<ReceiptData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      if (filterTable.trim()) params.set('table', filterTable.trim());
      const res = await fetch(`/api/receipts?${params}`);
      const data = await res.json();
      setReceipts(data.receipts || []);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterTable]);

  useEffect(() => { load(); }, [load]);

  async function deleteReceipt(id: number) {
    if (!confirm('ลบใบเสร็จนี้?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      setReceipts(prev => prev.filter(r => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteAll() {
    if (!confirm(`ลบใบเสร็จทั้งหมด ${receipts.length} รายการ?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return;
    for (const r of receipts) {
      await fetch(`/api/receipts/${r.id}`, { method: 'DELETE' });
    }
    setReceipts([]);
  }

  const totalRevenue = receipts.reduce((s, r) => s + Number(r.grandTotal), 0);

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #1e293b',
    background: '#0d1117', color: '#f1f5f9', fontSize: '0.875rem',
    outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>🧾 ใบเสร็จ</h1>
          <p style={{ color: '#475569', fontSize: '0.82rem', margin: '4px 0 0' }}>ประวัติการเช็คบิลทั้งหมด</p>
        </div>
        {receipts.length > 0 && (
          <button
            onClick={deleteAll}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#f87171', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ลบทั้งหมด ({receipts.length})
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="date"
          style={inputStyle}
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
        />
        <input
          type="text"
          style={{ ...inputStyle, width: 120 }}
          placeholder="โต๊ะ..."
          value={filterTable}
          onChange={e => setFilterTable(e.target.value)}
        />
        {(filterDate || filterTable) && (
          <button onClick={() => { setFilterDate(''); setFilterTable(''); }} style={{ ...inputStyle, cursor: 'pointer', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
            ล้าง
          </button>
        )}
      </div>

      {/* Summary */}
      {!loading && receipts.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'ใบเสร็จทั้งหมด', value: receipts.length, color: '#60a5fa' },
            { label: 'ยอดรวม', value: `฿${totalRevenue.toLocaleString()}`, color: '#34d399' },
          ].map(c => (
            <div key={c.label} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 10, padding: '12px 18px', animation: 'fadeUp 0.25s ease' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>กำลังโหลด...</div>
      ) : receipts.length === 0 ? (
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, padding: 48, textAlign: 'center', color: '#475569' }}>
          ยังไม่มีใบเสร็จ
        </div>
      ) : isMobile ? (
        /* Mobile cards */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeUp 0.3s ease' }}>
          {receipts.map(r => (
            <div key={r.id} style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 600 }}>โต๊ะ {r.tableNumber}</span>
                    {r.qrCode && <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>⭐ QR</span>}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 2 }}>
                    {new Date(r.paidAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.95rem' }}>฿{Number(r.grandTotal).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setSelected(toReceiptData(r))} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>ดู</button>
                  <button onClick={() => deleteReceipt(r.id)} disabled={deletingId === r.id} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: deletingId === r.id ? '#475569' : '#f87171', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>{deletingId === r.id ? '...' : 'ลบ'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2332', borderRadius: 12, overflow: 'auto', animation: 'fadeUp 0.3s ease' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a2332' }}>
                {['#', 'โต๊ะ', 'วันที่/เวลา', 'อาหาร', 'บุฟเฟ่ต์', 'รวม', 'QR', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: h === 'รวม' || h === 'อาหาร' || h === 'บุฟเฟ่ต์' ? 'right' : 'left', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < receipts.length - 1 ? '1px solid #0d1117' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.78rem' }}>{r.id}</td>
                  <td style={{ padding: '12px 16px', color: '#f1f5f9', fontWeight: 600 }}>{r.tableNumber}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(r.paidAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'right' }}>฿{Number(r.foodTotal).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'right' }}>฿{Number(r.billTotal).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 700, textAlign: 'right' }}>฿{Number(r.grandTotal).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {r.qrCode && <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>⭐ {r.qrPoints}</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setSelected(toReceiptData(r))} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #1e293b', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>ดูใบเสร็จ</button>
                      <button onClick={() => deleteReceipt(r.id)} disabled={deletingId === r.id} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: deletingId === r.id ? '#475569' : '#f87171', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>{deletingId === r.id ? '...' : 'ลบ'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1a2332', color: '#475569', fontSize: '0.78rem' }}>
            {receipts.length} รายการ · รวม ฿{totalRevenue.toLocaleString()}
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
          >
            <style>{`
              @media print {
                @page { size: 80mm auto; margin: 0; }
                html, body { background: #fff !important; }
                body * { visibility: hidden !important; }
                #receipt-print-content, #receipt-print-content * { visibility: visible !important; }
                #receipt-print-content { position: fixed !important; top: 0 !important; left: 50% !important; transform: translateX(-50%) !important; width: 302px !important; background: #fff !important; }
              }
            `}</style>
            <div id="receipt-print-content">
              <ReceiptContent data={selected} />
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px', background: '#fff', flexWrap: 'wrap' }}>
              <button
                onClick={() => printToPOS(selected)}
                style={{ flex: 1, minWidth: 110, padding: '11px 0', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
                POS
              </button>
              <button
                onClick={() => printBluetooth(selected)}
                style={{ flex: 1, minWidth: 110, padding: '11px 0', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></svg>
                Bluetooth
              </button>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, minWidth: 120, padding: '11px 0', borderRadius: 8, border: 'none', background: '#111827', color: '#f9fafb', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                พิมพ์
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{ flex: 1, minWidth: 80, padding: '11px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
