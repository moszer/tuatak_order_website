'use client';

import { useEffect, useState, useRef } from 'react';
import { Order } from '@/lib/mysql';
import Swal from 'sweetalert2';
import QRCode from 'qrcode';
import ReceiptContent, { ReceiptData } from '@/app/admin/components/ReceiptContent';

interface OrderWithId extends Order {
  _id: string;
  bill?: {
    adultCount: number;
    child120Count: number;
    child100Count: number;
    drinkRefillCount: number;
    adultPrice: number;
    child120Price: number;
    drinkRefillPrice: number;
    totalPrice: number;
  } | null;
}


export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithId[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithId | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [soundEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [tableBills, setTableBills] = useState<Record<string, any>>({});
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    setLastUpdate(new Date());
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    previousOrderIdsRef.current = new Set();
    isInitialFetchRef.current = true;
    fetchOrders();

    intervalRef.current = setInterval(() => {
      if (!document.hidden) fetchOrders(true);
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchOrders(true);
        intervalRef.current = setInterval(() => {
          if (!document.hidden) fetchOrders(true);
        }, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [filterStatus]);

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('/notify.mp3');
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const fetchTableBills = async () => {
    try {
      const response = await fetch('/api/tables/bill');
      const data = await response.json();
      if (data.success && data.bills) {
        const billsMap: Record<string, any> = {};
        data.bills.forEach((bill: any) => {
          billsMap[bill.tableNumber] = {
            adultCount: bill.adultCount || 0,
            child120Count: bill.child120Count || 0,
            child100Count: bill.child100Count || 0,
            drinkRefillCount: bill.drinkRefillCount || 0,
            adultPrice: parseFloat(bill.adultPrice || 199),
            child120Price: parseFloat(bill.child120Price || 130),
            drinkRefillPrice: parseFloat(bill.drinkRefillPrice || 39),
            totalPrice: parseFloat(bill.totalPrice || 0),
          };
        });
        setTableBills(billsMap);
      }
    } catch (error) {
      console.error('Error fetching table bills:', error);
    }
  };

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      await fetchTableBills();

      const url = filterStatus === 'all' ? '/api/orders' : `/api/orders?status=${filterStatus}`;
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();
      const newOrders: OrderWithId[] = data.orders || [];

      if (newOrders.length > 0) {
        const newOrderIds = new Set(newOrders.map(o => o._id));

        if (isInitialFetchRef.current) {
          // First load after page open/reload — just seed the set, no notification
          isInitialFetchRef.current = false;
        } else {
          const hasNewOrder = Array.from(newOrderIds).some(id => !previousOrderIdsRef.current.has(id));

          if (hasNewOrder) {
            if (soundEnabled) playNotificationSound();

            const newOrderList = newOrders.filter(order => !previousOrderIdsRef.current.has(order._id));

            newOrderList.forEach(order => {
              const orderItems = order.items.slice(0, 3).map(item =>
                `${item.nameTh} x${item.quantity}`
              ).join(', ');
              const moreItems = order.items.length > 3 ? ` และอีก ${order.items.length - 3} รายการ` : '';
              const timeStr = new Date(order.createdAt).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              });

              Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: `🆕 คำสั่งซื้อใหม่! โต๊ะ ${order.tableNumber}`,
                html: `
                  <div style="text-align: left; font-size: 0.9rem; color: #a1a1a1; margin-top: 8px;">
                    <div style="margin-bottom: 4px;">
                      ${order.items.length} รายการ • ฿${order.totalPrice.toLocaleString()}
                    </div>
                    <div style="color: #fff; font-weight: 500;">
                      ${orderItems}${moreItems}
                    </div>
                    <div style="margin-top: 4px; font-size: 0.85rem; color: #737373;">
                      ${timeStr}
                    </div>
                  </div>
                `,
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
                background: '#1a1a1a',
                color: '#fff',
                iconColor: '#10b981',
                didOpen: (toast) => {
                  toast.style.cursor = 'pointer';
                  toast.addEventListener('click', () => {
                    setSelectedOrder(order);
                    Swal.close();
                  });
                },
              });
            });
          }
        }

      }

      previousOrderIdsRef.current = new Set(newOrders.map(o => o._id));

      setOrders(prevOrders => {
        if (prevOrders.length !== newOrders.length) return newOrders;
        if (prevOrders.length === 0) return newOrders;

        const prevSignature = prevOrders
          .map(o => `${o._id}:${o.status}:${new Date(o.updatedAt).getTime()}`)
          .sort().join('|');
        const newSignature = newOrders
          .map(o => `${o._id}:${o.status}:${new Date(o.updatedAt).getTime()}`)
          .sort().join('|');

        if (prevSignature !== newSignature) return newOrders;
        return prevOrders;
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (response.ok) {
        fetchOrders();
        setSelectedOrder(null);
      } else {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to update order status',
          confirmButtonColor: '#ef4444',
        });
        console.error('Update error:', data);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'Error updating order status: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        fetchOrders();
        setOrderToDelete(null);
      } else {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to delete order',
          confirmButtonColor: '#ef4444',
        });
        console.error('Delete error:', data);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'Error deleting order: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const handleCheckBill = async (tableNumber: string, grandTotal: number, billTotal: number, foodTotal: number, personCount: number) => {
    // ── Step 1: QR loyalty settings ──────────────────────────────────────────
    const qrStep = await Swal.fire({
      title: `⭐ สะสมแต้ม — โต๊ะ ${tableNumber}`,
      html: `
        <div style="text-align:left; font-size:0.9rem; color:#d1d5db; line-height:2;">
          <div style="margin-bottom:12px; color:#9ca3af;">
            จะสร้าง QR Code ให้ลูกค้าสแกนสะสมแต้ม<br/>
            <b style="color:#fbbf24;">ใช้ได้คนละ 1 ครั้ง · ${personCount > 0 ? `จำกัด ${personCount} คน (ตามจำนวนในบิล)` : 'ไม่จำกัดจำนวน'}</b>
          </div>
          <label style="display:block; font-size:0.78rem; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">จำนวนแต้ม</label>
          <input id="swal-pts" type="number" min="1" max="9999" value="10"
            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #374151;background:#111827;color:#f9fafb;font-size:1rem;box-sizing:border-box;margin-bottom:14px;" />
          <label style="display:block; font-size:0.78rem; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">หมดอายุ (ชั่วโมง)</label>
          <input id="swal-hrs" type="number" min="1" max="72" value="2"
            style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #374151;background:#111827;color:#f9fafb;font-size:1rem;box-sizing:border-box;" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'สร้าง QR →',
      cancelButtonText: 'ข้าม',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#374151',
      reverseButtons: true,
      preConfirm: () => {
        const pts = parseInt((document.getElementById('swal-pts') as HTMLInputElement).value);
        const hrs = parseFloat((document.getElementById('swal-hrs') as HTMLInputElement).value);
        if (!pts || pts < 1) { Swal.showValidationMessage('กรุณาใส่จำนวนแต้มที่ถูกต้อง'); return false; }
        if (!hrs || hrs < 0.1) { Swal.showValidationMessage('กรุณาใส่ชั่วโมงที่ถูกต้อง'); return false; }
        return { pts, hrs };
      },
    });

    // ── Step 2: Confirm bill ──────────────────────────────────────────────────
    const result = await Swal.fire({
      icon: 'question',
      title: 'สรุปบิลโต๊ะ ' + tableNumber,
      html: `
        <div style="text-align: left; font-size: 1rem; line-height: 1.8;">
          <div>💰 บิลบุฟเฟ่ต์: ฿${billTotal.toLocaleString()}</div>
          <div>🍽️ รวมอาหาร: ฿${foodTotal.toLocaleString()}</div>
          <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 10px 0;" />
          <div style="font-weight: 600; font-size: 1.1rem;">💵 รวมทั้งหมด: ฿${grandTotal.toLocaleString()}</div>
        </div>
        <div style="margin-top: 15px; color: #a1a1a1; font-size: 0.9rem;">
          ต้องการเช็คบิล ปิดโต๊ะ และลบคำสั่งซื้อทั้งหมดหรือไม่?
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ยืนยันเช็คบิล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    // ── Step 3: Process bill + generate QR ───────────────────────────────────
    try {
      // Capture data BEFORE deleting
      const tableOrdersBefore = orders.filter(o => o.tableNumber === tableNumber);
      const tableBillBefore = tableBills[tableNumber] || null;
      const paidAt = new Date();

      // Aggregate items across all orders
      const itemMap = new Map<number, { id: number; nameTh: string; name: string; price: number; quantity: number }>();
      for (const order of tableOrdersBefore) {
        for (const item of order.items) {
          if (itemMap.has(item.id)) {
            itemMap.get(item.id)!.quantity += item.quantity;
          } else {
            itemMap.set(item.id, { id: item.id, nameTh: item.nameTh, name: item.name, price: item.price, quantity: item.quantity });
          }
        }
      }
      const aggregatedItems = Array.from(itemMap.values());

      const deletePromises = tableOrdersBefore.map(order => fetch(`/api/orders/${order._id}`, { method: 'DELETE' }));
      await Promise.all(deletePromises);

      await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber,
          foodRevenue: foodTotal,
          buffetRevenue: billTotal,
          totalRevenue: grandTotal,
          ordersCount: tableOrdersBefore.length,
          paymentMethod: 'cash',
          notes: `เช็คบิลโต๊ะ ${tableNumber}`,
        }),
      });

      await fetch(`/api/tables/bill?table=${tableNumber}`, { method: 'DELETE' });

      await fetch('/api/tables/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber, isReady: false }),
      });

      await fetchOrders();

      // Generate loyalty QR if admin chose to
      let qrDataUrl = '';
      let qrCodeStr = '';
      let qrPoints = 0;
      let qrMaxUses = 0;
      let qrHours = 0;
      if (qrStep.isConfirmed && qrStep.value) {
        const { pts, hrs } = qrStep.value;
        qrPoints = pts; qrHours = hrs; qrMaxUses = personCount;
        try {
          const qrRes = await fetch('/api/loyalty/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              points_value: pts,
              label: `โต๊ะ ${tableNumber} — เช็คบิล ฿${grandTotal.toLocaleString()}`,
              expires_hours: hrs,
              max_uses: personCount > 0 ? personCount : 0,
            }),
          });
          const qrData = await qrRes.json();
          if (qrRes.ok && qrData.qrCode) {
            qrCodeStr = qrData.qrCode.code;
            const scanUrl = `${window.location.origin}/loyalty/scan?code=${qrCodeStr}`;
            qrDataUrl = await QRCode.toDataURL(scanUrl, {
              width: 260, margin: 2,
              color: { dark: '#000000', light: '#ffffff' },
            });
          }
        } catch (qrErr) {
          console.error('QR generation failed:', qrErr);
        }
      }

      const receipt: ReceiptData = {
        tableNumber, paidAt, aggregatedItems,
        bill: tableBillBefore,
        foodTotal, billTotal, grandTotal,
        qrDataUrl, qrCode: qrCodeStr || undefined,
        qrPoints, qrMaxUses, qrHours,
      };

      // Save receipt log to DB (fire-and-forget)
      fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber, paidAt: paidAt.toISOString(),
          items: aggregatedItems,
          bill: tableBillBefore,
          foodTotal, billTotal, grandTotal,
          qrCode: qrCodeStr || null,
          qrPoints, qrMaxUses, qrHours,
        }),
      }).catch(() => {});

      setReceiptData(receipt);
    } catch (error) {
      console.error('Error checking bill:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'เกิดข้อผิดพลาดในการเช็คบิล: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const calculateExpectedBillTotal = (bill: any) => {
    if (!bill) return 0;
    const adultTotal = (bill.adultCount || 0) * (bill.adultPrice || 199);
    const child120Total = (bill.child120Count || 0) * (bill.child120Price || 130);
    const drinkTotal = (bill.drinkRefillCount || 0) * (bill.drinkRefillPrice || 39);
    return adultTotal + child120Total + drinkTotal;
  };

  const isManualTotal = (bill: any) => {
    if (!bill || !bill.totalPrice) return false;
    const expectedTotal = calculateExpectedBillTotal(bill);
    return Math.abs(bill.totalPrice - expectedTotal) > 0.01;
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  // ─── STATUS CONFIG ────────────────────────────────────────────────────────────
  const STATUS_CONFIG = {
    pending:   { label: 'รอดำเนินการ',  color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)' },
    preparing: { label: 'กำลังเตรียม',  color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.2)' },
    ready:     { label: 'พร้อมเสิร์ฟ',  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)' },
    served:    { label: 'เสิร์ฟแล้ว',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)' },
    paid:      { label: 'ชำระเงินแล้ว', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
  };

  // ─── GROUP ORDERS BY TABLE ────────────────────────────────────────────────────
  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const tableGroups = filteredOrders.reduce<Record<string, OrderWithId[]>>((acc, order) => {
    const tbl = String(order.tableNumber);
    if (!acc[tbl]) acc[tbl] = [];
    acc[tbl].push(order);
    return acc;
  }, {});

  const tableNumbers = Object.keys(tableGroups).sort((a, b) => Number(a) - Number(b));

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', padding: isMobile ? '16px' : '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes ord-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ord-fade {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ord-card {
          background: #111827;
          border: 1px solid #1a2332;
          border-radius: 12px;
          transition: border-color 0.15s;
        }
        .ord-card:hover {
          border-color: #334155;
        }
        .ord-order-row {
          background: #0d1117;
          border: 1px solid #1a2332;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.15s;
          animation: ord-fade 0.2s ease;
        }
        .ord-order-row:hover {
          border-color: #334155;
        }
        .ord-filter-btn {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #1a2332;
          background: transparent;
          color: #64748b;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          font-family: inherit;
        }
        .ord-filter-btn:hover {
          border-color: #334155;
          color: #94a3b8;
        }
        .ord-filter-btn.active {
          background: #1e293b;
          color: #f1f5f9;
          font-weight: 600;
          border-color: #334155;
        }
        .ord-status-btn {
          width: 100%;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid #1a2332;
          background: #111827;
          color: #94a3b8;
          font-size: 0.9rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
          font-family: inherit;
        }
        .ord-status-btn:hover {
          border-color: #334155;
          color: #f1f5f9;
        }
        .ord-status-btn.current {
          border-color: currentColor;
          font-weight: 600;
        }
        .ord-action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #1e293b;
          background: transparent;
          color: #64748b;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }
        .ord-action-btn:hover {
          background: #1e293b;
          color: #94a3b8;
        }
        .ord-action-btn.danger {
          border-color: rgba(239,68,68,0.3);
          color: #ef4444;
        }
        .ord-action-btn.danger:hover {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.5);
        }
      `}</style>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
            คำสั่งซื้อ
          </h1>
          <p style={{ color: '#475569', fontSize: '0.78rem', margin: '4px 0 0' }}>
            {lastUpdate
              ? `อัปเดตล่าสุด ${lastUpdate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'กำลังโหลด...'}
          </p>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          title="รีเฟรช"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            border: '1px solid #1e293b',
            background: 'transparent',
            borderRadius: 8,
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1e293b';
            (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: isRefreshing ? 'ord-spin 0.8s linear infinite' : 'none' }}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          รีเฟรช
        </button>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 28,
      }}>
        {/* Pending */}
        <div className="ord-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f97316', lineHeight: 1 }}>{pendingCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>รอดำเนินการ</div>
          </div>
        </div>

        {/* Preparing */}
        <div className="ord-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(234,179,8,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#eab308', lineHeight: 1 }}>{preparingCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>กำลังเตรียม</div>
          </div>
        </div>

        {/* Ready */}
        <div className="ord-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{readyCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>พร้อมเสิร์ฟ</div>
          </div>
        </div>

        {/* Total */}
        <div className="ord-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6', lineHeight: 1 }}>{orders.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>คำสั่งซื้อทั้งหมด</div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 16 }}>
          {([
            { key: 'all',      label: 'ทั้งหมด',       count: orders.length },
            { key: 'pending',  label: 'รอดำเนินการ',   count: orders.filter(o => o.status === 'pending').length },
            { key: 'preparing',label: 'กำลังเตรียม',   count: orders.filter(o => o.status === 'preparing').length },
            { key: 'ready',    label: 'พร้อมเสิร์ฟ',   count: orders.filter(o => o.status === 'ready').length },
            { key: 'served',   label: 'เสิร์ฟแล้ว',    count: orders.filter(o => o.status === 'served').length },
            { key: 'paid',     label: 'ชำระเงินแล้ว',  count: orders.filter(o => o.status === 'paid').length },
          ] as { key: string; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              className={`ord-filter-btn${filterStatus === key ? ' active' : ''}`}
              onClick={() => setFilterStatus(key)}
            >
              {label}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 6,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: filterStatus === key ? '#334155' : '#1a2332',
                color: filterStatus === key ? '#f1f5f9' : '#64748b',
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '0 5px',
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: '#1a2332' }} />
      </div>

      {/* ── LOADING STATE ───────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #1e293b',
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            animation: 'ord-spin 0.8s linear infinite',
          }} />
          <span style={{ color: '#475569', fontSize: '0.9rem' }}>กำลังโหลดคำสั่งซื้อ...</span>
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────────────────────────────────── */}
      {!loading && tableNumbers.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#111827', border: '1px solid #1a2332', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
          </div>
          <div style={{ color: '#475569', fontSize: '0.95rem', fontWeight: 500 }}>ไม่มีคำสั่งซื้อ</div>
          <div style={{ color: '#334155', fontSize: '0.82rem' }}>
            {filterStatus === 'all' ? 'ยังไม่มีคำสั่งซื้อเข้ามา' : `ไม่มีคำสั่งซื้อที่มีสถานะ "${STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label ?? filterStatus}"`}
          </div>
        </div>
      )}

      {/* ── ORDERS LIST (grouped by table) ─────────────────────────────────────── */}
      {!loading && tableNumbers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tableNumbers.map(tableNum => {
            const tableOrders = tableGroups[tableNum];
            const tableBill = tableBills[tableNum] || null;
            const foodTotal = tableOrders.reduce((sum, o) => sum + o.totalPrice, 0);
            const billTotal = tableBill ? (tableBill.totalPrice || calculateExpectedBillTotal(tableBill)) : 0;
            const tableGrandTotal = foodTotal + billTotal;
            const manual = tableBill ? isManualTotal(tableBill) : false;
            const personCount = tableBill ? (tableBill.adultCount || 0) + (tableBill.child120Count || 0) + (tableBill.child100Count || 0) : 0;

            return (
              <div key={tableNum} className="ord-card" style={{ padding: 20 }}>
                {/* TABLE HEADER */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottom: '1px solid #1a2332',
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>
                      โต๊ะ {tableNum}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                      background: '#1a2332',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      padding: '2px 8px',
                      fontWeight: 500,
                    }}>
                      {tableOrders.length} คำสั่งซื้อ
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>
                    ฿{tableGrandTotal.toLocaleString()}
                  </span>
                </div>

                {/* BUFFET BILL SECTION */}
                {tableBill && (
                  <div style={{
                    background: '#0a0f1a',
                    border: '1px solid #1a2332',
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 16,
                  }}>
                    {/* Bill header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#8b5cf6' }}>บิลบุฟเฟ่ต์</span>
                      {manual && (
                        <span style={{
                          fontSize: '0.68rem',
                          color: '#f97316',
                          background: 'rgba(249,115,22,0.1)',
                          border: '1px solid rgba(249,115,22,0.2)',
                          borderRadius: 6,
                          padding: '1px 6px',
                          fontWeight: 600,
                        }}>
                          ปรับด้วยตนเอง
                        </span>
                      )}
                    </div>

                    {/* Breakdown items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                      {tableBill.adultCount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: '#64748b' }}>ผู้ใหญ่ {tableBill.adultCount} คน × ฿{tableBill.adultPrice}</span>
                          <span style={{ color: '#94a3b8' }}>฿{(tableBill.adultCount * tableBill.adultPrice).toLocaleString()}</span>
                        </div>
                      )}
                      {tableBill.child120Count > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: '#64748b' }}>เด็ก (ส่วนสูง &gt;120 ซม.) {tableBill.child120Count} คน × ฿{tableBill.child120Price}</span>
                          <span style={{ color: '#94a3b8' }}>฿{(tableBill.child120Count * tableBill.child120Price).toLocaleString()}</span>
                        </div>
                      )}
                      {tableBill.child100Count > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: '#64748b' }}>เด็กเล็ก (ส่วนสูง 100–120 ซม.) {tableBill.child100Count} คน</span>
                          <span style={{ color: '#94a3b8' }}>ฟรี</span>
                        </div>
                      )}
                      {tableBill.drinkRefillCount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: '#64748b' }}>เครื่องดื่มรีฟิล {tableBill.drinkRefillCount} แก้ว × ฿{tableBill.drinkRefillPrice}</span>
                          <span style={{ color: '#94a3b8' }}>฿{(tableBill.drinkRefillCount * tableBill.drinkRefillPrice).toLocaleString()}</span>
                        </div>
                      )}
                      {manual && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ color: '#f97316' }}>ยอดรวมที่กำหนดเอง</span>
                          <span style={{ color: '#f97316', fontWeight: 600 }}>฿{tableBill.totalPrice.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Total row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #1a2332',
                      paddingTop: 8,
                      marginBottom: 12,
                    }}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>รวมบิล</span>
                      <span style={{ fontSize: '0.9rem', color: '#8b5cf6', fontWeight: 700 }}>฿{billTotal.toLocaleString()}</span>
                    </div>

                    {/* Check Bill button */}
                    <button
                      onClick={() => handleCheckBill(tableNum, tableGrandTotal, billTotal, foodTotal, personCount)}
                      style={{
                        width: '100%',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 0',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#059669')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#10b981')}
                    >
                      เช็คบิล ฿{tableGrandTotal.toLocaleString()}
                    </button>
                  </div>
                )}

                {/* ORDERS LIST */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tableOrders.map(order => {
                    const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG];
                    const orderTime = new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={order._id} className="ord-order-row" style={{ padding: 14 }}>
                        {/* Top row: time + status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: '0.75rem', color: '#475569' }}>{orderTime}</span>
                          {cfg && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                              borderRadius: 10,
                              padding: '2px 10px',
                            }}>
                              {cfg.label}
                            </span>
                          )}
                        </div>

                        {/* Items list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                          {order.items.map((item, idx) => (
                            <div key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                  {item.nameTh} × {item.quantity}
                                </span>
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                  ฿{(item.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                              {item.comment && (
                                <div style={{ fontSize: '0.72rem', color: '#f97316', marginTop: 1, paddingLeft: 4 }}>
                                  {item.comment}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Bottom row: total + actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1a2332', paddingTop: 10 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>
                            ฿{order.totalPrice.toLocaleString()}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="ord-action-btn"
                              onClick={() => setSelectedOrder(order)}
                            >
                              อัปเดตสถานะ
                            </button>
                            <button
                              className="ord-action-btn danger"
                              onClick={() => setOrderToDelete(order)}
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── STATUS UPDATE MODAL ──────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0d1117',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              animation: 'ord-fade 0.2s ease',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>อัปเดตสถานะ</div>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>โต๊ะ {selectedOrder.tableNumber}</div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: '1px solid #1e293b',
                  background: 'transparent',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Status buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => {
                const isCurrent = selectedOrder.status === key;
                return (
                  <button
                    key={key}
                    className={`ord-status-btn${isCurrent ? ' current' : ''}`}
                    style={isCurrent ? {
                      color: cfg.color,
                      background: cfg.bg,
                      borderColor: cfg.border,
                    } : {}}
                    onClick={() => updateOrderStatus(selectedOrder._id, key as Order['status'])}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{cfg.label}</span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>สถานะปัจจุบัน</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cancel */}
            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                width: '100%',
                padding: '10px 0',
                border: '1px solid #1e293b',
                background: 'transparent',
                borderRadius: 8,
                color: '#475569',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#111827';
                (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#475569';
              }}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────────── */}
      {orderToDelete && (
        <div
          onClick={() => setOrderToDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0d1117',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              animation: 'ord-fade 0.2s ease',
            }}
          >
            {/* Warning icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>ยืนยันการลบ</div>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>การกระทำนี้ไม่สามารถย้อนกลับได้</div>
              </div>
            </div>

            {/* Order details */}
            <div style={{
              background: '#111827',
              border: '1px solid #1a2332',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: 6 }}>รายละเอียดคำสั่งซื้อ</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>โต๊ะ {orderToDelete.tableNumber}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {orderToDelete.items.slice(0, 3).map(i => `${i.nameTh} ×${i.quantity}`).join(', ')}
                {orderToDelete.items.length > 3 && ` และอีก ${orderToDelete.items.length - 3} รายการ`}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444', marginTop: 8 }}>
                ฿{orderToDelete.totalPrice.toLocaleString()}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setOrderToDelete(null)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: '1px solid #1e293b',
                  background: 'transparent',
                  borderRadius: 8,
                  color: '#475569',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#111827';
                  (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = '#475569';
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteOrder(orderToDelete._id)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: '#ef4444',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Receipt Modal ─────────────────────────────────────────────────── */}
      {receiptData && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
          onClick={() => setReceiptData(null)}
        >
          <style>{`
            @media print {
              body > * { display: none !important; }
              #receipt-print-area { display: block !important; position: fixed; inset: 0; background: #fff; }
            }
            #receipt-print-area { display: none; }
          `}</style>

          {/* Print-only area */}
          <div id="receipt-print-area">
            <ReceiptContent data={receiptData} />
          </div>

          {/* Screen modal */}
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
          >
            <ReceiptContent data={receiptData} />
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px', background: '#fff' }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: '#111827', color: '#f9fafb', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                พิมพ์ใบเสร็จ
              </button>
              <button
                onClick={() => setReceiptData(null)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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

