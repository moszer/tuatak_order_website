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
  qrDataUrl?: string;
  qrCode?: string;
  qrPoints: number;
  qrMaxUses: number;
  qrHours: number;
}

const CHARS = 32; // characters per line at 12px Courier on 80mm

function padLine(left: string, right: string): string {
  const spaces = CHARS - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

function centerText(text: string): string {
  const pad = Math.max(0, Math.floor((CHARS - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function divider(char = '-'): string {
  return char.repeat(CHARS);
}

export default function ReceiptContent({ data }: { data: ReceiptData }) {
  const {
    tableNumber, paidAt, aggregatedItems, bill,
    foodTotal, billTotal, grandTotal,
    qrDataUrl: initialQrUrl, qrCode,
    qrPoints, qrMaxUses, qrHours,
  } = data;

  const [qrUrl, setQrUrl] = useState(initialQrUrl || '');

  useEffect(() => {
    if (!initialQrUrl && qrCode) {
      const scanUrl = `${window.location.origin}/loyalty/scan?code=${qrCode}`;
      QRCode.toDataURL(scanUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrUrl(url))
        .catch(() => {});
    }
  }, [initialQrUrl, qrCode]);

  const dateStr = paidAt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const pre: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 12,
    lineHeight: 1.55,
    margin: 0,
    whiteSpace: 'pre',
    color: '#000',
  };

  return (
    <div style={{
      background: '#fff',
      width: 302,           /* 80mm at 96dpi */
      margin: '0 auto',
      padding: '14px 10px',
      boxSizing: 'border-box',
      fontFamily: "'Courier New', Courier, monospace",
      color: '#000',
    }}>
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>

      {/* Header */}
      <pre style={{ ...pre, textAlign: 'center', fontWeight: 'bold', fontSize: 15, letterSpacing: 2, marginBottom: 2 }}>TUATAK SHABU</pre>
      <pre style={{ ...pre, textAlign: 'center', fontSize: 11 }}>หน้าปั้ม ปตท. เส้นแจ้งพัฒนา</pre>
      <pre style={{ ...pre, textAlign: 'center', fontSize: 11 }}>จ.ปราจีนบุรี  095-395-5532</pre>
      <pre style={pre}>{divider('=')}</pre>

      {/* Info */}
      <pre style={pre}>{padLine('โต๊ะ', tableNumber)}</pre>
      <pre style={pre}>{padLine('วันที่', dateStr)}</pre>
      <pre style={pre}>{padLine('เวลา', timeStr)}</pre>
      <pre style={pre}>{divider()}</pre>

      {/* Food items */}
      {aggregatedItems.length > 0 && (
        <>
          <pre style={{ ...pre, fontWeight: 'bold' }}>{centerText('-- รายการอาหาร --')}</pre>
          {aggregatedItems.map(item => {
            const name = item.nameTh.length > 18 ? item.nameTh.slice(0, 17) + '.' : item.nameTh;
            const qty = `x${item.quantity}`;
            const amt = `${(item.price * item.quantity).toLocaleString()}`;
            const mid = CHARS - name.length - amt.length;
            const line = name + ' '.repeat(Math.max(1, mid - qty.length)) + qty + ' '.repeat(0) + amt;
            return <pre key={item.id} style={pre}>{line}</pre>;
          })}
          <pre style={pre}>{padLine('รวมอาหาร', `${foodTotal.toLocaleString()}`)}</pre>
          <pre style={pre}>{divider()}</pre>
        </>
      )}

      {/* Buffet */}
      {bill && billTotal > 0 && (
        <>
          <pre style={{ ...pre, fontWeight: 'bold' }}>{centerText('-- บุฟเฟ่ต์ --')}</pre>
          {bill.adultCount > 0 && (
            <pre style={pre}>{padLine(`ผู้ใหญ่ ${bill.adultCount}x${bill.adultPrice}`, `${(bill.adultCount * bill.adultPrice).toLocaleString()}`)}</pre>
          )}
          {bill.child120Count > 0 && (
            <pre style={pre}>{padLine(`เด็ก>120 ${bill.child120Count}x${bill.child120Price}`, `${(bill.child120Count * bill.child120Price).toLocaleString()}`)}</pre>
          )}
          {bill.child100Count > 0 && (
            <pre style={pre}>{padLine(`เด็กเล็ก ${bill.child100Count} คน`, 'ฟรี')}</pre>
          )}
          {bill.drinkRefillCount > 0 && (
            <pre style={pre}>{padLine(`รีฟิล ${bill.drinkRefillCount}x${bill.drinkRefillPrice}`, `${(bill.drinkRefillCount * bill.drinkRefillPrice).toLocaleString()}`)}</pre>
          )}
          <pre style={pre}>{padLine('รวมบุฟเฟ่ต์', `${billTotal.toLocaleString()}`)}</pre>
          <pre style={pre}>{divider()}</pre>
        </>
      )}

      {/* Grand total */}
      <pre style={{ ...pre, fontWeight: 'bold', fontSize: 14 }}>{padLine('รวมทั้งหมด', `${grandTotal.toLocaleString()} บาท`)}</pre>
      <pre style={pre}>{divider('=')}</pre>
      <pre style={{ ...pre, textAlign: 'center' }}>{centerText('** ชำระเงินแล้ว **')}</pre>

      {/* QR loyalty */}
      {(qrUrl || qrCode) && qrPoints > 0 && (
        <>
          <pre style={pre}>{divider()}</pre>
          <pre style={{ ...pre, textAlign: 'center', fontWeight: 'bold' }}>{centerText('* สะสมแต้มลอยัลตี้ *')}</pre>
          <pre style={{ ...pre, textAlign: 'center' }}>{centerText(`รับ ${qrPoints} แต้ม`)}</pre>
          <pre style={{ ...pre, textAlign: 'center', fontSize: 10 }}>{centerText(`ใช้ได้${qrMaxUses > 0 ? `${qrMaxUses} คน` : 'ไม่จำกัด'} | หมดใน ${qrHours} ชม.`)}</pre>
          {qrUrl
            ? <img src={qrUrl} alt="QR" style={{ width: 140, height: 140, display: 'block', margin: '8px auto' }} />
            : <div style={{ textAlign: 'center', fontSize: 10, padding: '8px 0', fontFamily: 'Courier New' }}>กำลังโหลด QR...</div>
          }
          <pre style={pre}>{divider()}</pre>
        </>
      )}

      {/* Footer */}
      <pre style={{ ...pre, textAlign: 'center', marginTop: 4 }}>{centerText('ขอบคุณที่ใช้บริการ')}</pre>
      <pre style={{ ...pre, textAlign: 'center', letterSpacing: 3 }}>{centerText('TUATAK SHABU')}</pre>
    </div>
  );
}
