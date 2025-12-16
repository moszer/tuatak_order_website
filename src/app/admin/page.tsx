'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Order } from '@/lib/mysql';
import { AddMenuItemModal, EditMenuItemModal } from './components/MenuModals';
import { MenuItem } from './types';
import Swal from 'sweetalert2';
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

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [tableBills, setTableBills] = useState<Record<string, any>>({});
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        router.push('/admin/login');
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    // Initialize lastUpdate on client side only
    setLastUpdate(new Date());
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/admin/login');
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'เปลี่ยนรหัสผ่านสำเร็จ',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'ตกลง'
        });
        setShowChangePasswordModal(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordError('');
      } else {
        setPasswordError(data.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } catch (error) {
      setPasswordError('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    // Only fetch data if authenticated
    if (!isAuthenticated) return;

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
  }, [filterStatus, isAuthenticated]);

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
          
          // Show SweetAlert toast for new orders
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
              minute: '2-digit' 
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
              }
            });
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
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to update order status',
          confirmButtonColor: '#ef4444'
        });
        console.error('Update error:', data);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'Error updating order status: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444'
      });
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
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to delete order',
          confirmButtonColor: '#ef4444'
        });
        console.error('Delete error:', data);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'Error deleting order: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444'
      });
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
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to update menu item',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'Error updating menu item: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444'
      });
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
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to delete menu item',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'Error deleting menu item: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444'
      });
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
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'เพิ่มเมนูสำเร็จ!',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'ตกลง'
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to add menu item',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (error) {
      console.error('Error adding menu item:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'Error adding menu item: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444'
      });
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'menu') {
      fetchMenuItems();
    } else if (activeTab === 'tables') {
      fetchTableStatuses();
    } else if (activeTab === 'cashflow') {
      fetchCashflowData();
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'cashflow') {
      fetchCashflowData();
    }
  }, [cashflowPeriod, isAuthenticated]);

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
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to update table status',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (error) {
      console.error('Error updating table status:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'Error updating table status: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const saveTableBill = async () => {
    if (!tableToOpen) return;

    if (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกจำนวนคนอย่างน้อย 1 คน',
        confirmButtonColor: '#f97316',
        confirmButtonText: 'ตกลง'
      });
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
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: billData.error || 'Failed to save bill',
          confirmButtonColor: '#ef4444'
        });
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
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: statusData.error || 'Failed to update table status',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (error) {
      console.error('Error saving table bill:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'Error saving table bill: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444'
      });
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
      reverseButtons: true
    });
    
    if (result.isConfirmed) {
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
          confirmButtonText: 'ตกลง'
        });
      } catch (error) {
        console.error('Error checking bill:', error);
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'เกิดข้อผิดพลาดในการเช็คบิล: ' + (error instanceof Error ? error.message : 'Unknown error'),
          confirmButtonColor: '#ef4444'
        });
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

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          color: '#a1a1a1',
          fontSize: '1rem'
        }}>
          กำลังตรวจสอบสิทธิ์...
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      padding: isMobile ? '20px 16px' : '48px 32px'
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
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @media (max-width: 768px) {
            .admin-container {
              padding: 16px 12px !important;
            }
            .admin-top-bar {
              padding: 16px !important;
              border-radius: 16px !important;
            }
            .admin-tabs {
              width: 100%;
              justify-content: stretch;
              padding: 4px !important;
              gap: 4px !important;
            }
            .admin-tab-button {
              padding: 10px 12px !important;
              font-size: 0.85rem !important;
              flex: 1;
              min-width: 0;
            }
            .admin-status-controls {
              width: 100%;
              justify-content: space-between;
              margin-top: 12px;
              gap: 8px !important;
            }
            .admin-stats-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 12px !important;
            }
            .admin-stat-card {
              padding: 16px !important;
            }
            .admin-filter-buttons {
              flex-wrap: wrap;
              gap: 6px !important;
            }
            .admin-filter-button {
              padding: 8px 12px !important;
              font-size: 0.8rem !important;
            }
            .admin-table-card {
              padding: 16px !important;
              border-radius: 16px !important;
            }
            .admin-order-card {
              padding: 14px !important;
              border-radius: 12px !important;
            }
            .admin-modal {
              max-width: 95vw !important;
              padding: 20px !important;
              margin: 10px !important;
              max-height: 90vh !important;
              overflow-y: auto !important;
            }
          }
          @media (max-width: 480px) {
            .admin-container {
              padding: 12px 8px !important;
            }
            .admin-top-bar {
              padding: 14px !important;
              border-radius: 12px !important;
            }
            .admin-tabs {
              padding: 3px !important;
              gap: 3px !important;
            }
            .admin-tab-button {
              padding: 8px 8px !important;
              font-size: 0.75rem !important;
              min-width: 60px;
            }
            .admin-stats-grid {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }
            .admin-stat-card {
              padding: 14px !important;
            }
            .admin-filter-buttons {
              gap: 4px !important;
            }
            .admin-filter-button {
              padding: 6px 10px !important;
              font-size: 0.75rem !important;
            }
            .admin-table-card {
              padding: 14px !important;
            }
            .admin-order-card {
              padding: 12px !important;
            }
            .admin-modal {
              padding: 16px !important;
              margin: 8px !important;
            }
          }
          @media (max-width: 360px) {
            .admin-tab-button {
              font-size: 0.7rem !important;
              padding: 7px 6px !important;
            }
          }
        `
      }} />
      <div style={{
        maxWidth: '1800px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Top Bar with Tabs and Controls */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: isMobile ? '16px' : '20px',
          padding: isMobile ? '20px' : '28px 32px',
          marginBottom: isMobile ? '24px' : '40px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
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
              gap: isMobile ? '8px' : '12px',
              flexWrap: 'wrap',
              width: isMobile ? '100%' : 'auto',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }} className="admin-tabs">
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  padding: isMobile ? '12px 20px' : '14px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === 'orders' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'transparent',
                  color: activeTab === 'orders' ? '#fff' : '#a1a1a1',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto',
                  boxShadow: activeTab === 'orders' ? '0 4px 16px rgba(16, 185, 129, 0.3)' : 'none',
                  transform: activeTab === 'orders' ? 'translateY(-1px)' : 'none'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'orders') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'orders') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#a1a1a1';
                  }
                }}
              >
                📋 คำสั่งซื้อ
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'menu' ? '#10b981' : '#262626',
                  color: activeTab === 'menu' ? '#fff' : '#a1a1a1',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'menu') {
                    e.currentTarget.style.background = '#333';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'menu') {
                    e.currentTarget.style.background = '#262626';
                    e.currentTarget.style.color = '#a1a1a1';
                  }
                }}
              >
                🍽️ จัดการเมนู
              </button>
              <button
                onClick={() => setActiveTab('tables')}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'tables' ? '#10b981' : '#262626',
                  color: activeTab === 'tables' ? '#fff' : '#a1a1a1',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'tables') {
                    e.currentTarget.style.background = '#333';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'tables') {
                    e.currentTarget.style.background = '#262626';
                    e.currentTarget.style.color = '#a1a1a1';
                  }
                }}
              >
                🪑 จัดการโต๊ะ
              </button>
              <button
                onClick={() => setActiveTab('cashflow')}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'cashflow' ? '#10b981' : '#262626',
                  color: activeTab === 'cashflow' ? '#fff' : '#a1a1a1',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  flex: isMobile ? '1' : 'none',
                  minWidth: isMobile ? '0' : 'auto'
                }}
                className="admin-tab-button"
                onMouseEnter={(e) => {
                  if (activeTab !== 'cashflow') {
                    e.currentTarget.style.background = '#333';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'cashflow') {
                    e.currentTarget.style.background = '#262626';
                    e.currentTarget.style.color = '#a1a1a1';
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
                gap: '8px',
                padding: '8px 16px',
                background: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #2a2a2a',
                flex: isMobile ? '1' : 'none'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  animation: 'pulse 2s infinite',
                  flexShrink: 0
                }} />
                <p style={{
                  color: '#10b981',
                  fontSize: '0.85rem',
                  margin: 0,
                  fontWeight: 600
                }}>
                  ออนไลน์
                </p>
                {!isMobile && lastUpdate && (
                  <span style={{
                    color: '#737373',
                    fontSize: '0.8rem',
                    marginLeft: '4px'
                  }}>
                    {lastUpdate.toLocaleTimeString('th-TH')}
                  </span>
                )}
              </div>
              {/* Settings Menu */}
              <div style={{ position: 'relative', zIndex: 9999 }} data-menu-container>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #2a2a2a',
                    background: showMenu ? '#10b981' : '#262626',
                    color: showMenu ? '#fff' : '#a1a1a1',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px'
                  }}
                  title="ตั้งค่า"
                  onMouseEnter={(e) => {
                    if (!showMenu) {
                      e.currentTarget.style.background = '#333';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showMenu) {
                      e.currentTarget.style.background = '#262626';
                      e.currentTarget.style.color = '#a1a1a1';
                    }
                  }}
                >
                  ⚙️
                </button>
                
                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 9998,
                      }}
                      onClick={() => setShowMenu(false)}
                    />
                    {/* Menu Content */}
                    <div
                      style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: '#1a1a1a',
                        borderRadius: '16px',
                        border: '1px solid #2a2a2a',
                        padding: '8px',
                        minWidth: isMobile ? '280px' : '300px',
                        maxWidth: '90vw',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                        zIndex: 9999,
                        animation: 'slideDown 0.2s ease-out'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                    {/* Sound Toggle */}
                    <button
                      onClick={() => {
                        setSoundEnabled(!soundEnabled);
                        if (!soundEnabled) {
                          playNotificationSound();
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: soundEnabled ? '#10b981' : '#a1a1a1',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#262626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{soundEnabled ? '🔔' : '🔕'}</span>
                      <span>{soundEnabled ? 'เปิดเสียง' : 'ปิดเสียง'}</span>
                    </button>

                    {/* Divider */}
                    <div style={{
                      height: '1px',
                      background: '#2a2a2a',
                      margin: '8px 0'
                    }} />

                    {/* Change Password */}
                    <button
                      onClick={() => {
                        setShowChangePasswordModal(true);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: '#a1a1a1',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#262626';
                        e.currentTarget.style.color = '#10b981';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#a1a1a1';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🔑</span>
                      <span>เปลี่ยนรหัสผ่าน</span>
                    </button>

                    {/* Divider */}
                    <div style={{
                      height: '1px',
                      background: '#2a2a2a',
                      margin: '8px 0'
                    }} />

                    {/* Logout */}
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>🚪</span>
                      <span>ออกจากระบบ</span>
                    </button>
                    </div>
                  </>
                )}
              </div>
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
            ? '1fr 1fr' 
            : 'repeat(4, 1fr)',
          gap: isMobile ? '12px' : '20px',
          marginBottom: isMobile ? '24px' : '32px'
        }} className="admin-stats-grid">
          <div style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
            borderRadius: '16px',
            padding: isMobile ? '20px' : '28px',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          className="admin-stat-card"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(249, 115, 22, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)';
          }}
          >
            <div style={{ 
              color: '#f97316', 
              fontSize: isMobile ? '2rem' : '2.75rem', 
              fontWeight: 700,
              marginBottom: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: '1',
              textShadow: '0 2px 8px rgba(249, 115, 22, 0.3)'
            }}>
              {pendingCount}
            </div>
            <div style={{ 
              color: '#d1d5db', 
              fontSize: isMobile ? '0.85rem' : '0.95rem', 
              fontWeight: 600,
              letterSpacing: '0.3px'
            }}>
              ⏳ รอดำเนินการ
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
            borderRadius: '16px',
            padding: isMobile ? '20px' : '28px',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(234, 179, 8, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)';
          }}
          >
            <div style={{ 
              color: '#eab308', 
              fontSize: isMobile ? '2rem' : '2.75rem', 
              fontWeight: 700,
              marginBottom: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: '1',
              textShadow: '0 2px 8px rgba(234, 179, 8, 0.3)'
            }}>
              {preparingCount}
            </div>
            <div style={{ 
              color: '#d1d5db', 
              fontSize: isMobile ? '0.85rem' : '0.95rem', 
              fontWeight: 600,
              letterSpacing: '0.3px'
            }}>
              🔥 กำลังเตรียม
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
            borderRadius: '16px',
            padding: isMobile ? '20px' : '28px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)';
          }}
          >
            <div style={{ 
              color: '#10b981', 
              fontSize: isMobile ? '2rem' : '2.75rem', 
              fontWeight: 700,
              marginBottom: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: '1',
              textShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}>
              {readyCount}
            </div>
            <div style={{ 
              color: '#d1d5db', 
              fontSize: isMobile ? '0.85rem' : '0.95rem', 
              fontWeight: 600,
              letterSpacing: '0.3px'
            }}>
              ✅ พร้อมเสิร์ฟ
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
            borderRadius: '16px',
            padding: isMobile ? '20px' : '28px',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)';
          }}
          >
            <div style={{ 
              color: '#a855f7', 
              fontSize: isMobile ? '1.75rem' : '2.25rem', 
              fontWeight: 700,
              marginBottom: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: '1',
              textShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
            }}>
              ฿{totalRevenue.toLocaleString()}
            </div>
            <div style={{ 
              color: '#d1d5db', 
              fontSize: isMobile ? '0.85rem' : '0.95rem', 
              fontWeight: 600,
              letterSpacing: '0.3px'
            }}>
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
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile 
              ? 'repeat(3, 1fr)' 
              : 'repeat(3, auto)',
            gap: isMobile ? '8px' : '10px',
            width: '100%'
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
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (filterStatus !== status) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (filterStatus !== status) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
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
              padding: isMobile ? '12px 16px' : '14px 28px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: (loading || isRefreshing) 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
              color: (loading || isRefreshing) ? '#737373' : '#10b981',
              cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: 600,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: (loading || isRefreshing) ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.2)',
              width: isMobile ? '100%' : 'auto'
            }}
            onMouseEnter={(e) => {
              if (!loading && !isRefreshing) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !isRefreshing) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
              }
            }}
          >
            <span style={{
              display: 'inline-block',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              fontSize: '1.1rem'
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
                  gap: isMobile ? '20px' : '28px'
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
                          background: '#1a1a1a',
                          borderRadius: '16px',
                          padding: '24px',
                          border: '1px solid #2a2a2a',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#10b981';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#2a2a2a';
                        }}
                      >
                        {/* Table Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '20px',
                          paddingBottom: '16px',
                          borderBottom: '1px solid #2a2a2a'
                        }}>
                          <div>
                            <h3 style={{
                              color: '#fff',
                              fontSize: '1.5rem',
                              fontWeight: 700,
                              margin: 0,
                              marginBottom: '4px'
                            }}>
                              🪑 โต๊ะ {tableNum}
                            </h3>
                            <p style={{
                              color: '#737373',
                              fontSize: '0.85rem',
                              margin: 0
                            }}>
                              {tableOrders.length > 0 ? `${tableOrders.length} คำสั่งซื้อ` : 'รอคำสั่งซื้อ'}
                            </p>
                          </div>
                          <div style={{
                            textAlign: 'right'
                          }}>
                            <div style={{
                              color: '#10b981',
                              fontSize: '1.5rem',
                              fontWeight: 700
                            }}>
                              ฿{tableGrandTotal.toLocaleString()}
                            </div>
                            <div style={{
                              color: '#737373',
                              fontSize: '0.8rem'
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
                            background: '#262626',
                            borderRadius: '12px',
                            border: '1px solid #333'
                          }}>
                            <div style={{
                              color: '#a855f7',
                              fontSize: '1rem',
                              fontWeight: 600,
                              marginBottom: '12px'
                            }}>
                              💰 บิลบุฟเฟ่ต์
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: '8px',
                              fontSize: '0.85rem',
                              color: '#a1a1a1',
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
                              borderTop: '1px solid #333',
                              marginBottom: '12px'
                            }}>
                              <span style={{
                                color: '#fff',
                                fontSize: '0.95rem',
                                fontWeight: 600
                              }}>
                                รวมบิลบุฟเฟ่ต์:
                              </span>
                              <span style={{
                                color: '#a855f7',
                                fontSize: '1.2rem',
                                fontWeight: 700
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
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#10b981',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 600,
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#059669';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#10b981';
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
                  background: '#262626',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid #333',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedOrder(order)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{
                      color: '#737373',
                      fontSize: '0.8rem',
                      marginBottom: '4px'
                    }}>
                      คำสั่งซื้อ #{order._id}
                    </div>
                    <div style={{
                      color: '#737373',
                      fontSize: '0.8rem'
                    }}>
                      {new Date(order.createdAt).toLocaleString('th-TH')}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: getStatusColor(order.status),
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    {getStatusLabel(order.status)}
                  </div>
                </div>


                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div style={{
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      color: '#f97316',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '10px'
                    }}>
                      🍽️ รายการอาหาร
                    </div>
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#d4d4d4',
                          fontSize: '0.85rem',
                          marginBottom: '6px',
                          paddingLeft: '8px'
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

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid #333'
                }}>
                  <div>
                    <div style={{
                      color: '#fff',
                      fontSize: '1rem',
                      fontWeight: 600,
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
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #333',
                        background: '#262626',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500
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
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #dc2626',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500
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
                            color: '#737373',
                            fontSize: '0.9rem'
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
                color: '#fff',
                fontSize: '1.25rem',
                fontWeight: 600
              }}>
                จัดการเมนูและราคา
              </h2>
              <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setShowAddMenuModal(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#10b981',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#059669';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#10b981';
                  }}
                >
                  ➕ เพิ่มเมนู
                </button>
                <button
                  onClick={fetchMenuItems}
                  disabled={menuLoading}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #2a2a2a',
                    background: '#262626',
                    color: menuLoading ? '#737373' : '#fff',
                    cursor: menuLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                >
                  🔄 รีเฟรช
                </button>
              </div>
            </div>

            {menuLoading ? (
              <div style={{
                textAlign: 'center',
                color: '#a1a1a1',
                padding: '40px',
                fontSize: '1rem'
              }}>
                กำลังโหลด...
              </div>
            ) : menuItems.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#737373',
                padding: '40px',
                fontSize: '1rem'
              }}>
                ไม่มีรายการเมนู
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '12px'
              }}>
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#1a1a1a',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #2a2a2a'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          color: '#fff',
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          marginBottom: '4px'
                        }}>
                          {item.nameTh}
                        </div>
                        <div style={{
                          color: '#737373',
                          fontSize: '0.85rem',
                          marginBottom: '6px'
                        }}>
                          {item.name}
                        </div>
                        <div style={{
                          color: '#a1a1a1',
                          fontSize: '0.8rem',
                          marginBottom: '8px'
                        }}>
                          {item.description}
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: '6px',
                          flexWrap: 'wrap',
                          marginTop: '8px'
                        }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: '#262626',
                            color: '#f97316',
                            fontSize: '0.7rem',
                            border: '1px solid #333'
                          }}>
                            {item.category}
                          </span>
                          {item.isPopular && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#262626',
                              color: '#eab308',
                              fontSize: '0.7rem',
                              border: '1px solid #333'
                            }}>
                              ⭐ ยอดนิยม
                            </span>
                          )}
                          {item.isSpicy && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#262626',
                              color: '#ef4444',
                              fontSize: '0.7rem',
                              border: '1px solid #333'
                            }}>
                              🌶️ เผ็ด
                            </span>
                          )}
                          {item.isNew && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#262626',
                              color: '#10b981',
                              fontSize: '0.7rem',
                              border: '1px solid #333'
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
                          color: '#10b981',
                          fontSize: '1.3rem',
                          fontWeight: 600
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
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #333',
                              background: '#262626',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 500
                            }}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            onClick={async () => {
                              const result = await Swal.fire({
                                icon: 'question',
                                title: 'ยืนยันการลบเมนู',
                                text: `คุณต้องการลบ "${item.nameTh}" หรือไม่?`,
                                showCancelButton: true,
                                confirmButtonText: 'ลบ',
                                cancelButtonText: 'ยกเลิก',
                                confirmButtonColor: '#ef4444',
                                cancelButtonColor: '#6b7280',
                                reverseButtons: true
                              });
                              
                              if (result.isConfirmed) {
                                deleteMenuItem(item.id);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #dc2626',
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 500
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
              marginBottom: isMobile ? '24px' : '32px',
              flexWrap: 'wrap',
              gap: '16px',
              background: 'rgba(26, 26, 26, 0.6)',
              padding: isMobile ? '20px' : '24px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)'
            }}>
              <div>
                <h2 style={{
                  color: '#fff',
                  fontSize: isMobile ? '1.15rem' : '1.5rem',
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: '4px',
                  letterSpacing: '-0.02em'
                }}>
                  🪑 จัดการสถานะโต๊ะ
                </h2>
                <p style={{
                  color: '#a1a1a1',
                  fontSize: '0.9rem',
                  margin: 0,
                  fontWeight: 400
                }}>
                  เปิด/ปิดโต๊ะและจัดการสถานะการใช้งาน
                </p>
              </div>
              <button
                onClick={fetchTableStatuses}
                disabled={tablesLoading}
                style={{
                  padding: isMobile ? '12px 20px' : '14px 28px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: tablesLoading 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  color: tablesLoading ? '#737373' : '#10b981',
                  cursor: tablesLoading ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '0.85rem' : '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: tablesLoading ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (!tablesLoading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tablesLoading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                  }
                }}
              >
                <span style={{
                  display: 'inline-block',
                  animation: tablesLoading ? 'spin 1s linear infinite' : 'none',
                  fontSize: '1.1rem'
                }}>🔄</span>
                <span>รีเฟรช</span>
              </button>
            </div>

            {/* Buffet Pricing Information */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: isMobile ? '24px' : '32px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: isMobile ? '24px' : '32px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}>
              <h3 style={{
                color: '#fff',
                fontSize: isMobile ? '1.15rem' : '1.35rem',
                fontWeight: 700,
                marginBottom: isMobile ? '20px' : '28px',
                textAlign: 'center',
                letterSpacing: '-0.02em'
              }}>
                💰 ราคาบุฟเฟ่ต์
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile 
                  ? 'repeat(2, 1fr)' 
                  : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: isMobile ? '12px' : '16px'
              }}>
                <div style={{
                  padding: isMobile ? '20px' : '24px',
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(249, 115, 22, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                }}
                >
                  <div style={{
                    color: '#f97316',
                    fontSize: isMobile ? '0.85rem' : '0.95rem',
                    fontWeight: 600,
                    marginBottom: '12px',
                    letterSpacing: '0.3px'
                  }}>
                    👤 ราคาผู้ใหญ่
                  </div>
                  <div style={{
                    color: '#fff',
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    fontWeight: 700,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}>
                    ท่านละ 199.-
                  </div>
                </div>

                <div style={{
                  padding: isMobile ? '20px' : '24px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                }}
                >
                  <div style={{
                    color: '#10b981',
                    fontSize: isMobile ? '0.85rem' : '0.95rem',
                    fontWeight: 600,
                    marginBottom: '12px',
                    letterSpacing: '0.3px'
                  }}>
                    🥤 น้ำรีฟิลเติมสะใจ!
                  </div>
                  <div style={{
                    color: '#fff',
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    fontWeight: 700,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}>
                    39.-
                  </div>
                </div>

                <div style={{
                  padding: isMobile ? '20px' : '24px',
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 179, 8, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                }}
                >
                  <div style={{
                    color: '#eab308',
                    fontSize: isMobile ? '0.85rem' : '0.95rem',
                    fontWeight: 600,
                    marginBottom: '12px',
                    letterSpacing: '0.3px'
                  }}>
                    👶 เด็กสูงไม่เกิน 120 ซม
                  </div>
                  <div style={{
                    color: '#fff',
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    fontWeight: 700,
                    marginBottom: '4px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}>
                    เพียงราคา 130.-
                  </div>
                  <div style={{
                    color: '#d1d5db',
                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                    fontWeight: 400
                  }}>
                    รวมเครื่องดื่ม
                  </div>
                </div>

                <div style={{
                  padding: isMobile ? '20px' : '24px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(26, 26, 26, 0.9) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                }}
                >
                  <div style={{
                    color: '#a855f7',
                    fontSize: isMobile ? '0.85rem' : '0.95rem',
                    fontWeight: 600,
                    marginBottom: '12px',
                    letterSpacing: '0.3px'
                  }}>
                    🎁 เด็กสูงไม่เกิน 100 ซม
                  </div>
                  <div style={{
                    color: '#10b981',
                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                    fontWeight: 700,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}>
                    ทานฟรี!
                  </div>
                </div>
              </div>
            </div>

            {tablesLoading ? (
              <div style={{
                textAlign: 'center',
                color: '#a1a1a1',
                padding: '60px 40px',
                fontSize: '1rem',
                background: 'rgba(26, 26, 26, 0.5)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                  fontSize: '2rem',
                  marginBottom: '16px'
                }}>🔄</div>
                <div>กำลังโหลด...</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile 
                  ? 'repeat(2, 1fr)' 
                  : 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: isMobile ? '16px' : '20px'
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tableNum) => {
                  const tableNumber = tableNum.toString();
                  const isReady = tableStatuses[tableNumber] || false;
                  return (
                    <div
                      key={tableNum}
                      style={{
                        background: isReady 
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(26, 26, 26, 0.95) 100%)'
                          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(26, 26, 26, 0.95) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        padding: isMobile ? '24px' : '28px',
                        border: isReady 
                          ? '1px solid rgba(16, 185, 129, 0.3)' 
                          : '1px solid rgba(239, 68, 68, 0.3)',
                        textAlign: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isReady 
                          ? '0 4px 20px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                          : '0 4px 20px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                        e.currentTarget.style.boxShadow = isReady
                          ? '0 12px 32px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.4)'
                          : '0 12px 32px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = isReady 
                          ? '0 4px 20px rgba(16, 185, 129, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                          : '0 4px 20px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <div style={{
                        fontSize: isMobile ? '2.5rem' : '3rem',
                        marginBottom: '16px',
                        filter: isReady ? 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.3))' : 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.3))',
                        transition: 'all 0.3s ease'
                      }}>
                        🪑
                      </div>
                      <div style={{
                        color: '#fff',
                        fontSize: isMobile ? '1.1rem' : '1.25rem',
                        fontWeight: 700,
                        marginBottom: '16px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.02em'
                      }}>
                        โต๊ะ {tableNumber}
                      </div>
                      <div style={{
                        padding: isMobile ? '8px 16px' : '10px 20px',
                        borderRadius: '12px',
                        background: isReady 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        fontSize: isMobile ? '0.85rem' : '0.9rem',
                        fontWeight: 600,
                        marginBottom: isReady ? '16px' : '16px',
                        display: 'inline-block',
                        boxShadow: isReady 
                          ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                          : '0 4px 12px rgba(239, 68, 68, 0.3)'
                      }}>
                        {isReady ? '✓ พร้อมใช้งาน' : '✗ ยังไม่พร้อม'}
                      </div>
                      {!isReady && (
                        <button
                          onClick={() => updateTableStatus(tableNumber, true)}
                          style={{
                            width: '100%',
                            padding: isMobile ? '12px' : '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: isMobile ? '0.85rem' : '0.9rem',
                            fontWeight: 600,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                          }}
                        >
                          เปิดใช้งาน
                        </button>
                      )}
                      {isReady && (
                        <div style={{
                          marginTop: '16px',
                          padding: isMobile ? '10px' : '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          borderRadius: '10px',
                          fontSize: isMobile ? '0.8rem' : '0.85rem',
                          color: '#10b981',
                          fontWeight: 600,
                          border: '1px solid rgba(16, 185, 129, 0.2)'
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
              gap: '12px'
            }}>
              <h2 style={{
                color: '#fff',
                fontSize: '1.25rem',
                fontWeight: 600,
                margin: 0
              }}>
                💰 สรุปยอดเงิน
              </h2>
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Period Selector */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  background: '#1a1a1a',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid #2a2a2a'
                }}>
                  {(['today', 'week', 'month', 'all'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setCashflowPeriod(period)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: cashflowPeriod === period ? '#10b981' : 'transparent',
                        color: cashflowPeriod === period ? '#fff' : '#a1a1a1',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
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
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #2a2a2a',
                    background: '#262626',
                    color: cashflowLoading ? '#737373' : '#fff',
                    cursor: cashflowLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cashflowLoading ? 'กำลังโหลด...' : '🔄 รีเฟรช'}
                </button>
                <button
                  onClick={async () => {
                    const result = await Swal.fire({
                      icon: 'warning',
                      title: 'ยืนยันการรีเซ็ตข้อมูล',
                      html: `
                        <div style="text-align: center;">
                          <div style="font-size: 1.1rem; margin-bottom: 10px;">
                            คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลรายได้ทั้งหมด?
                          </div>
                          <div style="color: #ef4444; font-weight: 600;">
                            ⚠️ การกระทำนี้ไม่สามารถยกเลิกได้!
                          </div>
                        </div>
                      `,
                      showCancelButton: true,
                      confirmButtonText: 'ยืนยันลบ',
                      cancelButtonText: 'ยกเลิก',
                      confirmButtonColor: '#ef4444',
                      cancelButtonColor: '#6b7280',
                      reverseButtons: true
                    });
                    
                    if (result.isConfirmed) {
                      try {
                        const response = await fetch('/api/cashflow', {
                          method: 'DELETE',
                        });
                        const data = await response.json();
                        if (response.ok) {
                          await Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ!',
                            text: 'รีเซ็ตข้อมูลรายได้เรียบร้อยแล้ว',
                            confirmButtonColor: '#10b981',
                            confirmButtonText: 'ตกลง'
                          });
                          fetchCashflowData();
                        } else {
                          await Swal.fire({
                            icon: 'error',
                            title: 'เกิดข้อผิดพลาด',
                            text: data.error || 'Unknown error',
                            confirmButtonColor: '#ef4444'
                          });
                        }
                      } catch (error) {
                        console.error('Error resetting cashflow:', error);
                        await Swal.fire({
                          icon: 'error',
                          title: 'เกิดข้อผิดพลาด',
                          text: 'เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล',
                          confirmButtonColor: '#ef4444'
                        });
                      }
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#ef4444';
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
                color: '#a1a1a1'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #2a2a2a',
                  borderTopColor: '#10b981',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: '#737373' }}>กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <div>
                {/* Today's Summary */}
                <div style={{
                  marginBottom: '24px'
                }}>
                  <h3 style={{
                    color: '#f97316',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    marginBottom: '16px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #2a2a2a'
                  }}>
                    📅 รายได้วันนี้
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    {/* Today Total Revenue */}
                    <div style={{
                      background: '#1a1a1a',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#262626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          border: '1px solid #333'
                        }}>
                          💵
                        </div>
                        <div>
                          <div style={{
                            color: '#737373',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}>
                            รายได้รวมวันนี้
                          </div>
                        </div>
                      </div>
                      <div style={{
                        color: '#10b981',
                        fontSize: '2rem',
                        fontWeight: 600,
                        marginTop: '8px'
                      }}>
                        ฿{cashflowData.todayRevenue.toLocaleString()}
                      </div>
                    </div>

                    {/* Today Orders Count */}
                    <div style={{
                      background: '#1a1a1a',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#262626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          border: '1px solid #333'
                        }}>
                          📋
                        </div>
                        <div>
                          <div style={{
                            color: '#737373',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}>
                            คำสั่งซื้อที่เสร็จสิ้น
                          </div>
                        </div>
                      </div>
                      <div style={{
                        color: '#a855f7',
                        fontSize: '2rem',
                        fontWeight: 600,
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
                    gap: '12px'
                  }}>
                    <div style={{
                      background: '#1a1a1a',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{
                        color: '#737373',
                        fontSize: '0.8rem',
                        marginBottom: '6px'
                      }}>
                        🍽️ รายได้จากอาหาร
                      </div>
                      <div style={{
                        color: '#fff',
                        fontSize: '1.5rem',
                        fontWeight: 600
                      }}>
                        ฿{cashflowData.todayFoodRevenue.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      background: '#1a1a1a',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{
                        color: '#737373',
                        fontSize: '0.8rem',
                        marginBottom: '6px'
                      }}>
                        💰 รายได้จากบุฟเฟ่ต์
                      </div>
                      <div style={{
                        color: '#fff',
                        fontSize: '1.5rem',
                        fontWeight: 600
                      }}>
                        ฿{cashflowData.todayBuffetRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                {dailyBreakdown.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{
                      color: '#f97316',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      marginBottom: '16px',
                      paddingBottom: '10px',
                      borderBottom: '1px solid #2a2a2a'
                    }}>
                      📊 กราฟแสดงรายได้
                    </h3>
                    
                    {/* Daily Revenue Line Chart */}
                    <div style={{
                      background: '#1a1a1a',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #2a2a2a',
                      marginBottom: '16px'
                    }}>
                      <h4 style={{
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 600,
                        marginBottom: '16px'
                      }}>
                        📈 รายได้รายวัน
                      </h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart
                          data={dailyBreakdown.slice().reverse()}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#737373"
                            tick={{ fill: '#737373', fontSize: 11 }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getDate()}/${date.getMonth() + 1}`;
                            }}
                          />
                          <YAxis 
                            stroke="#737373"
                            tick={{ fill: '#737373', fontSize: 11 }}
                            tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #2a2a2a',
                              borderRadius: '8px',
                              color: '#fff'
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
                            wrapperStyle={{ color: '#737373' }}
                            iconType="line"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="totalRevenue" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 3 }}
                            activeDot={{ r: 5 }}
                            name="รายได้รวม"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="foodRevenue" 
                            stroke="#f97316" 
                            strokeWidth={2}
                            dot={{ fill: '#f97316', r: 3 }}
                            name="รายได้อาหาร"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="buffetRevenue" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 3 }}
                            name="รายได้บุฟเฟ่ต์"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Revenue by Type Bar Chart */}
                    <div style={{
                      background: '#1a1a1a',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #2a2a2a',
                      marginBottom: '16px'
                    }}>
                      <h4 style={{
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 600,
                        marginBottom: '16px'
                      }}>
                        📊 รายได้รายวัน (Bar Chart)
                      </h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={dailyBreakdown.slice().reverse()}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#737373"
                            tick={{ fill: '#737373', fontSize: 11 }}
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return `${date.getDate()}/${date.getMonth() + 1}`;
                            }}
                          />
                          <YAxis 
                            stroke="#737373"
                            tick={{ fill: '#737373', fontSize: 11 }}
                            tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #2a2a2a',
                              borderRadius: '8px',
                              color: '#fff'
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
                            wrapperStyle={{ color: '#737373' }}
                          />
                          <Bar 
                            dataKey="foodRevenue" 
                            fill="#f97316" 
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
              background: '#1a1a1a',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              border: '1px solid #2a2a2a'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '20px'
            }}>
              อัปเดตสถานะคำสั่งซื้อ
            </h2>
            <p style={{
              color: '#737373',
              marginBottom: '20px',
              fontSize: '0.9rem'
            }}>
              โต๊ะ {selectedOrder.tableNumber} - ฿{selectedOrder.totalPrice.toLocaleString()}
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '20px'
            }}>
              {(['pending', 'preparing', 'ready', 'served', 'paid'] as Order['status'][]).map((status) => (
                <button
                  key={status}
                  onClick={() => updateOrderStatus(selectedOrder._id, status)}
                  disabled={selectedOrder.status === status}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: selectedOrder.status === status ? 'none' : '1px solid #333',
                    background: selectedOrder.status === status
                      ? getStatusColor(status)
                      : '#262626',
                    color: selectedOrder.status === status ? 'white' : '#a1a1a1',
                    cursor: selectedOrder.status === status ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    opacity: selectedOrder.status === status ? 1 : 1
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
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: '#a1a1a1',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500
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
              background: '#1a1a1a',
              borderRadius: isMobile ? '16px' : '12px',
              padding: isMobile ? '20px' : '24px',
              maxWidth: isMobile ? '95%' : '400px',
              width: '100%',
              border: '1px solid #2a2a2a'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: '#fff',
              fontSize: isMobile ? '1rem' : '1.1rem',
              fontWeight: 600,
              marginBottom: isMobile ? '10px' : '12px'
            }}>
              ยืนยันการลบคำสั่งซื้อ
            </h2>
            <p style={{
              color: '#737373',
              marginBottom: '6px',
              fontSize: '0.9rem'
            }}>
              คุณต้องการลบคำสั่งซื้อนี้หรือไม่?
            </p>
            <p style={{
              color: '#fff',
              marginBottom: '16px',
              fontSize: '1rem',
              fontWeight: 500
            }}>
              โต๊ะ {orderToDelete.tableNumber} - ฿{orderToDelete.totalPrice.toLocaleString()}
            </p>
            <p style={{
              color: '#ef4444',
              marginBottom: '20px',
              fontSize: '0.85rem'
            }}>
              ⚠️ การกระทำนี้ไม่สามารถยกเลิกได้
            </p>
            <div style={{
              display: 'flex',
              gap: '10px'
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
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                ลบ
              </button>
              <button
                onClick={() => setOrderToDelete(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#262626',
                  color: '#a1a1a1',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500
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
            padding: isMobile ? '12px' : '20px'
          }}
          onClick={() => setTableToOpen(null)}
        >
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: isMobile ? '16px' : '20px',
              padding: isMobile ? '20px' : '32px',
              maxWidth: isMobile ? '95%' : '500px',
              width: '100%',
              border: '1px solid #2a2a2a',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: '#fff',
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: 600,
              marginBottom: '6px',
              textAlign: 'center'
            }}>
              เปิดใช้งานโต๊ะ {tableToOpen}
            </h2>
            <p style={{
              color: '#737373',
              fontSize: isMobile ? '0.85rem' : '0.9rem',
              marginBottom: isMobile ? '20px' : '24px',
              textAlign: 'center'
            }}>
              กรุณาเลือกจำนวนคน
            </p>

            {/* Adult Count */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}>
                  👤 ราคาผู้ใหญ่ ท่านละ 199.-
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, adultCount: Math.max(0, prev.adultCount - 1) }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#262626',
                      color: '#a1a1a1',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    minWidth: '36px',
                    textAlign: 'center'
                  }}>
                    {billForm.adultCount}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, adultCount: prev.adultCount + 1 }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#10b981',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#737373',
                fontSize: '0.85rem',
                textAlign: 'right'
              }}>
                = ฿{(billForm.adultCount * 199).toLocaleString()}
              </div>
            </div>

            {/* Child 120cm Count */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}>
                  👶 เด็กสูงไม่เกิน 120 ซม ราคา 130.- (รวมเครื่องดื่ม)
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child120Count: Math.max(0, prev.child120Count - 1) }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#262626',
                      color: '#a1a1a1',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    minWidth: '36px',
                    textAlign: 'center'
                  }}>
                    {billForm.child120Count}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child120Count: prev.child120Count + 1 }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#eab308',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#737373',
                fontSize: '0.85rem',
                textAlign: 'right'
              }}>
                = ฿{(billForm.child120Count * 130).toLocaleString()}
              </div>
            </div>

            {/* Child 100cm Count */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}>
                  🎁 เด็กสูงไม่เกิน 100 ซม ทานฟรี!
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child100Count: Math.max(0, prev.child100Count - 1) }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#262626',
                      color: '#a1a1a1',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    minWidth: '36px',
                    textAlign: 'center'
                  }}>
                    {billForm.child100Count}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, child100Count: prev.child100Count + 1 }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#a855f7',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#10b981',
                fontSize: '0.85rem',
                textAlign: 'right'
              }}>
                ฟรี
              </div>
            </div>

            {/* Drink Refill Count */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{
                  color: '#fff',
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}>
                  🥤 น้ำรีฟิลเติมสะใจ! 39.-
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, drinkRefillCount: Math.max(0, prev.drinkRefillCount - 1) }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      background: '#262626',
                      color: '#a1a1a1',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    -
                  </button>
                  <span style={{
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    minWidth: '36px',
                    textAlign: 'center'
                  }}>
                    {billForm.drinkRefillCount}
                  </span>
                  <button
                    onClick={() => setBillForm(prev => ({ ...prev, drinkRefillCount: prev.drinkRefillCount + 1 }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#3b82f6',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{
                color: '#737373',
                fontSize: '0.85rem',
                textAlign: 'right'
              }}>
                = ฿{(billForm.drinkRefillCount * 39).toLocaleString()}
              </div>
            </div>

            {/* Total */}
            <div style={{
              padding: '16px',
              background: '#262626',
              borderRadius: '10px',
              border: '1px solid #10b981',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  รวมทั้งหมด:
                </span>
                <span style={{
                  color: '#10b981',
                  fontSize: '1.5rem',
                  fontWeight: 600
                }}>
                  ฿{calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px'
            }}>
              <button
                onClick={saveTableBill}
                disabled={savingBill || (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) ? '#333' : '#10b981',
                  color: (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) ? '#737373' : 'white',
                  cursor: (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  opacity: savingBill ? 0.6 : 1
                }}
              >
                {savingBill ? 'กำลังบันทึก...' : '💾 บันทึกและเปิดโต๊ะ'}
              </button>
              <button
                onClick={() => setTableToOpen(null)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#262626',
                  color: '#a1a1a1',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 500
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

      {/* Change Password Modal */}
      {showChangePasswordModal && (
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
            padding: '20px',
          }}
          onClick={() => {
            setShowChangePasswordModal(false);
            setPasswordForm({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
            setPasswordError('');
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid #2a2a2a',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2
                style={{
                  color: '#fff',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                🔑 เปลี่ยนรหัสผ่าน
              </h2>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setPasswordError('');
                }}
                style={{
                  background: '#262626',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  color: '#a1a1a1',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {passwordError && (
              <div
                style={{
                  background: '#262626',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                }}
              >
                {passwordError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#a1a1a1',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                รหัสผ่านเดิม
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                disabled={changingPassword}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#262626',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  opacity: changingPassword ? 0.6 : 1,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                onBlur={(e) => (e.target.style.borderColor = '#333')}
                placeholder="กรอกรหัสผ่านเดิม"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#a1a1a1',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                รหัสผ่านใหม่
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                disabled={changingPassword}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#262626',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  opacity: changingPassword ? 0.6 : 1,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                onBlur={(e) => (e.target.style.borderColor = '#333')}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#a1a1a1',
                  fontSize: '0.85rem',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                disabled={changingPassword}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#262626',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  opacity: changingPassword ? 0.6 : 1,
                }}
                onFocus={(e) => (e.target.style.borderColor = '#10b981')}
                onBlur={(e) => (e.target.style.borderColor = '#333')}
                placeholder="ยืนยันรหัสผ่านใหม่"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleChangePassword();
                  }
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setPasswordError('');
                }}
                disabled={changingPassword}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '1px solid #333',
                  background: '#262626',
                  color: '#a1a1a1',
                  cursor: changingPassword ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  opacity: changingPassword ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!changingPassword) {
                    e.currentTarget.style.background = '#333';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!changingPassword) {
                    e.currentTarget.style.background = '#262626';
                    e.currentTarget.style.color = '#a1a1a1';
                  }
                }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: changingPassword ? '#333' : '#10b981',
                  color: '#fff',
                  cursor: changingPassword ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  transition: 'background 0.2s',
                  opacity: changingPassword ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!changingPassword) {
                    e.currentTarget.style.background = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!changingPassword) {
                    e.currentTarget.style.background = '#10b981';
                  }
                }}
              >
                {changingPassword ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

