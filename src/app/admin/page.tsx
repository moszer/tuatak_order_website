'use client';

import { useEffect, useState, useRef } from 'react';
import { Order } from '@/lib/mysql';
import { Image, ImageKitProvider, upload } from '@imagekit/next';
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
} from '@imagekit/next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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

interface MenuItem {
  id: number;
  name: string;
  nameTh: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isPopular: boolean;
  isSpicy: boolean;
  isNew: boolean;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'tables' | 'cashflow'>('orders');
  const [cashflowData, setCashflowData] = useState({
    todayRevenue: 0,
    totalRevenue: 0,
    todayFoodRevenue: 0,
    todayBuffetRevenue: 0,
    totalFoodRevenue: 0,
    totalBuffetRevenue: 0,
    todayOrdersCount: 0,
    totalOrdersCount: 0,
    todayTablesCount: 0,
  });
  const [cashflowLoading, setCashflowLoading] = useState(false);
  const [cashflowPeriod, setCashflowPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [dailyBreakdown, setDailyBreakdown] = useState<any[]>([]);
  const [tableBreakdown, setTableBreakdown] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderWithId[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tableStatuses, setTableStatuses] = useState<Record<string, boolean>>({});
  const [tableToOpen, setTableToOpen] = useState<string | null>(null);
  const [billForm, setBillForm] = useState({
    adultCount: 0,
    child120Count: 0,
    child100Count: 0,
    drinkRefillCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithId | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithId | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [tableBills, setTableBills] = useState<Record<string, any>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; order: OrderWithId; timestamp: number }>>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Reset previous order IDs when filter changes to avoid false notifications
    previousOrderIdsRef.current = new Set();
    fetchOrders();

    // Set up polling every 5 seconds
    intervalRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchOrders(true);
      }
    }, 5000);

    // Handle page visibility - pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else {
        // Resume polling when tab becomes visible
        fetchOrders(true);
        intervalRef.current = setInterval(() => {
          if (!document.hidden) {
            fetchOrders(true);
          }
        }, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [filterStatus]);

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a pleasant notification sound (two-tone chime)
      const playTone = (frequency: number, duration: number, startTime: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Fade in and out for smoother sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Play two-tone chime
      playTone(523.25, 0.2, 0); // C5
      playTone(659.25, 0.3, 0.15); // E5
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
      
      // Fetch table bills in parallel
      await fetchTableBills();
      
      const url = filterStatus === 'all' 
        ? '/api/orders' 
        : `/api/orders?status=${filterStatus}`;
      const response = await fetch(url, {
        cache: 'no-store', // Ensure fresh data
      });
      const data = await response.json();
      const newOrders: OrderWithId[] = data.orders || [];
      
      // Debug: Log orders with bills
      console.log('Fetched orders:', newOrders);
      console.log('Orders count:', newOrders.length);
      newOrders.forEach(order => {
        console.log(`Order ${order._id} - Table ${order.tableNumber}:`, {
          hasBill: !!order.bill,
          bill: order.bill
        });
      });
      
      // Detect new orders for sound notification and toast
      if (newOrders.length > 0) {
        const newOrderIds = new Set(newOrders.map(o => o._id));
        const previousSize = previousOrderIdsRef.current.size;
        
        // Check if:
        // 1. Going from 0 orders to 1+ orders (first order)
        // 2. OR there are new order IDs that weren't in the previous set
        const isFirstOrder = previousSize === 0 && newOrders.length > 0;
        const hasNewOrder = previousSize > 0 && Array.from(newOrderIds).some(id => !previousOrderIdsRef.current.has(id));
        
        if (isFirstOrder || hasNewOrder) {
          // Play sound if enabled
          if (soundEnabled) {
            playNotificationSound();
          }
          
          // Show toast for new orders
          const newOrderList = newOrders.filter(order => 
            previousSize === 0 || !previousOrderIdsRef.current.has(order._id)
          );
          
          newOrderList.forEach(order => {
            const toastId = `${order._id}-${Date.now()}`;
            setToasts(prev => [...prev, { id: toastId, order, timestamp: Date.now() }]);
            
            // Auto remove toast after 5 seconds
            setTimeout(() => {
              setToasts(prev => prev.filter(toast => toast.id !== toastId));
            }, 5000);
          });
        }
      }
      
      // Update previous order IDs
      previousOrderIdsRef.current = new Set(newOrders.map(o => o._id));
      
      // Only update if data actually changed to prevent flickering
      setOrders(prevOrders => {
        // Quick comparison: check if lengths differ
        if (prevOrders.length !== newOrders.length) {
          return newOrders;
        }
        
        // If no previous orders, just set new ones
        if (prevOrders.length === 0) {
          return newOrders;
        }
        
        // Create a simple comparison string for all orders
        const prevSignature = prevOrders
          .map(o => `${o._id}:${o.status}:${new Date(o.updatedAt).getTime()}`)
          .sort()
          .join('|');
        const newSignature = newOrders
          .map(o => `${o._id}:${o.status}:${new Date(o.updatedAt).getTime()}`)
          .sort()
          .join('|');
        
        // Only update if signatures differ (meaning data changed)
        if (prevSignature !== newSignature) {
          return newOrders;
        }
        
        // No changes, return previous orders to prevent re-render
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchOrders();
        setSelectedOrder(null);
      } else {
        alert(data.error || 'Failed to update order status');
        console.error('Update error:', data);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        fetchOrders();
        setOrderToDelete(null);
      } else {
        alert(data.error || 'Failed to delete order');
        console.error('Delete error:', data);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Menu Management Functions
  const fetchMenuItems = async () => {
    try {
      setMenuLoading(true);
      const response = await fetch('/api/menu');
      const data = await response.json();
      setMenuItems(data.menuItems || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setMenuLoading(false);
    }
  };

  const updateMenuItem = async (itemId: number, updates: Partial<MenuItem>) => {
    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        fetchMenuItems();
        setSelectedMenuItem(null);
      } else {
        alert(data.error || 'Failed to update menu item');
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert('Error updating menu item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const deleteMenuItem = async (itemId: number) => {
    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        fetchMenuItems();
      } else {
        alert(data.error || 'Failed to delete menu item');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Error deleting menu item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const addMenuItem = async (newItem: Omit<MenuItem, 'id'>) => {
    try {
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });

      const data = await response.json();

      if (response.ok) {
        fetchMenuItems();
        setShowAddMenuModal(false);
        alert('เพิ่มเมนูสำเร็จ!');
      } else {
        alert(data.error || 'Failed to add menu item');
      }
    } catch (error) {
      console.error('Error adding menu item:', error);
      alert('Error adding menu item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    if (activeTab === 'menu') {
      fetchMenuItems();
    } else if (activeTab === 'tables') {
      fetchTableStatuses();
    } else if (activeTab === 'cashflow') {
      fetchCashflowData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'cashflow') {
      fetchCashflowData();
    }
  }, [cashflowPeriod]);

  const fetchCashflowData = async () => {
    try {
      setCashflowLoading(true);
      
      // Fetch cashflow data from API
      const response = await fetch(`/api/cashflow?period=${cashflowPeriod}`);
      const data = await response.json();

      if (data.success) {
        const summary = data.summary;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's data separately
        const todayResponse = await fetch('/api/cashflow?period=today');
        const todayData = await todayResponse.json();
        const todaySummary = todayData.summary || summary;

        setCashflowData({
          todayRevenue: todaySummary.totalRevenue || 0,
          totalRevenue: summary.totalRevenue || 0,
          todayFoodRevenue: todaySummary.totalFoodRevenue || 0,
          todayBuffetRevenue: todaySummary.totalBuffetRevenue || 0,
          totalFoodRevenue: summary.totalFoodRevenue || 0,
          totalBuffetRevenue: summary.totalBuffetRevenue || 0,
          todayOrdersCount: todaySummary.totalOrdersCount || 0,
          totalOrdersCount: summary.totalOrdersCount || 0,
          todayTablesCount: todaySummary.uniqueTablesCount || 0,
        });

        setDailyBreakdown(data.dailyBreakdown || []);
        setTableBreakdown(data.tableBreakdown || []);
      }
    } catch (error) {
      console.error('Error fetching cashflow data:', error);
    } finally {
      setCashflowLoading(false);
    }
  };

  // Table Management Functions
  const fetchTableStatuses = async () => {
    try {
      setTablesLoading(true);
      const response = await fetch('/api/tables/status');
      const data = await response.json();
      if (data.success && data.tables) {
        const statusMap: Record<string, boolean> = {};
        data.tables.forEach((table: any) => {
          statusMap[table.tableNumber] = table.isReady;
        });
        setTableStatuses(statusMap);
      }
    } catch (error) {
      console.error('Error fetching table statuses:', error);
    } finally {
      setTablesLoading(false);
    }
  };

  const updateTableStatus = async (tableNumber: string, isReady: boolean) => {
    try {
      // If opening table, show popup first
      if (isReady && !tableStatuses[tableNumber]) {
        setTableToOpen(tableNumber);
        setBillForm({
          adultCount: 0,
          child120Count: 0,
          child100Count: 0,
          drinkRefillCount: 0,
        });
        return;
      }

      // If closing table, just update status
      const response = await fetch('/api/tables/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableNumber, isReady }),
      });

      const data = await response.json();

      if (response.ok) {
        setTableStatuses(prev => ({
          ...prev,
          [tableNumber]: isReady,
        }));
      } else {
        alert(data.error || 'Failed to update table status');
      }
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Error updating table status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const saveTableBill = async () => {
    if (!tableToOpen) return;

    if (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) {
      alert('กรุณาเลือกจำนวนคนอย่างน้อย 1 คน');
      return;
    }

    try {
      setSavingBill(true);
      
      // Save bill
      const billResponse = await fetch('/api/tables/bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber: tableToOpen,
          ...billForm,
        }),
      });

      const billData = await billResponse.json();

      if (!billResponse.ok) {
        alert(billData.error || 'Failed to save bill');
        return;
      }

      // Update table status to ready
      const statusResponse = await fetch('/api/tables/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableNumber: tableToOpen, isReady: true }),
      });

      const statusData = await statusResponse.json();

      if (statusResponse.ok) {
        setTableStatuses(prev => ({
          ...prev,
          [tableToOpen]: true,
        }));
        setTableToOpen(null);
        setBillForm({
          adultCount: 0,
          child120Count: 0,
          child100Count: 0,
          drinkRefillCount: 0,
        });
        // Refresh orders immediately to update the display
        await fetchOrders();
      } else {
        alert(statusData.error || 'Failed to update table status');
      }
    } catch (error) {
      console.error('Error saving table bill:', error);
      alert('Error saving table bill: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSavingBill(false);
    }
  };

  const handleCheckBill = async (tableNumber: string, grandTotal: number, billTotal: number, foodTotal: number) => {
    // Show bill summary
    const billSummary = `
📋 สรุปบิลโต๊ะ ${tableNumber}

💰 บิลบุฟเฟ่ต์: ฿${billTotal.toLocaleString()}
🍽️ รวมอาหาร: ฿${foodTotal.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
💵 รวมทั้งหมด: ฿${grandTotal.toLocaleString()}
    `;

    const confirmed = window.confirm(billSummary + '\n\nต้องการเช็คบิล ปิดโต๊ะ และลบคำสั่งซื้อทั้งหมดหรือไม่?');
    
    if (confirmed) {
      try {
        // Delete all orders for this table
        const deletePromises = orders
          .filter(order => order.tableNumber === tableNumber)
          .map(order => 
            fetch(`/api/orders/${order._id}`, {
              method: 'DELETE',
            })
          );

        await Promise.all(deletePromises);

        // Record payment before deleting
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

        // Delete table bill
        await fetch(`/api/tables/bill?table=${tableNumber}`, {
          method: 'DELETE',
        });

        // Close the table
        await updateTableStatus(tableNumber, false);

        // Refresh orders and bills
        await fetchOrders();

        alert(`✅ เช็คบิลเสร็จสิ้น\n\nรวมทั้งหมด: ฿${grandTotal.toLocaleString()}\n\nโต๊ะ ${tableNumber} ถูกปิดแล้ว\nคำสั่งซื้อทั้งหมดถูกลบแล้ว`);
      } catch (error) {
        console.error('Error checking bill:', error);
        alert('เกิดข้อผิดพลาดในการเช็คบิล: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const calculateTotal = () => {
    const adultTotal = billForm.adultCount * 199;
    const child120Total = billForm.child120Count * 130;
    const child100Total = billForm.child100Count * 0; // Free
    const drinkTotal = billForm.drinkRefillCount * 39;
    return adultTotal + child120Total + child100Total + drinkTotal;
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

  const totalRevenue = orders
    .filter(order => order.status === 'paid')
    .reduce((sum, order) => sum + order.totalPrice, 0);

  const pendingCount = orders.filter(order => order.status === 'pending').length;
  const preparingCount = orders.filter(order => order.status === 'preparing').length;
  const readyCount = orders.filter(order => order.status === 'ready').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2D2520 0%, #3D352E 100%)',
      padding: isMobile ? '16px 12px' : '40px 20px'
    }} className="admin-container">
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
          @media (max-width: 768px) {
            .admin-container {
              padding: 16px 12px !important;
            }
            .admin-top-bar {
              padding: 16px !important;
              border-radius: 12px !important;
            }
            .admin-tabs {
              width: 100%;
              justify-content: center;
            }
            .admin-tab-button {
              padding: 10px 16px !important;
              font-size: 0.9rem !important;
              flex: 1;
              min-width: 0;
            }
            .admin-status-controls {
              width: 100%;
              justify-content: space-between;
              margin-top: 12px;
            }
            .admin-stats-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
            .admin-stat-card {
              padding: 20px !important;
            }
            .admin-filter-buttons {
              flex-wrap: wrap;
              gap: 8px;
            }
            .admin-filter-button {
              padding: 8px 16px !important;
              font-size: 0.85rem !important;
            }
            .admin-table-card {
              padding: 20px !important;
              border-radius: 16px !important;
            }
            .admin-order-card {
              padding: 16px !important;
              border-radius: 12px !important;
            }
            .admin-modal {
              max-width: 95vw !important;
              padding: 24px !important;
              margin: 20px !important;
            }
          }
          @media (max-width: 480px) {
            .admin-tab-button {
              padding: 8px 12px !important;
              font-size: 0.8rem !important;
            }
            .admin-stat-card {
              padding: 16px !important;
            }
            .admin-table-card {
              padding: 16px !important;
            }
            .admin-order-card {
              padding: 12px !important;
            }
          }
        `
      }} />
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: isMobile ? '0 8px' : '0 20px'
      }}>
        {/* Top Bar with Tabs and Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '16px' : '20px 24px',
          marginBottom: isMobile ? '20px' : '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }} className="admin-top-bar">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexWrap: 'wrap',
            gap: '16px',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: isMobile ? '6px' : '8px',
              flexWrap: 'wrap',
              width: isMobile ? '100%' : 'auto'
            }} className="admin-tabs">
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 28px',
                  borderRadius: isMobile ? '10px' : '12px',
                  border: 'none',
                  background: activeTab === 'orders' 
                    ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'orders' 
                    ? '0 4px 15px rgba(255, 107, 74, 0.4)' 
                    : 'none',
                  transform: activeTab === 'orders' ? 'translateY(-2px)' : 'none',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'orders') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'orders') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                📋 คำสั่งซื้อ
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 28px',
                  borderRadius: isMobile ? '10px' : '12px',
                  border: 'none',
                  background: activeTab === 'menu' 
                    ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'menu' 
                    ? '0 4px 15px rgba(255, 107, 74, 0.4)' 
                    : 'none',
                  transform: activeTab === 'menu' ? 'translateY(-2px)' : 'none',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'menu') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'menu') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                🍽️ จัดการเมนู
              </button>
              <button
                onClick={() => setActiveTab('tables')}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 28px',
                  borderRadius: isMobile ? '10px' : '12px',
                  border: 'none',
                  background: activeTab === 'tables' 
                    ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'tables' 
                    ? '0 4px 15px rgba(255, 107, 74, 0.4)' 
                    : 'none',
                  transform: activeTab === 'tables' ? 'translateY(-2px)' : 'none',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'tables') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'tables') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                🪑 จัดการโต๊ะ
              </button>
              <button
                onClick={() => setActiveTab('cashflow')}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 28px',
                  borderRadius: isMobile ? '10px' : '12px',
                  border: 'none',
                  background: activeTab === 'cashflow' 
                    ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'cashflow' 
                    ? '0 4px 15px rgba(255, 107, 74, 0.4)' 
                    : 'none',
                  transform: activeTab === 'cashflow' ? 'translateY(-2px)' : 'none',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'cashflow') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'cashflow') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                💰 สรุปยอดเงิน
              </button>
            </div>
            
            {/* Status and Sound Control */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '12px' : '16px',
              flexWrap: 'wrap',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-end'
            }} className="admin-status-controls">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px',
                padding: isMobile ? '6px 12px' : '8px 16px',
                background: 'rgba(76, 175, 80, 0.15)',
                borderRadius: isMobile ? '8px' : '10px',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                flex: isMobile ? '1' : 'none'
              }}>
                <div style={{
                  width: isMobile ? '6px' : '8px',
                  height: isMobile ? '6px' : '8px',
                  borderRadius: '50%',
                  background: '#4CAF50',
                  boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)',
                  animation: 'pulse 2s infinite',
                  flexShrink: 0
                }} />
                <p style={{
                  color: '#4CAF50',
                  fontSize: isMobile ? '0.75rem' : '0.85rem',
                  margin: 0,
                  fontWeight: 600
                }}>
                  ออนไลน์
                </p>
                {!isMobile && (
                  <span style={{
                    color: '#8B7355',
                    fontSize: isMobile ? '0.7rem' : '0.8rem',
                    marginLeft: '4px'
                  }}>
                    {lastUpdate.toLocaleTimeString('th-TH')}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) {
                    playNotificationSound();
                  }
                }}
                style={{
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  borderRadius: isMobile ? '8px' : '10px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: soundEnabled 
                    ? 'linear-gradient(135deg, rgba(255, 107, 74, 0.3) 0%, rgba(255, 140, 105, 0.2) 100%)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '6px' : '8px',
                  boxShadow: soundEnabled ? '0 2px 8px rgba(255, 107, 74, 0.2)' : 'none',
                  minWidth: isMobile ? 'auto' : '120px',
                  justifyContent: 'center'
                }}
                title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 74, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = soundEnabled ? '0 2px 8px rgba(255, 107, 74, 0.2)' : 'none';
                }}
              >
                <span style={{ fontSize: isMobile ? '1rem' : '1.1rem' }}>{soundEnabled ? '🔔' : '🔕'}</span>
                {!isMobile && (
                  <span>{soundEnabled ? 'เปิดเสียง' : 'ปิดเสียง'}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Orders Tab Content */}
        {activeTab === 'orders' && (
          <>
        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? '1fr' 
            : 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: isMobile ? '12px' : '20px',
          marginBottom: isMobile ? '20px' : '32px'
        }} className="admin-stats-grid">
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 107, 74, 0.15) 0%, rgba(255, 140, 105, 0.1) 100%)',
            borderRadius: isMobile ? '16px' : '20px',
            padding: isMobile ? '20px' : '28px',
            border: '1px solid rgba(255, 107, 74, 0.3)',
            boxShadow: '0 8px 24px rgba(255, 107, 74, 0.15)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          className="admin-stat-card"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 107, 74, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 74, 0.15)';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 107, 74, 0.1)',
              borderRadius: '50%',
              filter: 'blur(20px)'
            }} />
            <div style={{ 
              color: '#FF6B4A', 
              fontSize: '2.5rem', 
              fontWeight: 800,
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1
            }}>
              {pendingCount}
            </div>
            <div style={{ 
              color: '#E0E0E0', 
              fontSize: '1rem', 
              fontWeight: 600,
              position: 'relative',
              zIndex: 1
            }}>
              ⏳ รอดำเนินการ
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.15) 0%, rgba(255, 193, 7, 0.1) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            boxShadow: '0 8px 24px rgba(255, 165, 0, 0.15)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 165, 0, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 165, 0, 0.15)';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 165, 0, 0.1)',
              borderRadius: '50%',
              filter: 'blur(20px)'
            }} />
            <div style={{ 
              color: '#FFA500', 
              fontSize: '2.5rem', 
              fontWeight: 800,
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1
            }}>
              {preparingCount}
            </div>
            <div style={{ 
              color: '#E0E0E0', 
              fontSize: '1rem', 
              fontWeight: 600,
              position: 'relative',
              zIndex: 1
            }}>
              🔥 กำลังเตรียม
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(129, 199, 132, 0.1) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            boxShadow: '0 8px 24px rgba(76, 175, 80, 0.15)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(76, 175, 80, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(76, 175, 80, 0.15)';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '50%',
              filter: 'blur(20px)'
            }} />
            <div style={{ 
              color: '#4CAF50', 
              fontSize: '2.5rem', 
              fontWeight: 800,
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1
            }}>
              {readyCount}
            </div>
            <div style={{ 
              color: '#E0E0E0', 
              fontSize: '1rem', 
              fontWeight: 600,
              position: 'relative',
              zIndex: 1
            }}>
              ✅ พร้อมเสิร์ฟ
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(186, 104, 200, 0.1) 100%)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid rgba(156, 39, 176, 0.3)',
            boxShadow: '0 8px 24px rgba(156, 39, 176, 0.15)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(156, 39, 176, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(156, 39, 176, 0.15)';
          }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(156, 39, 176, 0.1)',
              borderRadius: '50%',
              filter: 'blur(20px)'
            }} />
            <div style={{ 
              color: '#9C27B0', 
              fontSize: '2.2rem', 
              fontWeight: 800,
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1
            }}>
              ฿{totalRevenue.toLocaleString()}
            </div>
            <div style={{ 
              color: '#E0E0E0', 
              fontSize: '1rem', 
              fontWeight: 600,
              position: 'relative',
              zIndex: 1
            }}>
              💰 รายได้รวม
            </div>
          </div>
        </div>

        {/* Filter and Refresh */}
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
          {['all', 'pending', 'preparing', 'ready', 'served', 'paid'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: filterStatus === status 
                  ? '#FF6B4A' 
                  : 'rgba(255, 255, 255, 0.08)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
            >
              {status === 'all' ? 'ทั้งหมด' : getStatusLabel(status as Order['status'])}
            </button>
          ))}
          </div>
          <button
            onClick={() => fetchOrders()}
            disabled={loading || isRefreshing}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: (loading || isRefreshing) 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'linear-gradient(135deg, rgba(255, 107, 74, 0.2) 0%, rgba(255, 140, 105, 0.15) 100%)',
              color: 'white',
              cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              opacity: (loading || isRefreshing) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: (loading || isRefreshing) ? 'none' : '0 2px 8px rgba(255, 107, 74, 0.2)'
            }}
            onMouseEnter={(e) => {
              if (!loading && !isRefreshing) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 74, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !isRefreshing) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 74, 0.2)';
              }
            }}
          >
            <span style={{
              display: 'inline-block',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
            }}>🔄</span>
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            color: 'white',
            padding: '40px',
            fontSize: '1.2rem'
          }}>
            กำลังโหลด...
          </div>
        ) : (
          <div>
            {/* Group orders by table */}
            {(() => {
              // Group orders by tableNumber
              const ordersByTable: Record<string, OrderWithId[]> = {};
              orders.forEach(order => {
                if (!ordersByTable[order.tableNumber]) {
                  ordersByTable[order.tableNumber] = [];
                }
                ordersByTable[order.tableNumber].push(order);
              });

              // Get all table numbers from both orders and bills
              console.log('Orders by table:', ordersByTable);
              console.log('Table bills:', tableBills);
              const allTableNumbers = new Set([
                ...Object.keys(ordersByTable),
                ...Object.keys(tableBills)
              ]);
              console.log('All table numbers:', Array.from(allTableNumbers));

              const tableNumbers = Array.from(allTableNumbers).sort((a, b) => {
                const numA = parseInt(a) || 0;
                const numB = parseInt(b) || 0;
                return numA - numB;
              });

              // Show message if no tables with bills or orders
              if (tableNumbers.length === 0) {
                return (
                  <div style={{
                    textAlign: 'center',
                    color: '#8B7355',
                    padding: '40px',
                    fontSize: '1.1rem'
                  }}>
                    ไม่มีคำสั่งซื้อ
                  </div>
                );
              }

              return (
                <div style={{
                  display: 'grid',
                  gap: '24px'
                }}>
                  {tableNumbers.map((tableNum) => {
                    // Filter out orders with no items
                    const tableOrders = (ordersByTable[tableNum] || []).filter(order => 
                      order.items && order.items.length > 0
                    );
                    
                    // Get bill from orders or from tableBills state
                    const tableBill = tableOrders[0]?.bill || tableBills[tableNum];
                    
                    // Don't show table card if no orders with items and no bill
                    if (tableOrders.length === 0 && !tableBill) {
                      return null;
                    }
                    
                    const tableTotalFood = tableOrders.reduce((sum, o) => sum + o.totalPrice, 0);
                    const tableTotalBill = tableBill?.totalPrice || 0;
                    const tableGrandTotal = tableTotalFood + tableTotalBill;

                    return (
                      <div
                        key={tableNum}
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '24px',
                          padding: '28px',
                          border: '2px solid rgba(255, 107, 74, 0.3)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 107, 74, 0.3)';
                          e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.3)';
                        }}
                      >
                        {/* Table Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '20px',
                          paddingBottom: '16px',
                          borderBottom: '2px solid rgba(255, 107, 74, 0.3)'
                        }}>
                          <div>
                            <h3 style={{
                              color: 'white',
                              fontSize: '1.8rem',
                              fontWeight: 800,
                              margin: 0,
                              marginBottom: '4px'
                            }}>
                              🪑 โต๊ะ {tableNum}
                            </h3>
                            <p style={{
                              color: '#8B7355',
                              fontSize: '0.9rem',
                              margin: 0
                            }}>
                              {tableOrders.length > 0 ? `${tableOrders.length} คำสั่งซื้อ` : 'รอคำสั่งซื้อ'}
                            </p>
                          </div>
                          <div style={{
                            textAlign: 'right'
                          }}>
                            <div style={{
                              color: '#FF6B4A',
                              fontSize: '2rem',
                              fontWeight: 800
                            }}>
                              ฿{tableGrandTotal.toLocaleString()}
                            </div>
                            <div style={{
                              color: '#8B7355',
                              fontSize: '0.85rem'
                            }}>
                              รวมทั้งหมด
                            </div>
                          </div>
                        </div>

                        {/* Table Bill Summary - Show only once */}
                        {tableBill && (
                          <div style={{
                            marginBottom: '20px',
                            padding: '16px',
                            background: 'rgba(255, 107, 74, 0.15)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 107, 74, 0.3)'
                          }}>
                            <div style={{
                              color: '#FF6B4A',
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              marginBottom: '12px'
                            }}>
                              💰 บิลบุฟเฟ่ต์
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '8px',
                              fontSize: '0.9rem',
                              color: '#E0E0E0',
                              marginBottom: '12px'
                            }}>
                              {tableBill.adultCount > 0 && (
                                <div>
                                  👤 ผู้ใหญ่: {tableBill.adultCount} ท่าน × ฿{tableBill.adultPrice} = ฿{(tableBill.adultCount * tableBill.adultPrice).toLocaleString()}
                                </div>
                              )}
                              {tableBill.child120Count > 0 && (
                                <div>
                                  👶 เด็ก 120cm: {tableBill.child120Count} คน × ฿{tableBill.child120Price} = ฿{(tableBill.child120Count * tableBill.child120Price).toLocaleString()}
                                </div>
                              )}
                              {tableBill.child100Count > 0 && (
                                <div>
                                  🎁 เด็ก 100cm: {tableBill.child100Count} คน (ฟรี)
                                </div>
                              )}
                              {tableBill.drinkRefillCount > 0 && (
                                <div>
                                  🥤 น้ำรีฟิล: {tableBill.drinkRefillCount} × ฿{tableBill.drinkRefillPrice} = ฿{(tableBill.drinkRefillCount * tableBill.drinkRefillPrice).toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: '12px',
                              borderTop: '1px solid rgba(255, 107, 74, 0.2)',
                              marginBottom: '12px'
                            }}>
                              <span style={{
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 700
                              }}>
                                รวมบิลบุฟเฟ่ต์:
                              </span>
                              <span style={{
                                color: '#FF6B4A',
                                fontSize: '1.3rem',
                                fontWeight: 800
                              }}>
                                ฿{tableBill.totalPrice.toLocaleString()}
                              </span>
                            </div>
                            {/* Check Bill Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckBill(tableNum, tableGrandTotal, tableBill.totalPrice, tableTotalFood);
                              }}
                              style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                boxShadow: '0 4px 15px rgba(255, 107, 74, 0.3)',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 74, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 74, 0.3)';
                              }}
                            >
                              ✅ เช็คบิล (฿{tableGrandTotal.toLocaleString()})
                            </button>
                          </div>
                        )}

                        {/* Orders for this table */}
                        {tableOrders.length > 0 ? (
                          <div style={{
                            display: 'grid',
                            gap: '12px'
                          }}>
                            {tableOrders.map((order) => (
              <div
                key={order._id}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  willChange: 'opacity, transform'
                }}
                onClick={() => setSelectedOrder(order)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{
                      color: '#8B7355',
                      fontSize: '0.85rem',
                      marginBottom: '4px'
                    }}>
                      คำสั่งซื้อ #{order._id}
                    </div>
                    <div style={{
                      color: '#8B7355',
                      fontSize: '0.9rem'
                    }}>
                      {new Date(order.createdAt).toLocaleString('th-TH')}
                    </div>
                  </div>
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: getStatusColor(order.status),
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    {getStatusLabel(order.status)}
                  </div>
                </div>


                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div style={{
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      color: '#FF6B4A',
                      fontSize: '1rem',
                      fontWeight: 700,
                      marginBottom: '12px'
                    }}>
                      🍽️ รายการอาหาร
                    </div>
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#E0E0E0',
                          fontSize: '0.95rem',
                          marginBottom: '8px',
                          paddingLeft: '12px'
                        }}
                      >
                        <span>
                          {item.nameTh} x{item.quantity}
                          {item.comment && (
                            <span style={{ color: '#DC2626', fontSize: '0.85rem', marginLeft: '8px' }}>
                              ({item.comment})
                            </span>
                          )}
                        </span>
                        <span>฿{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div>
                    <div style={{
                      color: 'white',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      marginBottom: order.bill ? '4px' : '0'
                    }}>
                      รวมอาหาร: ฿{order.totalPrice.toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#FF6B4A',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    >
                      อัปเดตสถานะ
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#DC2626',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600
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
                          <div style={{
                            textAlign: 'center',
                            padding: '24px',
                            color: '#8B7355',
                            fontSize: '0.95rem'
                          }}>
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
          </>
        )}

        {/* Menu Management Tab Content */}
        {activeTab === 'menu' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 700
              }}>
                จัดการเมนูและราคา
              </h2>
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setShowAddMenuModal(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(255, 107, 74, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 74, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 74, 0.3)';
                  }}
                >
                  ➕ เพิ่มเมนู
                </button>
                <button
                  onClick={fetchMenuItems}
                  disabled={menuLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    cursor: menuLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    opacity: menuLoading ? 0.6 : 1
                  }}
                >
                  🔄 รีเฟรช
                </button>
              </div>
            </div>

            {menuLoading ? (
              <div style={{
                textAlign: 'center',
                color: 'white',
                padding: '40px',
                fontSize: '1.2rem'
              }}>
                กำลังโหลด...
              </div>
            ) : menuItems.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#8B7355',
                padding: '40px',
                fontSize: '1.1rem'
              }}>
                ไม่มีรายการเมนู
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: 'white',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          marginBottom: '4px'
                        }}>
                          {item.nameTh}
                        </div>
                        <div style={{
                          color: '#8B7355',
                          fontSize: '0.9rem',
                          marginBottom: '8px'
                        }}>
                          {item.name}
                        </div>
                        <div style={{
                          color: '#E0E0E0',
                          fontSize: '0.85rem',
                          marginBottom: '8px'
                        }}>
                          {item.description}
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginTop: '8px'
                        }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(255, 107, 74, 0.2)',
                            color: '#FF6B4A',
                            fontSize: '0.75rem'
                          }}>
                            {item.category}
                          </span>
                          {item.isPopular && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: 'rgba(255, 165, 0, 0.2)',
                              color: '#FFA500',
                              fontSize: '0.75rem'
                            }}>
                              ⭐ ยอดนิยม
                            </span>
                          )}
                          {item.isSpicy && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: 'rgba(255, 0, 0, 0.2)',
                              color: '#FF4444',
                              fontSize: '0.75rem'
                            }}>
                              🌶️ เผ็ด
                            </span>
                          )}
                          {item.isNew && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: 'rgba(76, 175, 80, 0.2)',
                              color: '#4CAF50',
                              fontSize: '0.75rem'
                            }}>
                              🆕 ใหม่
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '8px'
                      }}>
                        <div style={{
                          color: '#FF6B4A',
                          fontSize: '1.5rem',
                          fontWeight: 700
                        }}>
                          ฿{item.price === 0 ? '0 (บุฟเฟ่ต์)' : item.price.toLocaleString()}
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => setSelectedMenuItem(item)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#FF6B4A',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: 600
                            }}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`คุณต้องการลบ "${item.nameTh}" หรือไม่?`)) {
                                deleteMenuItem(item.id);
                              }
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#DC2626',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: 600
                            }}
                          >
                            🗑️ ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table Management Tab Content */}
        {activeTab === 'tables' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 700
              }}>
                จัดการสถานะโต๊ะ
              </h2>
              <button
                onClick={fetchTableStatuses}
                disabled={tablesLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'white',
                  cursor: tablesLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  opacity: tablesLoading ? 0.6 : 1
                }}
              >
                🔄 รีเฟรช
              </button>
            </div>

            {/* Buffet Pricing Information */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '32px'
            }}>
              <h3 style={{
                color: 'white',
                fontSize: '1.3rem',
                fontWeight: 700,
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                💰 ราคาบุฟเฟ่ต์
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 107, 74, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 107, 74, 0.3)'
                }}>
                  <div style={{
                    color: '#FF6B4A',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}>
                    👤 ราคาผู้ใหญ่
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 800
                  }}>
                    ท่านละ 199.-
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(76, 175, 80, 0.3)'
                }}>
                  <div style={{
                    color: '#4CAF50',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}>
                    🥤 น้ำรีฟิลเติมสะใจ!
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 800
                  }}>
                    39.-
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 165, 0, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 165, 0, 0.3)'
                }}>
                  <div style={{
                    color: '#FFA500',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}>
                    👶 เด็กสูงไม่เกิน 120 ซม
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    marginBottom: '4px'
                  }}>
                    เพียงราคา 130.-
                  </div>
                  <div style={{
                    color: '#E0E0E0',
                    fontSize: '0.9rem'
                  }}>
                    รวมเครื่องดื่ม
                  </div>
                </div>

                <div style={{
                  padding: '20px',
                  background: 'rgba(156, 39, 176, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(156, 39, 176, 0.3)'
                }}>
                  <div style={{
                    color: '#9C27B0',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '8px'
                  }}>
                    🎁 เด็กสูงไม่เกิน 100 ซม
                  </div>
                  <div style={{
                    color: '#4CAF50',
                    fontSize: '1.5rem',
                    fontWeight: 800
                  }}>
                    ทานฟรี!
                  </div>
                </div>
              </div>
            </div>

            {tablesLoading ? (
              <div style={{
                textAlign: 'center',
                color: 'white',
                padding: '40px',
                fontSize: '1.2rem'
              }}>
                กำลังโหลด...
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tableNum) => {
                  const tableNumber = tableNum.toString();
                  const isReady = tableStatuses[tableNumber] || false;
                  return (
                    <div
                      key={tableNum}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{
                        fontSize: '3rem',
                        marginBottom: '16px'
                      }}>
                        🪑
                      </div>
                      <div style={{
                        color: 'white',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        marginBottom: '16px'
                      }}>
                        โต๊ะ {tableNumber}
                      </div>
                      <div style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: isReady ? '#4CAF50' : '#DC2626',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        marginBottom: '16px'
                      }}>
                        {isReady ? '✓ พร้อมใช้งาน' : '✗ ยังไม่พร้อม'}
                      </div>
                      <button
                        onClick={() => updateTableStatus(tableNumber, !isReady)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: isReady ? '#DC2626' : '#4CAF50',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: 600,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {isReady ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                      {isReady && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: 'rgba(255, 107, 74, 0.1)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#FF6B4A',
                          fontWeight: 600
                        }}>
                          💰 เปิดใช้งานแล้ว
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cash Flow Summary Tab Content */}
        {activeTab === 'cashflow' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: isMobile ? '1.5rem' : '1.8rem',
                fontWeight: 800,
                margin: 0
              }}>
                💰 สรุปยอดเงิน
              </h2>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Period Selector */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  padding: '4px',
                  borderRadius: '10px'
                }}>
                  {(['today', 'week', 'month', 'all'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setCashflowPeriod(period)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: cashflowPeriod === period 
                          ? 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)' 
                          : 'transparent',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {period === 'today' ? 'วันนี้' : 
                       period === 'week' ? '7 วัน' : 
                       period === 'month' ? '30 วัน' : 'ทั้งหมด'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchCashflowData}
                  disabled={cashflowLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: cashflowLoading ? 'rgba(255, 255, 255, 0.2)' : 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                    color: 'white',
                    cursor: cashflowLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    opacity: cashflowLoading ? 0.6 : 1
                  }}
                >
                  {cashflowLoading ? 'กำลังโหลด...' : '🔄 รีเฟรช'}
                </button>
                <button
                  onClick={async () => {
                    const confirmed = window.confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรายได้ทั้งหมด?\n\nการกระทำนี้ไม่สามารถยกเลิกได้!');
                    if (confirmed) {
                      try {
                        const response = await fetch('/api/cashflow', {
                          method: 'DELETE',
                        });
                        const data = await response.json();
                        if (response.ok) {
                          alert('✅ รีเซ็ตข้อมูลรายได้เรียบร้อยแล้ว');
                          fetchCashflowData();
                        } else {
                          alert('เกิดข้อผิดพลาด: ' + (data.error || 'Unknown error'));
                        }
                      } catch (error) {
                        console.error('Error resetting cashflow:', error);
                        alert('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล');
                      }
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '2px solid #DC2626',
                    background: 'transparent',
                    color: '#DC2626',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#DC2626';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#DC2626';
                  }}
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {cashflowLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'white'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid rgba(255, 107, 74, 0.2)',
                  borderTopColor: '#FF6B4A',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: '#8B7355' }}>กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <div>
                {/* Today's Summary */}
                <div style={{
                  marginBottom: '32px'
                }}>
                  <h3 style={{
                    color: '#FF6B4A',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid rgba(255, 107, 74, 0.3)'
                  }}>
                    📅 รายได้วันนี้
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '20px',
                    marginBottom: '24px'
                  }}>
                    {/* Today Total Revenue */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 107, 74, 0.2) 0%, rgba(255, 140, 105, 0.15) 100%)',
                      padding: '24px',
                      borderRadius: '20px',
                      border: '2px solid rgba(255, 107, 74, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          boxShadow: '0 4px 12px rgba(255, 107, 74, 0.3)'
                        }}>
                          💵
                        </div>
                        <div>
                          <div style={{
                            color: '#8B7355',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}>
                            รายได้รวมวันนี้
                          </div>
                        </div>
                      </div>
                      <div style={{
                        color: '#FF6B4A',
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        marginTop: '8px'
                      }}>
                        ฿{cashflowData.todayRevenue.toLocaleString()}
                      </div>
                    </div>

                    {/* Today Orders Count */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.15) 100%)',
                      padding: '24px',
                      borderRadius: '20px',
                      border: '2px solid rgba(76, 175, 80, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
                        }}>
                          📋
                        </div>
                        <div>
                          <div style={{
                            color: '#8B7355',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}>
                            คำสั่งซื้อที่เสร็จสิ้น
                          </div>
                        </div>
                      </div>
                      <div style={{
                        color: '#4CAF50',
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        marginTop: '8px'
                      }}>
                        {cashflowData.todayOrdersCount} รายการ
                      </div>
                    </div>
                  </div>

                  {/* Today Breakdown */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '16px'
                  }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        color: '#8B7355',
                        fontSize: '0.9rem',
                        marginBottom: '8px'
                      }}>
                        🍽️ รายได้จากอาหาร
                      </div>
                      <div style={{
                        color: 'white',
                        fontSize: '1.8rem',
                        fontWeight: 700
                      }}>
                        ฿{cashflowData.todayFoodRevenue.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        color: '#8B7355',
                        fontSize: '0.9rem',
                        marginBottom: '8px'
                      }}>
                        💰 รายได้จากบุฟเฟ่ต์
                      </div>
                      <div style={{
                        color: 'white',
                        fontSize: '1.8rem',
                        fontWeight: 700
                      }}>
                        ฿{cashflowData.todayBuffetRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                {dailyBreakdown.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                      color: '#FF6B4A',
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      marginBottom: '20px',
                      paddingBottom: '12px',
                      borderBottom: '2px solid rgba(255, 107, 74, 0.3)'
                    }}>
                      📊 กราฟแสดงรายได้
                    </h3>
                    
                    {/* Daily Revenue Line Chart */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '24px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: '24px'
                    }}>
                      <h4 style={{
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        marginBottom: '20px'
                      }}>
                        📈 รายได้รายวัน
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={dailyBreakdown.slice().reverse()}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#8B7355"
                            tick={{ fill: '#8B7355', fontSize: 12 }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getDate()}/${date.getMonth() + 1}`;
                            }}
                          />
                          <YAxis 
                            stroke="#8B7355"
                            tick={{ fill: '#8B7355', fontSize: 12 }}
                            tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#2D2520',
                              border: '1px solid rgba(255, 107, 74, 0.3)',
                              borderRadius: '8px',
                              color: 'white'
                            }}
                            formatter={(value: any) => `฿${value.toLocaleString()}`}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString('th-TH', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              });
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ color: '#8B7355' }}
                            iconType="line"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="totalRevenue" 
                            stroke="#FF6B4A" 
                            strokeWidth={3}
                            dot={{ fill: '#FF6B4A', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="รายได้รวม"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="foodRevenue" 
                            stroke="#4CAF50" 
                            strokeWidth={2}
                            dot={{ fill: '#4CAF50', r: 3 }}
                            name="รายได้อาหาร"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="buffetRevenue" 
                            stroke="#2196F3" 
                            strokeWidth={2}
                            dot={{ fill: '#2196F3', r: 3 }}
                            name="รายได้บุฟเฟ่ต์"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Revenue by Type Bar Chart */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '24px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: '24px'
                    }}>
                      <h4 style={{
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        marginBottom: '20px'
                      }}>
                        📊 รายได้รายวัน (Bar Chart)
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={dailyBreakdown.slice().reverse()}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#8B7355"
                            tick={{ fill: '#8B7355', fontSize: 12 }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getDate()}/${date.getMonth() + 1}`;
                            }}
                          />
                          <YAxis 
                            stroke="#8B7355"
                            tick={{ fill: '#8B7355', fontSize: 12 }}
                            tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#2D2520',
                              border: '1px solid rgba(255, 107, 74, 0.3)',
                              borderRadius: '8px',
                              color: 'white'
                            }}
                            formatter={(value: any) => `฿${value.toLocaleString()}`}
                            labelFormatter={(label) => {
                              const date = new Date(label);
                              return date.toLocaleDateString('th-TH', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              });
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ color: '#8B7355' }}
                          />
                          <Bar 
                            dataKey="foodRevenue" 
                            fill="#4CAF50" 
                            name="รายได้อาหาร"
                            radius={[8, 8, 0, 0]}
                          />
                          <Bar 
                            dataKey="buffetRevenue" 
                            fill="#2196F3" 
                            name="รายได้บุฟเฟ่ต์"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Revenue Distribution Pie Chart */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '24px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: '24px'
                    }}>
                      <h4 style={{
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        marginBottom: '20px'
                      }}>
                        🥧 สัดส่วนรายได้ (ช่วงที่เลือก)
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'รายได้อาหาร', value: cashflowData.totalFoodRevenue },
                              { name: 'รายได้บุฟเฟ่ต์', value: cashflowData.totalBuffetRevenue }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#4CAF50" />
                            <Cell fill="#2196F3" />
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#2D2520',
                              border: '1px solid rgba(255, 107, 74, 0.3)',
                              borderRadius: '8px',
                              color: 'white'
                            }}
                            formatter={(value: any) => `฿${value.toLocaleString()}`}
                          />
                          <Legend 
                            wrapperStyle={{ color: '#8B7355' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Total Summary */}
                <div>
                  <h3 style={{
                    color: '#FF6B4A',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid rgba(255, 107, 74, 0.3)'
                  }}>
                    📊 รายได้รวมทั้งหมด
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '20px',
                    marginBottom: '24px'
                  }}>
                    {/* Total Revenue */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(138, 43, 226, 0.15) 100%)',
                      padding: '24px',
                      borderRadius: '20px',
                      border: '2px solid rgba(138, 43, 226, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #8A2BE2 0%, #9932CC 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          boxShadow: '0 4px 12px rgba(138, 43, 226, 0.3)'
                        }}>
                          💎
                        </div>
                        <div>
                          <div style={{
                            color: '#8B7355',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}>
                            รายได้รวมทั้งหมด
                          </div>
                        </div>
                      </div>
                      <div style={{
                        color: '#BA55D3',
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        marginTop: '8px'
                      }}>
                        ฿{cashflowData.totalRevenue.toLocaleString()}
                      </div>
                    </div>

                    {/* Total Orders Count */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 193, 7, 0.15) 100%)',
                      padding: '24px',
                      borderRadius: '20px',
                      border: '2px solid rgba(255, 193, 7, 0.3)',
                      backdropFilter: 'blur(10px)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #FFC107 0%, #FFB300 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
                        }}>
                          📊
                        </div>
                        <div>
                          <div style={{
                            color: '#8B7355',
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}>
                            คำสั่งซื้อทั้งหมด
                          </div>
                        </div>
                      </div>
                      <div style={{
                        color: '#FFC107',
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        marginTop: '8px'
                      }}>
                        {cashflowData.totalOrdersCount} รายการ
                      </div>
                    </div>
                  </div>

                  {/* Total Breakdown */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '16px'
                  }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        color: '#8B7355',
                        fontSize: '0.9rem',
                        marginBottom: '8px'
                      }}>
                        🍽️ รายได้อาหารรวม
                      </div>
                      <div style={{
                        color: 'white',
                        fontSize: '1.8rem',
                        fontWeight: 700
                      }}>
                        ฿{cashflowData.totalFoodRevenue.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        color: '#8B7355',
                        fontSize: '0.9rem',
                        marginBottom: '8px'
                      }}>
                        💰 รายได้บุฟเฟ่ต์รวม
                      </div>
                      <div style={{
                        color: 'white',
                        fontSize: '1.8rem',
                        fontWeight: 700
                      }}>
                        ฿{cashflowData.totalBuffetRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Breakdown */}
                {dailyBreakdown.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <h3 style={{
                      color: '#FF6B4A',
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      marginBottom: '20px',
                      paddingBottom: '12px',
                      borderBottom: '2px solid rgba(255, 107, 74, 0.3)'
                    }}>
                      📈 รายได้รายวัน
                    </h3>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
                      {dailyBreakdown.map((day, index) => (
                        <div
                          key={index}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '20px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{
                              color: 'white',
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              marginBottom: '8px'
                            }}>
                              {new Date(day.date).toLocaleDateString('th-TH', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '16px',
                              flexWrap: 'wrap',
                              fontSize: '0.9rem',
                              color: '#8B7355'
                            }}>
                              <span>🍽️ อาหาร: ฿{day.foodRevenue.toLocaleString()}</span>
                              <span>💰 บุฟเฟ่ต์: ฿{day.buffetRevenue.toLocaleString()}</span>
                              <span>📋 {day.ordersCount} คำสั่งซื้อ</span>
                            </div>
                          </div>
                          <div style={{
                            color: '#FF6B4A',
                            fontSize: '1.8rem',
                            fontWeight: 800
                          }}>
                            ฿{day.totalRevenue.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Table Breakdown */}
                {tableBreakdown.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <h3 style={{
                      color: '#FF6B4A',
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      marginBottom: '20px',
                      paddingBottom: '12px',
                      borderBottom: '2px solid rgba(255, 107, 74, 0.3)'
                    }}>
                      🪑 รายได้ตามโต๊ะ
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                      gap: '16px'
                    }}>
                      {tableBreakdown.map((table, index) => (
                        <div
                          key={index}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '20px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              color: '#FF6B4A',
                              fontSize: '1.2rem',
                              fontWeight: 700
                            }}>
                              🪑 โต๊ะ {table.tableNumber}
                            </div>
                            <div style={{
                              color: 'white',
                              fontSize: '1.5rem',
                              fontWeight: 800
                            }}>
                              ฿{table.totalRevenue.toLocaleString()}
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '0.9rem',
                            color: '#8B7355'
                          }}>
                            <div>🍽️ อาหาร: ฿{table.foodRevenue.toLocaleString()}</div>
                            <div>💰 บุฟเฟ่ต์: ฿{table.buffetRevenue.toLocaleString()}</div>
                            <div>📋 {table.ordersCount} คำสั่งซื้อ</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: '#2D2520',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '24px'
            }}>
              อัปเดตสถานะคำสั่งซื้อ
            </h2>
            <p style={{
              color: '#8B7355',
              marginBottom: '24px'
            }}>
              โต๊ะ {selectedOrder.tableNumber} - ฿{selectedOrder.totalPrice.toLocaleString()}
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '24px'
            }}>
              {(['pending', 'preparing', 'ready', 'served', 'paid'] as Order['status'][]).map((status) => (
                <button
                  key={status}
                  onClick={() => updateOrderStatus(selectedOrder._id, status)}
                  disabled={selectedOrder.status === status}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedOrder.status === status
                      ? getStatusColor(status)
                      : 'rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    cursor: selectedOrder.status === status ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    opacity: selectedOrder.status === status ? 0.6 : 1
                  }}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600
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
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setOrderToDelete(null)}
        >
          <div
            style={{
              background: '#2D2520',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              ยืนยันการลบคำสั่งซื้อ
            </h2>
            <p style={{
              color: '#8B7355',
              marginBottom: '8px',
              fontSize: '1rem'
            }}>
              คุณต้องการลบคำสั่งซื้อนี้หรือไม่?
            </p>
            <p style={{
              color: 'white',
              marginBottom: '24px',
              fontSize: '1.1rem',
              fontWeight: 600
            }}>
              โต๊ะ {orderToDelete.tableNumber} - ฿{orderToDelete.totalPrice.toLocaleString()}
            </p>
            <p style={{
              color: '#DC2626',
              marginBottom: '24px',
              fontSize: '0.9rem'
            }}>
              ⚠️ การกระทำนี้ไม่สามารถยกเลิกได้
            </p>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  const orderId = orderToDelete._id || orderToDelete.id?.toString() || '';
                  if (orderId) {
                    deleteOrder(orderId);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#DC2626',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                ลบ
              </button>
              <button
                onClick={() => setOrderToDelete(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {selectedMenuItem && (
        <EditMenuItemModal
          item={selectedMenuItem}
          onClose={() => setSelectedMenuItem(null)}
          onSave={(updates) => {
            updateMenuItem(selectedMenuItem.id, updates);
          }}
        />
      )}

      {/* Table Bill Popup */}
      {tableToOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setTableToOpen(null)}
        >
          <div
            style={{
              background: '#2D2520',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: 'white',
              fontSize: '1.8rem',
              fontWeight: 700,
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              เปิดใช้งานโต๊ะ {tableToOpen}
            </h2>
            <p style={{
              color: '#8B7355',
              fontSize: '1rem',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              กรุณาเลือกจำนวนคน
            </p>

            {/* Adult Count */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <label style={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}>
                  👤 ราคาผู้ใหญ่ ท่านละ 199.-
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, adultCount: Math.max(0, prev.adultCount - 1) }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: 'white',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {billForm.adultCount}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, adultCount: prev.adultCount + 1 }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#FF6B4A',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#8B7355',
                fontSize: '0.9rem',
                textAlign: 'right'
              }}>
                = ฿{(billForm.adultCount * 199).toLocaleString()}
              </div>
            </div>

            {/* Child 120cm Count */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <label style={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}>
                  👶 เด็กสูงไม่เกิน 120 ซม ราคา 130.- (รวมเครื่องดื่ม)
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child120Count: Math.max(0, prev.child120Count - 1) }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: 'white',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {billForm.child120Count}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child120Count: prev.child120Count + 1 }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#FFA500',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#8B7355',
                fontSize: '0.9rem',
                textAlign: 'right'
              }}>
                = ฿{(billForm.child120Count * 130).toLocaleString()}
              </div>
            </div>

            {/* Child 100cm Count */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <label style={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}>
                  🎁 เด็กสูงไม่เกิน 100 ซม ทานฟรี!
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child100Count: Math.max(0, prev.child100Count - 1) }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: 'white',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {billForm.child100Count}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child100Count: prev.child100Count + 1 }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#9C27B0',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#4CAF50',
                fontSize: '0.9rem',
                textAlign: 'right'
              }}>
                ฟรี
              </div>
            </div>

            {/* Drink Refill Count */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <label style={{
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}>
                  🥤 น้ำรีฟิลเติมสะใจ! 39.-
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, drinkRefillCount: Math.max(0, prev.drinkRefillCount - 1) }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: 'white',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    minWidth: '40px',
                    textAlign: 'center'
                  }}>
                    {billForm.drinkRefillCount}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, drinkRefillCount: prev.drinkRefillCount + 1 }))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#4CAF50',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#8B7355',
                fontSize: '0.9rem',
                textAlign: 'right'
              }}>
                = ฿{(billForm.drinkRefillCount * 39).toLocaleString()}
              </div>
            </div>

            {/* Total */}
            <div style={{
              padding: '20px',
              background: 'rgba(255, 107, 74, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(255, 107, 74, 0.3)',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  color: 'white',
                  fontSize: '1.3rem',
                  fontWeight: 700
                }}>
                  รวมทั้งหมด:
                </span>
                <span style={{
                  color: '#FF6B4A',
                  fontSize: '2rem',
                  fontWeight: 800
                }}>
                  ฿{calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={saveTableBill}
                disabled={savingBill || (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0)}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) ? 'rgba(255, 255, 255, 0.2)' : '#FF6B4A',
                  color: 'white',
                  cursor: (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) ? 'not-allowed' : 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  opacity: savingBill ? 0.6 : 1
                }}
              >
                {savingBill ? 'กำลังบันทึก...' : '💾 บันทึกและเปิดโต๊ะ'}
              </button>
              <button
                onClick={() => setTableToOpen(null)}
                style={{
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {showAddMenuModal && (
        <AddMenuItemModal
          onClose={() => setShowAddMenuModal(false)}
          onSave={addMenuItem}
        />
      )}

      {/* Toast Notifications */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: isMobile ? 'calc(100% - 40px)' : '400px',
        pointerEvents: 'none'
      }}>
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              background: 'linear-gradient(135deg, rgba(45, 37, 32, 0.98) 0%, rgba(61, 53, 46, 0.98) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '16px',
              padding: '20px',
              border: '2px solid rgba(255, 107, 74, 0.4)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'auto',
              animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: `translateX(${toasts.length - index > 3 ? '100%' : '0'})`,
              opacity: toasts.length - index > 3 ? 0 : 1
            }}
            onClick={() => {
              setSelectedOrder(toast.order);
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(0) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 107, 74, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(255, 107, 74, 0.3)',
                animation: 'pulse 2s infinite'
              }}>
                🔔
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <h4 style={{
                      color: '#FF6B4A',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      margin: 0,
                      marginBottom: '4px'
                    }}>
                      🆕 คำสั่งซื้อใหม่!
                    </h4>
                    <p style={{
                      color: 'white',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      margin: 0
                    }}>
                      โต๊ะ {toast.order.tableNumber}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setToasts(prev => prev.filter(t => t.id !== toast.id));
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 107, 74, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{
                  color: '#8B7355',
                  fontSize: '0.85rem',
                  marginBottom: '8px'
                }}>
                  {toast.order.items.length} รายการ • ฿{toast.order.totalPrice.toLocaleString()}
                </div>
                {toast.order.items.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '8px'
                  }}>
                    {toast.order.items.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(255, 107, 74, 0.2)',
                          color: '#FF6B4A',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        {item.nameTh} x{item.quantity}
                      </span>
                    ))}
                    {toast.order.items.length > 3 && (
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#8B7355',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem'
                      }}>
                        +{toast.order.items.length - 3} รายการ
                      </span>
                    )}
                  </div>
                )}
                <div style={{
                  color: '#8B7355',
                  fontSize: '0.75rem',
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  {new Date(toast.order.createdAt).toLocaleTimeString('th-TH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Add Menu Item Modal Component
function AddMenuItemModal({ 
  onClose, 
  onSave 
}: { 
  onClose: () => void; 
  onSave: (newItem: Omit<MenuItem, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    nameTh: '',
    description: '',
    price: 0,
    image: '',
    category: 'hotpot',
    isPopular: false,
    isSpicy: false,
    isNew: false,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authenticator function to get upload credentials
  const authenticator = async () => {
    try {
      const response = await fetch('/api/upload/imagekit/auth');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.signature || !data.token || !data.expire) {
        throw new Error('Invalid authentication response');
      }
      
      return {
        signature: data.signature,
        expire: data.expire,
        token: data.token,
        publicKey: data.publicKey || 'public_KxA6nOGAMrPHFO/cQoYQOdr6Gm0=',
      };
    } catch (error: any) {
      console.error('Authentication error:', error);
      const errorMessage = error.message || 'Authentication request failed';
      throw new Error(errorMessage);
    }
  };

  // Handle file upload using direct API call
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกรูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setUploading(true);
    try {
      // Get authentication parameters
      const authParams = await authenticator();
      
      // Upload using ImageKit SDK
      const uploadResponse = await upload({
        file,
        fileName: `menu_${Date.now()}_${file.name}`,
        folder: '/menu_images/',
        useUniqueFileName: true,
        signature: authParams.signature,
        token: authParams.token,
        expire: authParams.expire,
        publicKey: authParams.publicKey,
      });

      if (!uploadResponse.url) {
        throw new Error('Upload response missing URL');
      }

      setFormData((prev) => ({ ...prev, image: uploadResponse.url! }));
      alert('อัพโหลดรูปภาพสำเร็จ!');
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Unknown error';
      
      // Handle specific error types
      if (error instanceof ImageKitAbortError) {
        errorMessage = 'Upload was aborted';
      } else if (error instanceof ImageKitInvalidRequestError) {
        errorMessage = 'Invalid request: ' + error.message;
      } else if (error instanceof ImageKitUploadNetworkError) {
        errorMessage = 'Network error: ' + error.message;
      } else if (error instanceof ImageKitServerError) {
        errorMessage = 'Server error: ' + error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show more specific error messages
      if (errorMessage.includes('IMAGEKIT_PRIVATE_KEY')) {
        alert('กรุณาตั้งค่า IMAGEKIT_PRIVATE_KEY ในไฟล์ .env.local\n\nดูคำแนะนำได้ที่ ImageKit Dashboard > Developer Options > API Keys');
      } else {
        alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nameTh || !formData.category) {
      alert('กรุณากรอกชื่อเมนู (ไทย/อังกฤษ) และหมวดหมู่');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#2D2520',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '2px solid rgba(255, 107, 74, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            color: '#FF6B4A',
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: 0
          }}>
            ➕ เพิ่มเมนูใหม่
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              ชื่อเมนู (ภาษาอังกฤษ) *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="Menu Name (English)"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              ชื่อเมนู (ภาษาไทย) *
            </label>
            <input
              type="text"
              value={formData.nameTh}
              onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="ชื่อเมนู (ภาษาไทย)"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              คำอธิบาย
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '1rem',
                resize: 'vertical'
              }}
              placeholder="คำอธิบายเมนู"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              ราคา (บาท)
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '1rem'
              }}
              placeholder="0"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              รูปภาพเมนู
            </label>
            
            {/* ImageKit Provider for Image Display */}
            <ImageKitProvider urlEndpoint="https://ik.imagekit.io/8msldpqil">
              {/* Image Preview */}
              {formData.image && (
                <div style={{
                  marginBottom: '12px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255, 107, 74, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  position: 'relative'
                }}>
                  <Image
                    src={formData.image.replace('https://ik.imagekit.io/8msldpqil/', '')}
                    width={400}
                    height={200}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, image: '' });
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <label
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px dashed rgba(255, 107, 74, 0.5)',
                  background: uploading ? 'rgba(255, 107, 74, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  opacity: uploading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.8)';
                    e.currentTarget.style.background = 'rgba(255, 107, 74, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.5)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                {uploading ? '⏳ กำลังอัพโหลด...' : '📤 คลิกเพื่ออัพโหลดรูปภาพ หรือลากวางไฟล์'}
              </label>

              {/* URL Input (Alternative) */}
              <div style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  color: '#8B7355',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>
                  หรือกรอก URL รูปภาพ
                </div>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </ImageKitProvider>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              หมวดหมู่ *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontSize: '1rem'
              }}
            >
              <option value="hotpot">สุกี้ (Hot Pot)</option>
              <option value="grilled">ปิ้งย่าง (Grilled)</option>
              <option value="seafood">อาหารทะเล (Seafood)</option>
              <option value="appetizer">เรียกน้ำย่อย (Appetizers)</option>
              <option value="drinks">เครื่องดื่ม (Drinks)</option>
              <option value="dessert">ของหวาน (Desserts)</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>⭐ ยอดนิยม</span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.isSpicy}
                onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>🌶️ เผ็ด</span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>🆕 ใหม่</span>
            </label>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(255, 107, 74, 0.3)'
              }}
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Menu Item Modal Component
function EditMenuItemModal({ 
  item, 
  onClose, 
  onSave 
}: { 
  item: MenuItem; 
  onClose: () => void; 
  onSave: (updates: Partial<MenuItem>) => void;
}) {
  const [formData, setFormData] = useState({
    name: item.name,
    nameTh: item.nameTh,
    description: item.description,
    price: item.price,
    image: item.image,
    category: item.category,
    isPopular: item.isPopular,
    isSpicy: item.isSpicy,
    isNew: item.isNew,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authenticator function to get upload credentials
  const authenticator = async () => {
    try {
      const response = await fetch('/api/upload/imagekit/auth');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.signature || !data.token || !data.expire) {
        throw new Error('Invalid authentication response');
      }
      
      return {
        signature: data.signature,
        expire: data.expire,
        token: data.token,
        publicKey: data.publicKey || 'public_KxA6nOGAMrPHFO/cQoYQOdr6Gm0=',
      };
    } catch (error: any) {
      console.error('Authentication error:', error);
      const errorMessage = error.message || 'Authentication request failed';
      throw new Error(errorMessage);
    }
  };

  // Handle file upload using direct API call
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกรูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setUploading(true);
    try {
      // Get authentication parameters
      const authParams = await authenticator();
      
      // Upload using ImageKit SDK
      const uploadResponse = await upload({
        file,
        fileName: `menu_${Date.now()}_${file.name}`,
        folder: '/menu_images/',
        useUniqueFileName: true,
        signature: authParams.signature,
        token: authParams.token,
        expire: authParams.expire,
        publicKey: authParams.publicKey,
      });

      if (!uploadResponse.url) {
        throw new Error('Upload response missing URL');
      }

      setFormData((prev) => ({ ...prev, image: uploadResponse.url! }));
      alert('อัพโหลดรูปภาพสำเร็จ!');
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Unknown error';
      
      // Handle specific error types
      if (error instanceof ImageKitAbortError) {
        errorMessage = 'Upload was aborted';
      } else if (error instanceof ImageKitInvalidRequestError) {
        errorMessage = 'Invalid request: ' + error.message;
      } else if (error instanceof ImageKitUploadNetworkError) {
        errorMessage = 'Network error: ' + error.message;
      } else if (error instanceof ImageKitServerError) {
        errorMessage = 'Server error: ' + error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show more specific error messages
      if (errorMessage.includes('IMAGEKIT_PRIVATE_KEY')) {
        alert('กรุณาตั้งค่า IMAGEKIT_PRIVATE_KEY ในไฟล์ .env.local\n\nดูคำแนะนำได้ที่ ImageKit Dashboard > Developer Options > API Keys');
      } else {
        alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#2D2520',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '24px'
        }}>
          แก้ไขเมนู: {item.nameTh}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#8B7355',
              fontSize: '0.9rem',
              marginBottom: '8px'
            }}>
              ชื่อภาษาอังกฤษ
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#8B7355',
              fontSize: '0.9rem',
              marginBottom: '8px'
            }}>
              ชื่อภาษาไทย
            </label>
            <input
              type="text"
              value={formData.nameTh}
              onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#8B7355',
              fontSize: '0.9rem',
              marginBottom: '8px'
            }}>
              คำอธิบาย
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'white',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#8B7355',
              fontSize: '0.9rem',
              marginBottom: '8px'
            }}>
              ราคา (฿) - ใส่ 0 สำหรับบุฟเฟ่ต์
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'white',
                fontSize: '1rem'
              }}
            />
            {formData.price === 0 && (
              <p style={{
                color: '#4CAF50',
                fontSize: '0.85rem',
                marginTop: '4px'
              }}>
                ✓ ตั้งเป็นราคาบุฟเฟ่ต์ (0 บาท)
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              color: 'white',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              รูปภาพเมนู
            </label>
            
            {/* ImageKit Provider for Image Display */}
            <ImageKitProvider urlEndpoint="https://ik.imagekit.io/8msldpqil">
              {/* Image Preview */}
              {formData.image && (
                <div style={{
                  marginBottom: '12px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255, 107, 74, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  position: 'relative'
                }}>
                  <Image
                    src={formData.image.replace('https://ik.imagekit.io/8msldpqil/', '')}
                    width={400}
                    height={200}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, image: '' });
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Upload Button */}
              <label
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px dashed rgba(255, 107, 74, 0.5)',
                  background: uploading ? 'rgba(255, 107, 74, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  opacity: uploading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.8)';
                    e.currentTarget.style.background = 'rgba(255, 107, 74, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = 'rgba(255, 107, 74, 0.5)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                {uploading ? '⏳ กำลังอัพโหลด...' : '📤 คลิกเพื่ออัพโหลดรูปภาพ หรือลากวางไฟล์'}
              </label>

              {/* URL Input (Alternative) */}
              <div style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  color: '#8B7355',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  fontWeight: 600
                }}>
                  หรือกรอก URL รูปภาพ
                </div>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </ImageKitProvider>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#8B7355',
              fontSize: '0.9rem',
              marginBottom: '8px'
            }}>
              หมวดหมู่
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'white',
                fontSize: '1rem'
              }}
            >
              <option value="hotpot">สุกี้ (Hot Pot)</option>
              <option value="grilled">ปิ้งย่าง (Grilled)</option>
              <option value="seafood">อาหารทะเล (Seafood)</option>
              <option value="appetizer">เรียกน้ำย่อย (Appetizers)</option>
              <option value="drinks">เครื่องดื่ม (Drinks)</option>
              <option value="dessert">ของหวาน (Desserts)</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>⭐ ยอดนิยม</span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.isSpicy}
                onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>🌶️ เผ็ด</span>
            </label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>🆕 ใหม่</span>
            </label>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: '#FF6B4A',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

