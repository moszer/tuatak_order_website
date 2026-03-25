'use client';

import { useEffect, useState, useRef } from 'react';
import { Order } from '@/lib/mysql';
import Swal from 'sweetalert2';

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [tableBills, setTableBills] = useState<Record<string, any>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    setLastUpdate(new Date());
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    previousOrderIdsRef.current = new Set();
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (frequency: number, duration: number, startTime: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      playTone(523.25, 0.2, 0);
      playTone(659.25, 0.3, 0.15);
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
        console.log('Table bills fetched:', billsMap);
      } else {
        console.log('No bills found or API error');
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

      console.log('Fetched orders:', newOrders);
      console.log('Orders count:', newOrders.length);
      newOrders.forEach(order => {
        console.log(`Order ${order._id} - Table ${order.tableNumber}:`, {
          hasBill: !!order.bill,
          bill: order.bill,
        });
      });

      if (newOrders.length > 0) {
        const newOrderIds = new Set(newOrders.map(o => o._id));
        const previousSize = previousOrderIdsRef.current.size;

        const isFirstOrder = previousSize === 0 && newOrders.length > 0;
        const hasNewOrder = previousSize > 0 && Array.from(newOrderIds).some(id => !previousOrderIdsRef.current.has(id));

        if (isFirstOrder || hasNewOrder) {
          if (soundEnabled) playNotificationSound();

          const newOrderList = newOrders.filter(order =>
            previousSize === 0 || !previousOrderIdsRef.current.has(order._id)
          );

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

  const handleCheckBill = async (tableNumber: string, grandTotal: number, billTotal: number, foodTotal: number) => {
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

    if (result.isConfirmed) {
      try {
        const deletePromises = orders
          .filter(order => order.tableNumber === tableNumber)
          .map(order => fetch(`/api/orders/${order._id}`, { method: 'DELETE' }));
        await Promise.all(deletePromises);

        await fetch('/api/cashflow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableNumber,
            foodRevenue: foodTotal,
            buffetRevenue: billTotal,
            totalRevenue: grandTotal,
            ordersCount: orders.filter(order => order.tableNumber === tableNumber).length,
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

        await Swal.fire({
          icon: 'success',
          title: 'เช็คบิลเสร็จสิ้น!',
          html: `
            <div style="text-align: center; font-size: 1rem; line-height: 1.8;">
              <div style="font-size: 1.2rem; font-weight: 600; color: #10b981; margin-bottom: 10px;">
                รวมทั้งหมด: ฿${grandTotal.toLocaleString()}
              </div>
              <div>โต๊ะ ${tableNumber} ถูกปิดแล้ว</div>
              <div>คำสั่งซื้อทั้งหมดถูกลบแล้ว</div>
            </div>
          `,
          confirmButtonColor: '#10b981',
          confirmButtonText: 'ตกลง',
        });
      } catch (error) {
        console.error('Error checking bill:', error);
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: 'เกิดข้อผิดพลาดในการเช็คบิล: ' + (error instanceof Error ? error.message : 'Unknown error'),
          confirmButtonColor: '#ef4444',
        });
      }
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

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: '#FF6B4A',
      preparing: '#FFA500',
      ready: '#4CAF50',
      served: '#2196F3',
      paid: '#9C27B0',
    };
    return colors[status] || '#666';
  };

  const getStatusLabel = (status: Order['status']) => {
    const labels = {
      pending: 'รอดำเนินการ',
      preparing: 'กำลังเตรียม',
      ready: 'พร้อมเสิร์ฟ',
      served: 'เสิร์ฟแล้ว',
      paid: 'ชำระเงินแล้ว',
    };
    return labels[status];
  };

  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.totalPrice, 0);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @media (max-width: 768px) {
            .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
            .admin-stat-card { padding: 16px !important; }
            .admin-filter-buttons { flex-wrap: wrap; gap: 6px !important; }
            .admin-order-card { padding: 14px !important; border-radius: 12px !important; }
          }
          @media (max-width: 480px) {
            .admin-stats-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          }
        `
      }} />

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? '12px' : '20px',
        marginBottom: isMobile ? '24px' : '32px',
      }} className="admin-stats-grid">
        <div style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderRadius: '16px', padding: isMobile ? '20px' : '28px',
          border: '1px solid rgba(249, 115, 22, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
        }}
        className="admin-stat-card"
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(249, 115, 22, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'; }}
        >
          <div style={{ color: '#f97316', fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 700, marginBottom: '12px', lineHeight: '1', textShadow: '0 2px 8px rgba(249, 115, 22, 0.3)' }}>
            {pendingCount}
          </div>
          <div style={{ color: '#d1d5db', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 600, letterSpacing: '0.3px' }}>
            ⏳ รอดำเนินการ
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderRadius: '16px', padding: isMobile ? '20px' : '28px',
          border: '1px solid rgba(234, 179, 8, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(234, 179, 8, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'; }}
        >
          <div style={{ color: '#eab308', fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 700, marginBottom: '12px', lineHeight: '1', textShadow: '0 2px 8px rgba(234, 179, 8, 0.3)' }}>
            {preparingCount}
          </div>
          <div style={{ color: '#d1d5db', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 600, letterSpacing: '0.3px' }}>
            🔥 กำลังเตรียม
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderRadius: '16px', padding: isMobile ? '20px' : '28px',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'; }}
        >
          <div style={{ color: '#10b981', fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 700, marginBottom: '12px', lineHeight: '1', textShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}>
            {readyCount}
          </div>
          <div style={{ color: '#d1d5db', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 600, letterSpacing: '0.3px' }}>
            ✅ พร้อมเสิร์ฟ
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderRadius: '16px', padding: isMobile ? '20px' : '28px',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'; }}
        >
          <div style={{ color: '#a855f7', fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: 700, marginBottom: '12px', lineHeight: '1', textShadow: '0 2px 8px rgba(168, 85, 247, 0.3)' }}>
            ฿{totalRevenue.toLocaleString()}
          </div>
          <div style={{ color: '#d1d5db', fontSize: isMobile ? '0.85rem' : '0.95rem', fontWeight: 600, letterSpacing: '0.3px' }}>
            💰 รายได้รวม
          </div>
        </div>
      </div>

      {/* Filter and Refresh */}
      <div style={{
        marginBottom: isMobile ? '24px' : '32px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? '12px' : '16px',
        background: 'rgba(26, 26, 26, 0.6)',
        padding: isMobile ? '16px' : '20px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, auto)',
          gap: isMobile ? '8px' : '10px',
          width: '100%',
        }}>
          {['all', 'pending', 'preparing', 'ready', 'served', 'paid'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: isMobile ? '10px 12px' : '12px 20px',
                borderRadius: '10px',
                border: filterStatus === status ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                background: filterStatus === status
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: filterStatus === status ? '#fff' : '#d1d5db',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: filterStatus === status ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                transform: filterStatus === status ? 'translateY(-2px)' : 'none',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => { if (filterStatus !== status) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; } }}
              onMouseLeave={(e) => { if (filterStatus !== status) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; } }}
            >
              {status === 'all' ? 'ทั้งหมด' : getStatusLabel(status as Order['status'])}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchOrders()}
          disabled={loading || isRefreshing}
          style={{
            padding: isMobile ? '12px 16px' : '14px 28px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: (loading || isRefreshing) ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
            color: (loading || isRefreshing) ? '#737373' : '#10b981',
            cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            fontWeight: 600,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: (loading || isRefreshing) ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.2)',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          <span style={{ display: 'inline-block', animation: isRefreshing ? 'spin 1s linear infinite' : 'none', fontSize: '1.1rem' }}>🔄</span>
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'white', padding: '40px', fontSize: '1.2rem' }}>
          กำลังโหลด...
        </div>
      ) : (
        <div>
          {(() => {
            const ordersByTable: Record<string, OrderWithId[]> = {};
            orders.forEach(order => {
              if (!ordersByTable[order.tableNumber]) ordersByTable[order.tableNumber] = [];
              ordersByTable[order.tableNumber].push(order);
            });

            console.log('Orders by table:', ordersByTable);
            console.log('Table bills:', tableBills);
            const allTableNumbers = new Set([...Object.keys(ordersByTable), ...Object.keys(tableBills)]);
            console.log('All table numbers:', Array.from(allTableNumbers));

            const tableNumbers = Array.from(allTableNumbers).sort((a, b) => {
              const numA = parseInt(a) || 0;
              const numB = parseInt(b) || 0;
              return numA - numB;
            });

            if (tableNumbers.length === 0) {
              return (
                <div style={{ textAlign: 'center', color: '#8B7355', padding: '40px', fontSize: '1.1rem' }}>
                  ไม่มีคำสั่งซื้อ
                </div>
              );
            }

            return (
              <div style={{ display: 'grid', gap: isMobile ? '20px' : '28px' }}>
                {tableNumbers.map((tableNum) => {
                  const tableOrders = (ordersByTable[tableNum] || []).filter(order =>
                    order.items && order.items.length > 0
                  );
                  const tableBill = tableOrders[0]?.bill || tableBills[tableNum];

                  if (tableOrders.length === 0 && !tableBill) return null;

                  const tableTotalFood = tableOrders.reduce((sum, o) => sum + o.totalPrice, 0);
                  const tableTotalBill = tableBill?.totalPrice || 0;
                  const tableGrandTotal = tableTotalFood + tableTotalBill;

                  return (
                    <div
                      key={tableNum}
                      style={{
                        background: '#1a1a1a', borderRadius: '16px', padding: '24px',
                        border: '1px solid #2a2a2a', transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; }}
                    >
                      {/* Table Header */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #2a2a2a',
                      }}>
                        <div>
                          <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: '4px' }}>
                            🪑 โต๊ะ {tableNum}
                          </h3>
                          <p style={{ color: '#737373', fontSize: '0.85rem', margin: 0 }}>
                            {tableOrders.length > 0 ? `${tableOrders.length} คำสั่งซื้อ` : 'รอคำสั่งซื้อ'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700 }}>
                            ฿{tableGrandTotal.toLocaleString()}
                          </div>
                          <div style={{ color: '#737373', fontSize: '0.8rem' }}>รวมทั้งหมด</div>
                        </div>
                      </div>

                      {/* Table Bill Summary */}
                      {tableBill && (() => {
                        const expectedTotal = calculateExpectedBillTotal(tableBill);
                        const isManual = isManualTotal(tableBill);
                        const calculatedBreakdown = {
                          adult: (tableBill.adultCount || 0) * (tableBill.adultPrice || 199),
                          child120: (tableBill.child120Count || 0) * (tableBill.child120Price || 130),
                          drink: (tableBill.drinkRefillCount || 0) * (tableBill.drinkRefillPrice || 39),
                        };

                        return (
                          <div style={{
                            marginBottom: '20px', padding: '16px', background: '#262626',
                            borderRadius: '12px',
                            border: isManual ? '1px solid #f97316' : '1px solid #333',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <div style={{ color: '#a855f7', fontSize: '1rem', fontWeight: 600 }}>💰 บิลบุฟเฟ่ต์</div>
                              {isManual && (
                                <div style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(249, 115, 22, 0.2)', border: '1px solid #f97316', color: '#f97316', fontSize: '0.75rem', fontWeight: 600 }}>
                                  ✏️ ใส่ยอดเอง
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.85rem', color: '#a1a1a1', marginBottom: '12px' }}>
                              {tableBill.adultCount > 0 && (
                                <div>👤 ผู้ใหญ่: {tableBill.adultCount} ท่าน × ฿{tableBill.adultPrice} = ฿{calculatedBreakdown.adult.toLocaleString()}</div>
                              )}
                              {tableBill.child120Count > 0 && (
                                <div>👶 เด็ก 120cm: {tableBill.child120Count} คน × ฿{tableBill.child120Price} = ฿{calculatedBreakdown.child120.toLocaleString()}</div>
                              )}
                              {tableBill.child100Count > 0 && (
                                <div>🎁 เด็ก 100cm: {tableBill.child100Count} คน (ฟรี)</div>
                              )}
                              {tableBill.drinkRefillCount > 0 && (
                                <div>🥤 น้ำรีฟิล: {tableBill.drinkRefillCount} × ฿{tableBill.drinkRefillPrice} = ฿{calculatedBreakdown.drink.toLocaleString()}</div>
                              )}
                            </div>
                            {isManual && expectedTotal > 0 && (
                              <div style={{ padding: '8px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '6px', marginBottom: '12px', fontSize: '0.8rem', color: '#f97316' }}>
                                💡 คำนวณอัตโนมัติ: ฿{expectedTotal.toLocaleString()} → ใช้ยอด: ฿{tableBill.totalPrice.toLocaleString()}
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #333', marginBottom: '12px' }}>
                              <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600 }}>รวมบิลบุฟเฟ่ต์:</span>
                              <span style={{ color: isManual ? '#f97316' : '#a855f7', fontSize: '1.2rem', fontWeight: 700 }}>
                                ฿{tableBill.totalPrice.toLocaleString()}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckBill(tableNum, tableGrandTotal, tableBill.totalPrice, tableTotalFood);
                              }}
                              style={{
                                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                                background: '#10b981', color: 'white', cursor: 'pointer',
                                fontSize: '1rem', fontWeight: 600, transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; }}
                            >
                              ✅ เช็คบิล (฿{tableGrandTotal.toLocaleString()})
                            </button>
                          </div>
                        );
                      })()}

                      {/* Orders for this table */}
                      {tableOrders.length > 0 ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {tableOrders.map((order) => (
                            <div
                              key={order._id}
                              style={{
                                background: '#262626', borderRadius: '10px', padding: '16px',
                                border: '1px solid #333', cursor: 'pointer', transition: 'all 0.2s ease',
                              }}
                              onClick={() => setSelectedOrder(order)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                  <div style={{ color: '#737373', fontSize: '0.8rem', marginBottom: '4px' }}>
                                    คำสั่งซื้อ #{order._id}
                                  </div>
                                  <div style={{ color: '#737373', fontSize: '0.8rem' }}>
                                    {new Date(order.createdAt).toLocaleString('th-TH')}
                                  </div>
                                </div>
                                <div style={{
                                  padding: '6px 12px', borderRadius: '6px',
                                  background: getStatusColor(order.status),
                                  color: 'white', fontSize: '0.8rem', fontWeight: 600,
                                }}>
                                  {getStatusLabel(order.status)}
                                </div>
                              </div>

                              {order.items && order.items.length > 0 && (
                                <div style={{ marginBottom: '12px' }}>
                                  <div style={{ color: '#f97316', fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>
                                    🍽️ รายการอาหาร
                                  </div>
                                  {order.items.map((item, index) => (
                                    <div
                                      key={index}
                                      style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        color: '#d4d4d4', fontSize: '0.85rem', marginBottom: '6px', paddingLeft: '8px',
                                      }}
                                    >
                                      <span>
                                        {item.nameTh} x{item.quantity}
                                        {item.comment && (
                                          <span style={{ color: '#ef4444', fontSize: '0.8rem', marginLeft: '6px' }}>
                                            ({item.comment})
                                          </span>
                                        )}
                                      </span>
                                      <span>฿{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #333' }}>
                                <div>
                                  <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                                    รวมอาหาร: ฿{order.totalPrice.toLocaleString()}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px',
                                      border: '1px solid #333', background: '#262626', color: '#fff',
                                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                                    }}
                                  >
                                    อัปเดตสถานะ
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setOrderToDelete(order); }}
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px',
                                      border: '1px solid #dc2626', background: 'transparent', color: '#ef4444',
                                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                                    }}
                                  >
                                    🗑️ ลบ
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#737373', fontSize: '0.9rem' }}>
                          ยังไม่มีคำสั่งซื้อ
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Status Update Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: '#1a1a1a', borderRadius: '12px', padding: '24px',
              maxWidth: '400px', width: '100%', border: '1px solid #2a2a2a',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>
              อัปเดตสถานะคำสั่งซื้อ
            </h2>
            <p style={{ color: '#737373', marginBottom: '20px', fontSize: '0.9rem' }}>
              โต๊ะ {selectedOrder.tableNumber} - ฿{selectedOrder.totalPrice.toLocaleString()}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {(['pending', 'preparing', 'ready', 'served', 'paid'] as Order['status'][]).map((status) => (
                <button
                  key={status}
                  onClick={() => updateOrderStatus(selectedOrder._id, status)}
                  disabled={selectedOrder.status === status}
                  style={{
                    padding: '10px 16px', borderRadius: '8px',
                    border: selectedOrder.status === status ? 'none' : '1px solid #333',
                    background: selectedOrder.status === status ? getStatusColor(status) : '#262626',
                    color: selectedOrder.status === status ? 'white' : '#a1a1a1',
                    cursor: selectedOrder.status === status ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s ease',
                  }}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: '1px solid #333', background: '#262626', color: '#a1a1a1',
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500,
              }}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px',
          }}
          onClick={() => setOrderToDelete(null)}
        >
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: isMobile ? '16px' : '12px',
              padding: isMobile ? '20px' : '24px',
              maxWidth: isMobile ? '95%' : '400px',
              width: '100%', border: '1px solid #2a2a2a',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 600, marginBottom: isMobile ? '10px' : '12px' }}>
              ยืนยันการลบคำสั่งซื้อ
            </h2>
            <p style={{ color: '#737373', marginBottom: '6px', fontSize: '0.9rem' }}>
              คุณต้องการลบคำสั่งซื้อนี้หรือไม่?
            </p>
            <p style={{ color: '#fff', marginBottom: '16px', fontSize: '1rem', fontWeight: 500 }}>
              โต๊ะ {orderToDelete.tableNumber} - ฿{orderToDelete.totalPrice.toLocaleString()}
            </p>
            <p style={{ color: '#ef4444', marginBottom: '20px', fontSize: '0.85rem' }}>
              ⚠️ การกระทำนี้ไม่สามารถยกเลิกได้
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const orderId = orderToDelete._id || (orderToDelete as any).id?.toString() || '';
                  if (orderId) deleteOrder(orderId);
                }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: 'white', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: 500,
                }}
              >
                ลบ
              </button>
              <button
                onClick={() => setOrderToDelete(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '1px solid #333', background: '#262626', color: '#a1a1a1',
                  cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500,
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
