// Web Bluetooth ESC/POS printing utility
// Works on: Chrome/Edge on Android & Desktop — NOT iOS Safari

/* eslint-disable @typescript-eslint/no-explicit-any */
type BLEChar   = any;
type BLEServer = any;

// Known BLE printer service/characteristic pairs (tried in order)
const BLE_PROFILES = [
  { service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', rx: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' }, // Nordic UART
  { service: '000018f0-0000-1000-8000-00805f9b34fb', rx: '00002af1-0000-1000-8000-00805f9b34fb' }, // common Chinese
  { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', rx: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' }, // Epson/Star BLE
  { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', rx: '49535343-8841-43f4-a8d4-ecbe34729bb3' }, // ISSC BLE Serial
  { service: '0000ff00-0000-1000-8000-00805f9b34fb', rx: '0000ff02-0000-1000-8000-00805f9b34fb' }, // some Chinese printers
];

const CHUNK = 200; // bytes per BLE write (conservative MTU)
const DELAY = 50;  // ms between chunks

// ── ESC/POS builder (browser-side, uses Uint8Array) ─────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;
const enc = new TextEncoder();

class EscBuilder {
  private parts: Uint8Array[] = [];

  text(s: string) { this.parts.push(enc.encode(s)); return this; }
  byte(...b: number[]) { this.parts.push(new Uint8Array(b)); return this; }

  // Convenience ESC/POS commands
  init()         { return this.byte(ESC, 0x40); }
  alignLeft()    { return this.byte(ESC, 0x61, 0x00); }
  alignCenter()  { return this.byte(ESC, 0x61, 0x01); }
  boldOn()       { return this.byte(ESC, 0x45, 0x01); }
  boldOff()      { return this.byte(ESC, 0x45, 0x00); }
  sizeLarge()    { return this.byte(ESC, 0x21, 0x11); }
  sizeNormal()   { return this.byte(ESC, 0x21, 0x00); }
  cut()          { return this.byte(GS,  0x56, 0x41, 0x05); }
  nl()           { return this.text('\n'); }

  qr(url: string) {
    const urlBytes = enc.encode(url);
    const len = urlBytes.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;
    // model 2, size 4, error M, store data, print
    this.byte(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.byte(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04);
    this.byte(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    this.byte(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    this.parts.push(urlBytes);
    this.byte(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  build(): Uint8Array {
    const total = this.parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of this.parts) { out.set(p, off); off += p.length; }
    return out;
  }
}

const CHARS = 32;
function pad(left: string, right: string) {
  return left + ' '.repeat(Math.max(1, CHARS - left.length - right.length)) + right;
}
function rAlign(right: string) {
  return ' '.repeat(Math.max(0, CHARS - right.length)) + right;
}
function line(c = '-') { return c.repeat(CHARS); }

export interface BTPrintData {
  tableNumber: string;
  paidAt: Date;
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

export function buildBTEscPos(d: BTPrintData, appUrl = ''): Uint8Array {
  const dateStr = d.paidAt.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.paidAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const b = new EscBuilder();
  b.init().byte(0x1c, 0x26); // enable multi-byte

  // Header
  b.alignCenter().boldOn().sizeLarge().text('TUATAK SHABU\n').sizeNormal().boldOff();
  b.text('หน้าปั้ม ปตท. เส้นแจ้งพัฒนา\n');
  b.text('จ.ปราจีนบุรี  095-395-5532\n');
  b.text(line('=') + '\n');

  // Info
  b.alignLeft();
  b.text(pad('โต๊ะ', d.tableNumber) + '\n');
  b.text(pad('วันที่', dateStr) + '\n');
  b.text(pad('เวลา', timeStr) + '\n');

  // Food items
  if (d.aggregatedItems.length > 0) {
    b.text(line() + '\n');
    b.alignCenter().boldOn().text('-- รายการอาหาร --').boldOff().nl().alignLeft();
    for (const item of d.aggregatedItems) {
      b.text(item.nameTh + '\n');
      const qty = `x${item.quantity}`;
      const amt = item.price > 0 ? (item.price * item.quantity).toLocaleString() : '';
      b.text(rAlign(amt ? `${qty}   ${amt}` : qty) + '\n');
    }
    b.text(line('-') + '\n');
    b.boldOn().text(pad('รวมอาหาร', d.foodTotal > 0 ? d.foodTotal.toLocaleString() : '-')).boldOff().nl();
  }

  // Buffet
  if (d.bill && d.billTotal > 0) {
    b.text(line() + '\n');
    b.alignCenter().boldOn().text('-- บุฟเฟ่ต์ --').boldOff().nl().alignLeft();
    const billItem = (label: string, amt: string) => { b.text(label + '\n').text(rAlign(amt) + '\n'); };
    if (d.bill.adultCount > 0)
      billItem(`ผู้ใหญ่  ${d.bill.adultCount} คน x ${d.bill.adultPrice}`, (d.bill.adultCount * d.bill.adultPrice).toLocaleString());
    if (d.bill.child120Count > 0)
      billItem(`เด็ก(>120)  ${d.bill.child120Count} คน x ${d.bill.child120Price}`, (d.bill.child120Count * d.bill.child120Price).toLocaleString());
    if (d.bill.child100Count > 0)
      billItem(`เด็กเล็ก  ${d.bill.child100Count} คน`, 'ฟรี');
    if (d.bill.drinkRefillCount > 0)
      billItem(`รีฟิล  ${d.bill.drinkRefillCount} แก้ว x ${d.bill.drinkRefillPrice}`, (d.bill.drinkRefillCount * d.bill.drinkRefillPrice).toLocaleString());
    b.text(line('-') + '\n');
    b.boldOn().text(pad('รวมบุฟเฟ่ต์', d.billTotal.toLocaleString())).boldOff().nl();
  }

  // Grand total
  b.text(line('=') + '\n');
  b.boldOn().sizeLarge().text(pad('รวมทั้งหมด', `${d.grandTotal.toLocaleString()} บาท`)).nl().sizeNormal().boldOff();
  b.text(line('=') + '\n');
  b.alignCenter().text('** ชำระเงินแล้ว **\n');

  // QR loyalty
  if (d.qrCode && d.qrPoints > 0) {
    const url = `${appUrl}/loyalty/scan?code=${d.qrCode}`;
    b.text(line() + '\n');
    b.boldOn().text('* สะสมแต้มลอยัลตี้ *').boldOff().nl();
    b.text(`รับ ${d.qrPoints} แต้ม\n`);
    const uses = d.qrMaxUses > 0 ? `${d.qrMaxUses} คน` : 'ไม่จำกัด';
    b.text(`ใช้ได้ ${uses}  |  หมดใน ${d.qrHours} ชม.\n\n`);
    b.qr(url).nl();
    b.text(line() + '\n');
  }

  // Footer
  b.alignCenter().text('ขอบคุณที่ใช้บริการ\n');
  b.boldOn().text('TUATAK SHABU').boldOff().nl();
  b.text('\n\n\n').cut();

  return b.build();
}

async function writeChunked(char: BLEChar, data: Uint8Array): Promise<void> {
  const c = char;
  const useNoResponse = char.properties.writeWithoutResponse;

  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    if (useNoResponse && c.writeValueWithoutResponse) {
      await c.writeValueWithoutResponse(chunk);
    } else if (c.writeValueWithResponse) {
      await c.writeValueWithResponse(chunk);
    } else {
      await c.writeValue(chunk); // deprecated fallback
    }
    if (i + CHUNK < data.length) await new Promise(r => setTimeout(r, DELAY));
  }
}

async function getWriteCharacteristic(server: BLEServer): Promise<BLEChar> {
  // Try known profiles
  for (const profile of BLE_PROFILES) {
    try {
      const svc = await server.getPrimaryService(profile.service);
      const char = await svc.getCharacteristic(profile.rx);
      return char;
    } catch { /* try next */ }
  }

  // Fallback: scan all services for any writable characteristic
  try {
    const services = await server.getPrimaryServices();
    for (const svc of services) {
      try {
        const chars = await svc.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) return c;
        }
      } catch { /* continue */ }
    }
  } catch { /* ignore */ }

  throw new Error('ไม่พบ characteristic สำหรับพิมพ์ — กรุณาตรวจสอบว่าเครื่องปริ้นรองรับ BLE');
}

export async function printViaBluetooth(data: Uint8Array): Promise<void> {
  if (!('bluetooth' in navigator)) {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth\nกรุณาใช้ Chrome หรือ Edge บน Android / Desktop');
  }

  const serviceUUIDs = BLE_PROFILES.map(p => p.service);

  const bt = (navigator as any).bluetooth;
  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: serviceUUIDs,
  });

  if (!device.gatt) throw new Error('อุปกรณ์นี้ไม่รองรับ GATT');

  const server = await device.gatt.connect();
  await new Promise(r => setTimeout(r, 300)); // wait for connection to stabilize

  const char = await getWriteCharacteristic(server);
  await writeChunked(char, data);
  await new Promise(r => setTimeout(r, 200));
  device.gatt.disconnect();
}
