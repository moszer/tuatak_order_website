import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

const PRINTER_HOST = process.env.POS_PRINTER_HOST || '172.20.10.6';
const PRINTER_PORT = parseInt(process.env.POS_PRINTER_PORT || '9100');

// ESC/POS commands
const ESC = '\x1b';
const GS  = '\x1d';
const INIT         = ESC + '\x40';
const ALIGN_LEFT   = ESC + '\x61\x00';
const ALIGN_CENTER = ESC + '\x61\x01';
const BOLD_ON      = ESC + '\x45\x01';
const BOLD_OFF     = ESC + '\x45\x00';
const SIZE_NORMAL  = ESC + '\x21\x00';
const SIZE_LARGE   = ESC + '\x21\x11'; // double width+height
const CUT          = GS  + '\x56\x41\x05'; // partial cut with feed

const CHARS = 32;

function pad(left: string, right: string): string {
  const spaces = CHARS - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

function center(text: string): string {
  const p = Math.max(0, Math.floor((CHARS - text.length) / 2));
  return ' '.repeat(p) + text;
}

function line(char = '-'): string { return char.repeat(CHARS); }

interface PrintPayload {
  tableNumber: string;
  paidAt: string;
  aggregatedItems: { nameTh: string; price: number; quantity: number }[];
  bill: {
    adultCount: number; child120Count: number; child100Count: number;
    drinkRefillCount: number; adultPrice: number; child120Price: number;
    drinkRefillPrice: number;
  } | null;
  foodTotal: number;
  billTotal: number;
  grandTotal: number;
  qrCode?: string;
  qrPoints: number;
  qrMaxUses: number;
  qrHours: number;
}

function buildEscPos(d: PrintPayload): Buffer {
  const paidAt = new Date(d.paidAt);
  const dateStr = paidAt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const cmd: string[] = [];

  const push = (s: string) => cmd.push(s);

  push(INIT);
  push('\x1b\x74\x00'); // code page PC437 — switch to UTF-8 via ESC/POS if printer supports
  push('\x1c\x26');     // kanji/utf8 mode on (some printers)

  // Header
  push(ALIGN_CENTER + BOLD_ON + SIZE_LARGE);
  push('TUATAK SHABU\n');
  push(SIZE_NORMAL + BOLD_OFF);
  push('หน้าปั้ม ปตท. เส้นแจ้งพัฒนา\n');
  push('จ.ปราจีนบุรี  095-395-5532\n');
  push(line('=') + '\n');

  // Info
  push(ALIGN_LEFT);
  push(pad('โต๊ะ', d.tableNumber) + '\n');
  push(pad('วันที่', dateStr) + '\n');
  push(pad('เวลา', timeStr) + '\n');
  push(line() + '\n');

  // Food items
  if (d.aggregatedItems.length > 0) {
    push(BOLD_ON + center('-- รายการอาหาร --') + BOLD_OFF + '\n');
    for (const item of d.aggregatedItems) {
      const name = item.nameTh.length > 18 ? item.nameTh.slice(0, 17) + '.' : item.nameTh;
      const qty  = `x${item.quantity}`;
      const amt  = `${(item.price * item.quantity).toLocaleString()}`;
      const mid  = CHARS - name.length - amt.length;
      push(name + ' '.repeat(Math.max(1, mid - qty.length)) + qty + amt + '\n');
    }
    push(pad('รวมอาหาร', d.foodTotal.toLocaleString()) + '\n');
    push(line() + '\n');
  }

  // Buffet
  if (d.bill && d.billTotal > 0) {
    push(BOLD_ON + center('-- บุฟเฟ่ต์ --') + BOLD_OFF + '\n');
    if (d.bill.adultCount > 0)
      push(pad(`ผู้ใหญ่ ${d.bill.adultCount}x${d.bill.adultPrice}`, (d.bill.adultCount * d.bill.adultPrice).toLocaleString()) + '\n');
    if (d.bill.child120Count > 0)
      push(pad(`เด็ก>120 ${d.bill.child120Count}x${d.bill.child120Price}`, (d.bill.child120Count * d.bill.child120Price).toLocaleString()) + '\n');
    if (d.bill.child100Count > 0)
      push(pad(`เด็กเล็ก ${d.bill.child100Count} คน`, 'ฟรี') + '\n');
    if (d.bill.drinkRefillCount > 0)
      push(pad(`รีฟิล ${d.bill.drinkRefillCount}x${d.bill.drinkRefillPrice}`, (d.bill.drinkRefillCount * d.bill.drinkRefillPrice).toLocaleString()) + '\n');
    push(pad('รวมบุฟเฟ่ต์', d.billTotal.toLocaleString()) + '\n');
    push(line() + '\n');
  }

  // Grand total
  push(BOLD_ON + SIZE_LARGE);
  push(pad('รวมทั้งหมด', `${d.grandTotal.toLocaleString()} บาท`) + '\n');
  push(SIZE_NORMAL + BOLD_OFF);
  push(line('=') + '\n');
  push(ALIGN_CENTER + center('** ชำระเงินแล้ว **') + '\n');

  // QR loyalty (text only — no image)
  if (d.qrCode && d.qrPoints > 0) {
    push(line() + '\n');
    push(BOLD_ON + center('* สะสมแต้มลอยัลตี้ *') + BOLD_OFF + '\n');
    push(center(`รับ ${d.qrPoints} แต้ม`) + '\n');
    push(center(`ใช้ได้${d.qrMaxUses > 0 ? `${d.qrMaxUses} คน` : 'ไม่จำกัด'} | หมดใน ${d.qrHours} ชม.`) + '\n');

    // ESC/POS QR code
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://172.20.10.6:3000'}/loyalty/scan?code=${d.qrCode}`;
    const urlBytes = Buffer.from(url, 'utf8');
    const pL = (urlBytes.length + 3) & 0xff;
    const pH = ((urlBytes.length + 3) >> 8) & 0xff;

    push('\n');
    // Model 2
    push(GS + '\x28\x6b\x04\x00\x31\x41\x32\x00');
    // Size (6 = ~2cm modules)
    push(GS + '\x28\x6b\x03\x00\x31\x43\x06');
    // Error correction level H
    push(GS + '\x28\x6b\x03\x00\x31\x45\x33');
    // Store data
    cmd.push(GS + '\x28\x6b');
    cmd.push(String.fromCharCode(pL, pH));
    cmd.push('\x31\x50\x30');
    cmd.push(url);
    // Print
    push(GS + '\x28\x6b\x03\x00\x31\x51\x30');
    push('\n');
    push(line() + '\n');
  }

  // Footer
  push(ALIGN_CENTER);
  push(center('ขอบคุณที่ใช้บริการ') + '\n');
  push(BOLD_ON + center('TUATAK SHABU') + BOLD_OFF + '\n');
  push('\n\n\n');
  push(CUT);

  return Buffer.from(cmd.join(''), 'utf8');
}

function sendToPrinter(data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Printer connection timeout'));
    }, 6000);

    client.connect(PRINTER_PORT, PRINTER_HOST, () => {
      client.write(data, (err) => {
        if (err) { clearTimeout(timeout); client.destroy(); reject(err); return; }
        client.end();
        clearTimeout(timeout);
        resolve();
      });
    });
    client.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload: PrintPayload = await req.json();
    const escData = buildEscPos(payload);
    await sendToPrinter(escData);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
