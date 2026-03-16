'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

export default function CashflowPage() {
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
  const [individualPayments, setIndividualPayments] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchCashflowData();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      if (!document.hidden) fetchCashflowData();
    }, 30000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchCashflowData();
        intervalRef.current = setInterval(() => {
          if (!document.hidden) fetchCashflowData();
        }, 30000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [cashflowPeriod]);

  const fetchCashflowData = async () => {
    try {
      setCashflowLoading(true);

      const response = await fetch(`/api/cashflow?period=${cashflowPeriod}`);
      const data = await response.json();

      if (data.success) {
        const summary = data.summary || {};

        const todayResponse = await fetch('/api/cashflow?period=today');
        const todayData = await todayResponse.json();
        const todaySummary = todayData.summary || summary;

        const safeParse = (value: any) => {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0 : parsed;
        };

        setCashflowData({
          todayRevenue: safeParse(todaySummary.totalRevenue),
          totalRevenue: safeParse(summary.totalRevenue),
          todayFoodRevenue: safeParse(todaySummary.totalFoodRevenue),
          todayBuffetRevenue: safeParse(todaySummary.totalBuffetRevenue),
          totalFoodRevenue: safeParse(summary.totalFoodRevenue),
          totalBuffetRevenue: safeParse(summary.totalBuffetRevenue),
          todayOrdersCount: parseInt(todaySummary.totalOrdersCount) || 0,
          totalOrdersCount: parseInt(summary.totalOrdersCount) || 0,
          todayTablesCount: parseInt(todaySummary.uniqueTablesCount) || 0,
        });

        setDailyBreakdown(Array.isArray(data.dailyBreakdown) ? data.dailyBreakdown : []);
        setTableBreakdown(Array.isArray(data.tableBreakdown) ? data.tableBreakdown : []);
        setIndividualPayments(Array.isArray(data.individualPayments) ? data.individualPayments : []);
      } else {
        setCashflowData({
          todayRevenue: 0, totalRevenue: 0,
          todayFoodRevenue: 0, todayBuffetRevenue: 0,
          totalFoodRevenue: 0, totalBuffetRevenue: 0,
          todayOrdersCount: 0, totalOrdersCount: 0, todayTablesCount: 0,
        });
        setDailyBreakdown([]);
        setTableBreakdown([]);
        setIndividualPayments([]);
      }
    } catch (error) {
      console.error('Error fetching cashflow data:', error);
      setCashflowData({
        todayRevenue: 0, totalRevenue: 0,
        todayFoodRevenue: 0, todayBuffetRevenue: 0,
        totalFoodRevenue: 0, totalBuffetRevenue: 0,
        todayOrdersCount: 0, totalOrdersCount: 0, todayTablesCount: 0,
      });
      setDailyBreakdown([]);
      setTableBreakdown([]);
      setIndividualPayments([]);
    } finally {
      setCashflowLoading(false);
    }
  };

  const CARD = { background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' } as const;
  const GRID_TOOLTIP = { backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' };

  const handleReset = async () => {
    const result = await Swal.fire({
      icon: 'warning', title: 'ยืนยันการรีเซ็ต',
      text: 'ลบข้อมูลรายได้ทั้งหมด? การกระทำนี้ไม่สามารถยกเลิกได้',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันลบ', cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444', cancelButtonColor: '#374151',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch('/api/cashflow', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'รีเซ็ตข้อมูลเรียบร้อย', confirmButtonColor: '#10b981' });
        fetchCashflowData();
      } else {
        await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: data.error || 'Unknown error', confirmButtonColor: '#ef4444' });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล', confirmButtonColor: '#ef4444' });
    }
  };

  const handleExportExcel = () => {
    const PERIOD_LABEL: Record<string, string> = { today: 'วันนี้', week: '7วัน', month: '30วัน', all: 'ทั้งหมด' };
    const label = PERIOD_LABEL[cashflowPeriod];
    const now = new Date();
    const exportedAt = now.toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'short' });
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const thDate = (d: any) => new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const thDateTime = (d: any) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' });
    const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: ภาพรวม (Overview) ──────────────────────────────────
    const avgPerTable = cashflowData.todayTablesCount > 0
      ? Math.round(cashflowData.todayRevenue / cashflowData.todayTablesCount) : 0;
    const totalAvgPerTable = cashflowData.totalOrdersCount > 0 && tableBreakdown.length > 0
      ? Math.round(cashflowData.totalRevenue / tableBreakdown.length) : 0;
    const foodPct = cashflowData.totalRevenue > 0
      ? ((cashflowData.totalFoodRevenue / cashflowData.totalRevenue) * 100).toFixed(1) : '0.0';
    const buffetPct = cashflowData.totalRevenue > 0
      ? ((cashflowData.totalBuffetRevenue / cashflowData.totalRevenue) * 100).toFixed(1) : '0.0';

    const overviewRows = [
      ['รายงานสรุปยอดเงิน — ตัวอักษรร้านอาหาร'],
      [`ช่วงเวลา: ${label}`, '', `ส่งออกเมื่อ: ${exportedAt}`],
      [],
      ['', '── วันนี้ ──', `── รวม (${label}) ──`],
      ['รายได้รวม (฿)', cashflowData.todayRevenue, cashflowData.totalRevenue],
      ['รายได้จากอาหาร (฿)', cashflowData.todayFoodRevenue, cashflowData.totalFoodRevenue],
      ['รายได้จากบุฟเฟ่ต์ (฿)', cashflowData.todayBuffetRevenue, cashflowData.totalBuffetRevenue],
      ['คำสั่งซื้อ (รายการ)', cashflowData.todayOrdersCount, cashflowData.totalOrdersCount],
      ['โต๊ะที่เปิด (โต๊ะ)', cashflowData.todayTablesCount, tableBreakdown.length],
      ['ค่าเฉลี่ยต่อโต๊ะ (฿)', avgPerTable, totalAvgPerTable],
      [],
      ['สัดส่วนรายได้ (ช่วงที่เลือก)', '', ''],
      ['อาหาร', `${foodPct}%`, baht(cashflowData.totalFoodRevenue) + ' ฿'],
      ['บุฟเฟ่ต์', `${buffetPct}%`, baht(cashflowData.totalBuffetRevenue) + ' ฿'],
      ['รวม', '100%', baht(cashflowData.totalRevenue) + ' ฿'],
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
    wsOverview['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, 'ภาพรวม');

    // ── Sheet 2: รายการชำระเงิน (Individual Payments) ──────────────
    if (individualPayments.length > 0) {
      const payRows = [
        ['#', 'วันที่-เวลา', 'โต๊ะ', 'รายได้อาหาร (฿)', 'รายได้บุฟเฟ่ต์ (฿)', 'รวม (฿)', 'คำสั่งซื้อ', 'ช่องทางชำระ', 'หมายเหตุ'],
        ...individualPayments.map((p, i) => [
          i + 1,
          thDateTime(p.paidAt),
          `โต๊ะ ${p.tableNumber}`,
          p.foodRevenue,
          p.buffetRevenue,
          p.totalRevenue,
          p.ordersCount,
          p.paymentMethod === 'cash' ? 'เงินสด' : p.paymentMethod,
          p.notes || '',
        ]),
        [],
        ['', 'รวมทั้งหมด', '',
          individualPayments.reduce((s, p) => s + p.foodRevenue, 0),
          individualPayments.reduce((s, p) => s + p.buffetRevenue, 0),
          individualPayments.reduce((s, p) => s + p.totalRevenue, 0),
          individualPayments.reduce((s, p) => s + p.ordersCount, 0),
          '', '',
        ],
      ];
      const wsPayments = XLSX.utils.aoa_to_sheet(payRows);
      wsPayments['!cols'] = [
        { wch: 5 }, { wch: 20 }, { wch: 8 },
        { wch: 16 }, { wch: 18 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 24 },
      ];
      // Freeze top row
      wsPayments['!freeze'] = { xSplit: 0, ySplit: 1 };
      // Auto-filter
      wsPayments['!autofilter'] = { ref: `A1:I1` };
      XLSX.utils.book_append_sheet(wb, wsPayments, 'รายการชำระเงิน');
    }

    // ── Sheet 3: รายได้รายวัน ───────────────────────────────────────
    if (dailyBreakdown.length > 0) {
      const totalFood = dailyBreakdown.reduce((s, d) => s + d.foodRevenue, 0);
      const totalBuf  = dailyBreakdown.reduce((s, d) => s + d.buffetRevenue, 0);
      const totalRev  = dailyBreakdown.reduce((s, d) => s + d.totalRevenue, 0);
      const totalOrd  = dailyBreakdown.reduce((s, d) => s + d.ordersCount, 0);
      const dailyRows = [
        ['วันที่', 'รายได้อาหาร (฿)', 'รายได้บุฟเฟ่ต์ (฿)', 'รวม (฿)', 'คำสั่งซื้อ', 'จำนวนบิล', '% อาหาร', '% บุฟเฟ่ต์'],
        ...dailyBreakdown.map(d => [
          thDate(d.date),
          d.foodRevenue,
          d.buffetRevenue,
          d.totalRevenue,
          d.ordersCount,
          d.paymentsCount,
          d.totalRevenue > 0 ? parseFloat(((d.foodRevenue / d.totalRevenue) * 100).toFixed(1)) : 0,
          d.totalRevenue > 0 ? parseFloat(((d.buffetRevenue / d.totalRevenue) * 100).toFixed(1)) : 0,
        ]),
        [],
        ['รวมทั้งหมด', totalFood, totalBuf, totalRev, totalOrd,
          dailyBreakdown.reduce((s, d) => s + d.paymentsCount, 0),
          totalRev > 0 ? parseFloat(((totalFood / totalRev) * 100).toFixed(1)) : 0,
          totalRev > 0 ? parseFloat(((totalBuf  / totalRev) * 100).toFixed(1)) : 0,
        ],
        ['ค่าเฉลี่ย/วัน',
          parseFloat((totalFood / dailyBreakdown.length).toFixed(2)),
          parseFloat((totalBuf  / dailyBreakdown.length).toFixed(2)),
          parseFloat((totalRev  / dailyBreakdown.length).toFixed(2)),
          parseFloat((totalOrd  / dailyBreakdown.length).toFixed(1)),
          '', '', '',
        ],
      ];
      const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
      wsDaily['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
      wsDaily['!freeze'] = { xSplit: 0, ySplit: 1 };
      wsDaily['!autofilter'] = { ref: 'A1:H1' };
      XLSX.utils.book_append_sheet(wb, wsDaily, 'รายได้รายวัน');
    }

    // ── Sheet 4: รายได้ตามโต๊ะ ─────────────────────────────────────
    if (tableBreakdown.length > 0) {
      const totalRev = tableBreakdown.reduce((s, t) => s + t.totalRevenue, 0);
      const tableRows = [
        ['โต๊ะ', 'รายได้อาหาร (฿)', 'รายได้บุฟเฟ่ต์ (฿)', 'รวม (฿)', 'คำสั่งซื้อ', 'จำนวนบิล', '% ของรายได้รวม'],
        ...tableBreakdown.map(t => [
          `โต๊ะ ${t.tableNumber}`,
          t.foodRevenue,
          t.buffetRevenue,
          t.totalRevenue,
          t.ordersCount,
          t.paymentsCount,
          totalRev > 0 ? parseFloat(((t.totalRevenue / totalRev) * 100).toFixed(1)) : 0,
        ]),
        [],
        ['รวมทั้งหมด',
          tableBreakdown.reduce((s, t) => s + t.foodRevenue, 0),
          tableBreakdown.reduce((s, t) => s + t.buffetRevenue, 0),
          totalRev,
          tableBreakdown.reduce((s, t) => s + t.ordersCount, 0),
          tableBreakdown.reduce((s, t) => s + t.paymentsCount, 0),
          100,
        ],
      ];
      const wsTable = XLSX.utils.aoa_to_sheet(tableRows);
      wsTable['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 16 }];
      wsTable['!freeze'] = { xSplit: 0, ySplit: 1 };
      wsTable['!autofilter'] = { ref: 'A1:G1' };
      XLSX.utils.book_append_sheet(wb, wsTable, 'รายได้ตามโต๊ะ');
    }

    XLSX.writeFile(wb, `cashflow_${label}_${dateStr}.xlsx`);
  };

  const periodLabel = { today: 'วันนี้', week: '7 วัน', month: '30 วัน', all: 'ทั้งหมด' };

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cf-spin { to { transform: rotate(360deg); } }` }} />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#f1f5f9', fontSize: '1.35rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>สรุปยอดเงิน</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>ภาพรวมรายได้และสถิติการขาย</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period tabs */}
          <div style={{ display: 'flex', gap: '2px', background: '#111827', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button key={p} onClick={() => setCashflowPeriod(p)} style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                background: cashflowPeriod === p ? '#10b981' : 'transparent',
                color: cashflowPeriod === p ? '#fff' : '#64748b',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s',
              }}>
                {periodLabel[p]}
              </button>
            ))}
          </div>
          <button onClick={fetchCashflowData} disabled={cashflowLoading} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#94a3b8', cursor: cashflowLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem', fontWeight: 500,
          }}>
            <svg style={{ width: 13, height: 13, animation: cashflowLoading ? 'cf-spin 1s linear infinite' : 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            รีเฟรช
          </button>
          <button onClick={handleExportExcel} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px',
            border: '1px solid rgba(16,185,129,0.4)', background: 'transparent',
            color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            Export Excel
          </button>
          <button onClick={handleReset} style={{
            padding: '8px 14px', borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.4)', background: 'transparent',
            color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            รีเซ็ต
          </button>
        </div>
      </div>

      {cashflowLoading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 12px', animation: 'cf-spin 1s linear infinite' }} />
          กำลังโหลดข้อมูล...
        </div>
      ) : (
        <div>
          {/* Today Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'รายได้วันนี้', value: `฿${cashflowData.todayRevenue.toLocaleString()}`, color: '#10b981', icon: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18a1 1 0 0 1-2 0v-1.07A4 4 0 0 1 8 13a1 1 0 0 1 2 0 2 2 0 0 0 4 0c0-1.1-1.34-1.84-2.6-2.28C9.72 10.06 8 9.07 8 7a4 4 0 0 1 3-3.86V2a1 1 0 0 1 2 0v1.14A4 4 0 0 1 16 7a1 1 0 0 1-2 0 2 2 0 0 0-4 0c0 .9 1.23 1.55 2.45 2C14.27 9.6 16 10.62 16 13a4 4 0 0 1-3 3.93z"/> },
              { label: 'รายได้อาหาร', value: `฿${cashflowData.todayFoodRevenue.toLocaleString()}`, color: '#f97316', icon: <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></> },
              { label: 'รายได้บุฟเฟ่ต์', value: `฿${cashflowData.todayBuffetRevenue.toLocaleString()}`, color: '#3b82f6', icon: <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></> },
              { label: 'คำสั่งซื้อวันนี้', value: `${cashflowData.todayOrdersCount} รายการ`, color: '#a78bfa', icon: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ ...CARD, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '8px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" style={{ width: 17, height: 17 }}>{icon}</svg>
                  </div>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 500 }}>{label}</span>
                </div>
                <div style={{ color, fontSize: '1.35rem', fontWeight: 700 }}>{value}</div>
                {label === 'รายได้อาหาร' && cashflowData.todayRevenue > 0 && (
                  <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>
                    {((cashflowData.todayFoodRevenue / cashflowData.todayRevenue) * 100).toFixed(1)}% ของรายได้รวม
                  </div>
                )}
                {label === 'รายได้บุฟเฟ่ต์' && cashflowData.todayRevenue > 0 && (
                  <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>
                    {((cashflowData.todayBuffetRevenue / cashflowData.todayRevenue) * 100).toFixed(1)}% ของรายได้รวม
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Today quick stats row */}
          {cashflowData.todayTablesCount > 0 && (
            <div style={{ ...CARD, padding: '16px 20px', marginBottom: '28px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {[
                { label: 'โต๊ะที่เปิดวันนี้', value: `${cashflowData.todayTablesCount} โต๊ะ`, color: '#10b981' },
                { label: 'คำสั่งซื้อ', value: `${cashflowData.todayOrdersCount} รายการ`, color: '#a78bfa' },
                { label: 'ค่าเฉลี่ย/โต๊ะ', value: `฿${cashflowData.todayTablesCount > 0 ? Math.round(cashflowData.todayRevenue / cashflowData.todayTablesCount).toLocaleString() : '0'}`, color: '#f97316' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ color: '#475569', fontSize: '0.75rem', marginBottom: '4px' }}>{label}</div>
                  <div style={{ color, fontSize: '1.05rem', fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          {dailyBreakdown.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>กราฟรายได้</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {/* Line chart */}
                <div style={{ ...CARD, padding: '20px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px' }}>รายได้รายวัน (Line)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyBreakdown.slice().reverse()} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }} />
                      <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={GRID_TOOLTIP} formatter={(v: any) => `฿${v.toLocaleString()}`} labelFormatter={(l) => new Date(l).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} />
                      <Legend wrapperStyle={{ color: '#64748b', fontSize: '0.75rem' }} iconType="line" />
                      <Line type="monotone" dataKey="totalRevenue" stroke="#10b981" strokeWidth={2} dot={false} name="รวม" />
                      <Line type="monotone" dataKey="foodRevenue" stroke="#f97316" strokeWidth={1.5} dot={false} name="อาหาร" />
                      <Line type="monotone" dataKey="buffetRevenue" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="บุฟเฟ่ต์" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Bar chart */}
                <div style={{ ...CARD, padding: '20px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px' }}>รายได้รายวัน (Bar)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dailyBreakdown.slice().reverse()} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }} />
                      <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={GRID_TOOLTIP} formatter={(v: any) => `฿${v.toLocaleString()}`} labelFormatter={(l) => new Date(l).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} />
                      <Legend wrapperStyle={{ color: '#64748b', fontSize: '0.75rem' }} />
                      <Bar dataKey="foodRevenue" fill="#f97316" name="อาหาร" radius={[3,3,0,0]} />
                      <Bar dataKey="buffetRevenue" fill="#3b82f6" name="บุฟเฟ่ต์" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Pie chart */}
              {(cashflowData.totalFoodRevenue > 0 || cashflowData.totalBuffetRevenue > 0) && (
                <div style={{ ...CARD, padding: '20px' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px' }}>สัดส่วนรายได้ ({periodLabel[cashflowPeriod]})</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={[{ name: 'อาหาร', value: cashflowData.totalFoodRevenue }, { name: 'บุฟเฟ่ต์', value: cashflowData.totalBuffetRevenue }]}
                        cx="50%" cy="50%" labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent||0)*100).toFixed(0)}%`}
                        outerRadius={85} dataKey="value">
                        <Cell fill="#f97316" /><Cell fill="#3b82f6" />
                      </Pie>
                      <Tooltip contentStyle={GRID_TOOLTIP} formatter={(v: any) => `฿${v.toLocaleString()}`} />
                      <Legend wrapperStyle={{ color: '#64748b', fontSize: '0.78rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Period total summary */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>รายได้รวม ({periodLabel[cashflowPeriod]})</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: '12px' }}>
              {[
                { label: 'รายได้รวม', value: `฿${cashflowData.totalRevenue.toLocaleString()}`, color: '#10b981' },
                { label: 'คำสั่งซื้อ', value: `${cashflowData.totalOrdersCount} รายการ`, color: '#a78bfa' },
                { label: 'รายได้อาหาร', value: `฿${cashflowData.totalFoodRevenue.toLocaleString()}`, color: '#f97316' },
                { label: 'รายได้บุฟเฟ่ต์', value: `฿${cashflowData.totalBuffetRevenue.toLocaleString()}`, color: '#3b82f6' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ ...CARD, padding: '16px 20px' }}>
                  <div style={{ color: '#475569', fontSize: '0.75rem', marginBottom: '8px' }}>{label}</div>
                  <div style={{ color, fontSize: '1.2rem', fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily breakdown table */}
          {dailyBreakdown.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>รายได้รายวัน</div>
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['วันที่', 'อาหาร', 'บุฟเฟ่ต์', 'คำสั่งซื้อ', 'รวม'].map((h) => (
                        <th key={h} style={{ padding: '11px 16px', color: '#475569', fontWeight: 600, textAlign: h === 'วันที่' ? 'left' : 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dailyBreakdown.map((day, i) => (
                      <tr key={i} style={{ borderBottom: i < dailyBreakdown.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                          {new Date(day.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#f97316', textAlign: 'right' }}>฿{day.foodRevenue.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', color: '#3b82f6', textAlign: 'right' }}>฿{day.buffetRevenue.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'right' }}>{day.ordersCount}</td>
                        <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>฿{day.totalRevenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table breakdown */}
          {tableBreakdown.length > 0 && (
            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>รายได้ตามโต๊ะ</div>
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['โต๊ะ', 'อาหาร', 'บุฟเฟ่ต์', 'คำสั่งซื้อ', 'รวม'].map((h) => (
                        <th key={h} style={{ padding: '11px 16px', color: '#475569', fontWeight: 600, textAlign: h === 'โต๊ะ' ? 'left' : 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableBreakdown.map((t, i) => (
                      <tr key={i} style={{ borderBottom: i < tableBreakdown.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1', fontWeight: 600 }}>โต๊ะ {t.tableNumber}</td>
                        <td style={{ padding: '12px 16px', color: '#f97316', textAlign: 'right' }}>฿{t.foodRevenue.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', color: '#3b82f6', textAlign: 'right' }}>฿{t.buffetRevenue.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'right' }}>{t.ordersCount}</td>
                        <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>฿{t.totalRevenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
