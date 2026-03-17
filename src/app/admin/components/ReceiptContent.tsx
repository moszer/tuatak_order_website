'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface ReceiptData {
  tableNumber: string;
  paidAt: Date;
  aggregatedItems: { id: number; nameTh: string; name: string; price: number; quantity: number }[];
  bill: {
    adultCount: number; child120Count: number; child100Count: number;
    drinkRefillCount: number; adultPrice: number; child120Price: number;
    drinkRefillPrice: number; totalPrice: number;
  } | null;
  foodTotal: number;
  billTotal: number;
  grandTotal: number;
  // Pass either qrDataUrl (already generated) or qrCode (will generate from code)
  qrDataUrl?: string;
  qrCode?: string;
  qrPoints: number;
  qrMaxUses: number;
  qrHours: number;
}

export default function ReceiptContent({ data }: { data: ReceiptData }) {
  const {
    tableNumber, paidAt, aggregatedItems, bill,
    foodTotal, billTotal, grandTotal,
    qrDataUrl: initialQrUrl, qrCode,
    qrPoints, qrMaxUses, qrHours,
  } = data;

  const [qrUrl, setQrUrl] = useState(initialQrUrl || '');

  // Generate QR from code if no data URL provided
  useEffect(() => {
    if (!initialQrUrl && qrCode) {
      const scanUrl = `${window.location.origin}/loyalty/scan?code=${qrCode}`;
      QRCode.toDataURL(scanUrl, { width: 260, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrUrl(url))
        .catch(() => {});
    }
  }, [initialQrUrl, qrCode]);

  const dateStr = paidAt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const solidLine = <div style={{ borderTop: '1px solid #374151', margin: '10px 0' }} />;
  const dashedLine = <div style={{ borderTop: '1px dashed #9ca3af', margin: '10px 0' }} />;

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .receipt-print-root { display: block !important; position: fixed; inset: 0; background: #fff; overflow: auto; }
        }
      `}</style>
      <div
        className="receipt-print-root"
        style={{ background: '#fff', color: '#111', fontFamily: "'Courier New', Courier, monospace", fontSize: 13, padding: '20px 20px 14px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, marginBottom: 2 }}>TUATAK SHABU</div>
          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
            หน้าปั้ม ปตท. ถนนเส้นแจ้งพัฒนา จ.ปราจีนบุรี<br />
            โทร: 095-395-5532
          </div>
        </div>

        {solidLine}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
          <span style={{ color: '#6b7280' }}>โต๊ะ</span>
          <span style={{ fontWeight: 700 }}>{tableNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
          <span style={{ color: '#6b7280' }}>วันที่</span>
          <span>{dateStr}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#6b7280' }}>เวลา</span>
          <span>{timeStr}</span>
        </div>

        {dashedLine}

        {/* Food items */}
        {aggregatedItems.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>รายการอาหาร</div>
            {aggregatedItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nameTh}</span>
                <span style={{ color: '#6b7280', flexShrink: 0 }}>x{item.quantity}</span>
                <span style={{ flexShrink: 0, fontWeight: 500 }}>฿{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 4, borderTop: '1px dotted #d1d5db', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>รวมอาหาร</span>
              <span style={{ fontWeight: 600 }}>฿{foodTotal.toLocaleString()}</span>
            </div>
            {dashedLine}
          </>
        )}

        {/* Buffet */}
        {bill && billTotal > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>บุฟเฟ่ต์</div>
            {bill.adultCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span>ผู้ใหญ่ {bill.adultCount} คน × ฿{bill.adultPrice}</span>
                <span style={{ fontWeight: 500 }}>฿{(bill.adultCount * bill.adultPrice).toLocaleString()}</span>
              </div>
            )}
            {bill.child120Count > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span>เด็ก (&gt;120cm) {bill.child120Count} คน × ฿{bill.child120Price}</span>
                <span style={{ fontWeight: 500 }}>฿{(bill.child120Count * bill.child120Price).toLocaleString()}</span>
              </div>
            )}
            {bill.child100Count > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span>เด็กเล็ก (100–120cm) {bill.child100Count} คน</span>
                <span style={{ fontWeight: 500, color: '#6b7280' }}>ฟรี</span>
              </div>
            )}
            {bill.drinkRefillCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span>เครื่องดื่มรีฟิล {bill.drinkRefillCount} แก้ว × ฿{bill.drinkRefillPrice}</span>
                <span style={{ fontWeight: 500 }}>฿{(bill.drinkRefillCount * bill.drinkRefillPrice).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 4, borderTop: '1px dotted #d1d5db', fontSize: 12 }}>
              <span style={{ color: '#6b7280' }}>รวมบุฟเฟ่ต์</span>
              <span style={{ fontWeight: 600 }}>฿{billTotal.toLocaleString()}</span>
            </div>
            {dashedLine}
          </>
        )}

        {/* Grand total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '2px solid #111', borderBottom: '2px solid #111' }}>
          <span style={{ fontSize: 15, fontWeight: 900 }}>รวมทั้งหมด</span>
          <span style={{ fontSize: 18, fontWeight: 900 }}>฿{grandTotal.toLocaleString()}</span>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', margin: '10px 0 4px' }}>ชำระเงินเรียบร้อย ✓</div>

        {/* QR Code */}
        {(qrUrl || qrCode) && qrPoints > 0 && (
          <>
            {dashedLine}
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>⭐ สะสมแต้มลอยัลตี้</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 1.6 }}>
                รับ <b style={{ color: '#000' }}>{qrPoints} แต้ม</b> · ใช้ได้{qrMaxUses > 0 ? ` ${qrMaxUses} คน` : 'ไม่จำกัด'}<br />
                หมดอายุใน {qrHours} ชั่วโมง · สแกนได้คนละ 1 ครั้ง
              </div>
              {qrUrl
                ? <img src={qrUrl} alt="QR" style={{ width: 160, height: 160, display: 'block', margin: '0 auto', borderRadius: 8, border: '2px solid #e5e7eb', padding: 4 }} />
                : <div style={{ width: 160, height: 160, background: '#f3f4f6', borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9ca3af' }}>กำลังโหลด...</div>
              }
            </div>
            {dashedLine}
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 10, lineHeight: 1.8 }}>
          ขอบคุณที่ใช้บริการ 🙏<br />
          <span style={{ letterSpacing: 2 }}>TUATAK SHABU</span>
        </div>
      </div>
    </>
  );
}
