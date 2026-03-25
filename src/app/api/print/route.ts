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

// Right-align `right` at column CHARS, with `left` at start
function rAlign(right: string): string {
  return ' '.repeat(Math.max(0, CHARS - right.length)) + right;
}

function buildEscPos(d: PrintPayload): Buffer {
  const paidAt = new Date(d.paidAt);
  const dateStr = paidAt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const buf: Buffer[] = [];
  const push = (s: string) => buf.push(Buffer.from(s, 'utf8'));
  const pushBuf = (b: Buffer) => buf.push(b);

  push(INIT);
  push('\x1c\x26'); // enable multi-byte (Thai UTF-8) on some printers

  // ── Header ──────────────────────────────────────────────
  push(ALIGN_CENTER + BOLD_ON + SIZE_LARGE);
  push('TUATAK SHABU\n');
  push(SIZE_NORMAL + BOLD_OFF);
  push('หน้าปั้ม ปตท. เส้นแจ้งพัฒนา\n');
  push('จ.ปราจีนบุรี  095-395-5532\n');
  push(line('=') + '\n');

  // ── Table / Date / Time ─────────────────────────────────
  push(ALIGN_LEFT);
  push(pad('โต๊ะ', d.tableNumber) + '\n');
  push(pad('วันที่', dateStr) + '\n');
  push(pad('เวลา', timeStr) + '\n');

  // ── Food items ──────────────────────────────────────────
  if (d.aggregatedItems.length > 0) {
    push(line() + '\n');
    push(ALIGN_CENTER + BOLD_ON + '-- รายการอาหาร --' + BOLD_OFF + '\n');
    push(ALIGN_LEFT);
    for (const item of d.aggregatedItems) {
      // Line 1: item name
      push(item.nameTh + '\n');
      // Line 2: qty right, amount right  (e.g. "           x3    150")
      const qty = `x${item.quantity}`;
      const amt = item.price > 0 ? (item.price * item.quantity).toLocaleString() : '';
      const right = amt ? `${qty}   ${amt}` : qty;
      push(rAlign(right) + '\n');
    }
    push(line('-') + '\n');
    push(BOLD_ON + pad('รวมอาหาร', d.foodTotal > 0 ? d.foodTotal.toLocaleString() : '-') + BOLD_OFF + '\n');
  }

  // ── Buffet ──────────────────────────────────────────────
  if (d.bill && d.billTotal > 0) {
    push(line() + '\n');
    push(ALIGN_CENTER + BOLD_ON + '-- บุฟเฟ่ต์ --' + BOLD_OFF + '\n');
    push(ALIGN_LEFT);
    if (d.bill.adultCount > 0)
      push(pad(`ผู้ใหญ่  ${d.bill.adultCount} คน x ${d.bill.adultPrice}`, (d.bill.adultCount * d.bill.adultPrice).toLocaleString()) + '\n');
    if (d.bill.child120Count > 0)
      push(pad(`เด็ก(>120)  ${d.bill.child120Count} คน x ${d.bill.child120Price}`, (d.bill.child120Count * d.bill.child120Price).toLocaleString()) + '\n');
    if (d.bill.child100Count > 0)
      push(pad(`เด็กเล็ก  ${d.bill.child100Count} คน`, 'ฟรี') + '\n');
    if (d.bill.drinkRefillCount > 0)
      push(pad(`รีฟิล  ${d.bill.drinkRefillCount} แก้ว x ${d.bill.drinkRefillPrice}`, (d.bill.drinkRefillCount * d.bill.drinkRefillPrice).toLocaleString()) + '\n');
    push(line('-') + '\n');
    push(BOLD_ON + pad('รวมบุฟเฟ่ต์', d.billTotal.toLocaleString()) + BOLD_OFF + '\n');
  }

  // ── Grand total ─────────────────────────────────────────
  push(line('=') + '\n');
  push(BOLD_ON + SIZE_LARGE);
  push(pad('รวมทั้งหมด', `${d.grandTotal.toLocaleString()} บาท`) + '\n');
  push(SIZE_NORMAL + BOLD_OFF);
  push(line('=') + '\n');
  push(ALIGN_CENTER + '** ชำระเงินแล้ว **\n');

  // ── QR Loyalty ──────────────────────────────────────────
  if (d.qrCode && d.qrPoints > 0) {
    push(line() + '\n');
    push(BOLD_ON + '* สะสมแต้มลอยัลตี้ *' + BOLD_OFF + '\n');
    push(`รับ ${d.qrPoints} แต้ม\n`);
    const uses = d.qrMaxUses > 0 ? `${d.qrMaxUses} คน` : 'ไม่จำกัด';
    push(`ใช้ได้ ${uses}  |  หมดใน ${d.qrHours} ชม.\n\n`);

    // ESC/POS GS(k QR code — size 4 (moderate)
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://172.20.10.6:3000'}/loyalty/scan?code=${d.qrCode}`;
    const urlBuf = Buffer.from(url, 'utf8');
    const dataLen = urlBuf.length + 3;
    const pL = dataLen & 0xff;
    const pH = (dataLen >> 8) & 0xff;

    pushBuf(Buffer.from(GS + '\x28\x6b\x04\x00\x31\x41\x32\x00', 'binary')); // model 2
    pushBuf(Buffer.from(GS + '\x28\x6b\x03\x00\x31\x43\x04', 'binary'));     // size 4
    pushBuf(Buffer.from(GS + '\x28\x6b\x03\x00\x31\x45\x31', 'binary'));     // err correction M
    pushBuf(Buffer.concat([
      Buffer.from(GS + '\x28\x6b', 'binary'),
      Buffer.from([pL, pH]),
      Buffer.from('\x31\x50\x30', 'binary'),
      urlBuf,
    ]));
    pushBuf(Buffer.from(GS + '\x28\x6b\x03\x00\x31\x51\x30', 'binary'));     // print
    push('\n' + line() + '\n');
  }

  // ── Footer ──────────────────────────────────────────────
  push(ALIGN_CENTER);
  push('ขอบคุณที่ใช้บริการ\n');
  push(BOLD_ON + 'TUATAK SHABU' + BOLD_OFF + '\n');
  push('\n\n\n');
  push(CUT);

  return Buffer.concat(buf);
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
