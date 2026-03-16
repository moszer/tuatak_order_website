'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function TablesPage() {
  const [tableStatuses, setTableStatuses] = useState<Record<string, boolean>>({});
  const [tableToOpen, setTableToOpen] = useState<string | null>(null);
  const [billForm, setBillForm] = useState({
    adultCount: 0,
    child120Count: 0,
    child100Count: 0,
    drinkRefillCount: 0,
  });
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [customTotal, setCustomTotal] = useState<string>('');
  const [tablesLoading, setTablesLoading] = useState(false);
  const [savingBill, setSavingBill] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchTableStatuses();
  }, []);

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
        setBillForm({ adultCount: 0, child120Count: 0, child100Count: 0, drinkRefillCount: 0 });
        setUseCustomTotal(false);
        setCustomTotal('');
        return;
      }

      // If closing table, just update status
      const response = await fetch('/api/tables/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber, isReady }),
      });
      const data = await response.json();
      if (response.ok) {
        setTableStatuses(prev => ({ ...prev, [tableNumber]: isReady }));
      } else {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to update table status',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (error) {
      console.error('Error updating table status:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'Error updating table status: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const calculateTotal = () => {
    const adultTotal = billForm.adultCount * 199;
    const child120Total = billForm.child120Count * 130;
    const drinkTotal = billForm.drinkRefillCount * 39;
    return adultTotal + child120Total + drinkTotal;
  };

  const saveTableBill = async () => {
    if (!tableToOpen) return;

    let parsedCustomTotal: number | null = null;
    if (useCustomTotal && customTotal.trim() !== '') {
      const value = Number(customTotal.replace(/,/g, ''));
      if (!isNaN(value) && value >= 0) {
        parsedCustomTotal = value;
      }
    }

    if (!useCustomTotal || !parsedCustomTotal) {
      if (billForm.adultCount === 0 && billForm.child120Count === 0 && billForm.child100Count === 0) {
        await Swal.fire({
          icon: 'warning', title: 'แจ้งเตือน',
          text: 'กรุณาเลือกจำนวนคนอย่างน้อย 1 คน หรือใส่ยอดเอง',
          confirmButtonColor: '#f97316', confirmButtonText: 'ตกลง',
        });
        return;
      }
    }

    if (useCustomTotal) {
      if (!customTotal.trim() || parsedCustomTotal === null) {
        await Swal.fire({
          icon: 'warning', title: 'แจ้งเตือน',
          text: 'กรุณาใส่ยอดเงินที่ถูกต้อง',
          confirmButtonColor: '#f97316', confirmButtonText: 'ตกลง',
        });
        return;
      }
    }

    try {
      setSavingBill(true);

      const billResponse = await fetch('/api/tables/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tableToOpen,
          ...billForm,
          customTotalPrice: parsedCustomTotal,
        }),
      });
      const billData = await billResponse.json();

      if (!billResponse.ok) {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: billData.error || 'Failed to save bill',
          confirmButtonColor: '#ef4444',
        });
        return;
      }

      const statusResponse = await fetch('/api/tables/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: tableToOpen, isReady: true }),
      });
      const statusData = await statusResponse.json();

      if (statusResponse.ok) {
        setTableStatuses(prev => ({ ...prev, [tableToOpen]: true }));
        setTableToOpen(null);
        setBillForm({ adultCount: 0, child120Count: 0, child100Count: 0, drinkRefillCount: 0 });
      } else {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: statusData.error || 'Failed to update table status',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (error) {
      console.error('Error saving table bill:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'Error saving table bill: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    } finally {
      setSavingBill(false);
    }
  };

  const openCount = Object.values(tableStatuses).filter(Boolean).length;

  return (
    <div>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes tbl-spin { to { transform: rotate(360deg); } }
          .tbl-card {
            background: #111827; border: 1px solid rgba(255,255,255,0.07);
            border-radius: 12px; padding: 20px; text-align: center;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .tbl-card:hover { border-color: rgba(255,255,255,0.15); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
          .tbl-card.open { border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.05); }
          .tbl-counter-btn {
            width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12);
            background: #1e293b; color: #94a3b8; cursor: pointer; font-size: 1rem; font-weight: 600;
            display: flex; align-items: center; justify-content: center; transition: all 0.15s;
          }
          .tbl-counter-btn:hover { background: #273549; color: #e2e8f0; }
          .tbl-counter-btn.plus { background: #0d2b1f; border-color: rgba(16,185,129,0.4); color: #10b981; }
          .tbl-counter-btn.plus:hover { background: #0f3826; }
          .tbl-open-btn {
            width: 100%; padding: 9px; border-radius: 8px; border: none;
            background: #10b981; color: white; cursor: pointer;
            font-size: 0.85rem; font-weight: 600; margin-top: 12px;
            transition: background 0.15s;
          }
          .tbl-open-btn:hover { background: #059669; }
          .tbl-save-btn {
            flex: 1; padding: 11px; border-radius: 8px; border: none;
            background: #10b981; color: white; cursor: pointer; font-size: 0.9rem; font-weight: 600;
            transition: background 0.15s;
          }
          .tbl-save-btn:hover:not(:disabled) { background: #059669; }
          .tbl-save-btn:disabled { background: #1e293b; color: #4b5563; cursor: not-allowed; }
          .tbl-ghost-btn {
            padding: 11px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
            background: transparent; color: #64748b; cursor: pointer; font-size: 0.9rem;
            transition: all 0.15s;
          }
          .tbl-ghost-btn:hover { border-color: rgba(255,255,255,0.2); color: #94a3b8; }
          .tbl-manual-toggle {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
            background: transparent; color: #64748b; cursor: pointer; font-size: 0.8rem;
            transition: all 0.15s;
          }
          .tbl-manual-toggle.active {
            background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.4); color: #10b981;
          }
        `
      }} />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#f1f5f9', fontSize: '1.35rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>จัดการโต๊ะ</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0', fontWeight: 400 }}>
            เปิดอยู่ {openCount} / 10 โต๊ะ
          </p>
        </div>
        <button
          onClick={fetchTableStatuses}
          disabled={tablesLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 18px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#94a3b8',
            cursor: tablesLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.15s',
          }}
        >
          <svg style={{ width: 14, height: 14, animation: tablesLoading ? 'tbl-spin 1s linear infinite' : 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          รีเฟรช
        </button>
      </div>

      {/* Pricing Reference */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', marginBottom: '28px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ราคาบุฟเฟ่ต์</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
          {[
            { label: 'ผู้ใหญ่', price: '199', unit: 'ท่าน' },
            { label: 'เด็ก ≤120ซม (รวมเครื่องดื่ม)', price: '130', unit: 'ท่าน' },
            { label: 'เด็ก ≤100ซม', price: 'ฟรี', unit: '' },
            { label: 'น้ำรีฟิล', price: '39', unit: 'แก้ว' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '16px 20px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : undefined, borderBottom: isMobile && i < 2 ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
              <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '6px' }}>{item.label}</div>
              <div style={{ color: '#f1f5f9', fontSize: '1.05rem', fontWeight: 700 }}>
                {item.price === 'ฟรี' ? <span style={{ color: '#10b981' }}>ฟรี</span> : <>฿{item.price}{item.unit && <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 400 }}>/{item.unit}</span>}</>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Grid */}
      {tablesLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <svg style={{ width: 28, height: 28, animation: 'tbl-spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          กำลังโหลด...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: '12px' }}>
          {[1,2,3,4,5,6,7,8,9,10].map((tableNum) => {
            const tableNumber = tableNum.toString();
            const isOpen = tableStatuses[tableNumber] || false;
            return (
              <div key={tableNum} className={`tbl-card${isOpen ? ' open' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke={isOpen ? '#10b981' : '#4b5563'} strokeWidth="1.5" style={{ width: 36, height: 36, margin: '0 auto 10px', display: 'block' }}>
                  <rect x="3" y="10" width="18" height="3" rx="1"/><path d="M5 13v6M19 13v6M7 19h10"/>
                </svg>
                <div style={{ color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>โต๊ะ {tableNumber}</div>
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                  background: isOpen ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.15)',
                  color: isOpen ? '#10b981' : '#64748b',
                  border: `1px solid ${isOpen ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                }}>
                  {isOpen ? 'เปิดอยู่' : 'ว่าง'}
                </span>
                {!isOpen && (
                  <button className="tbl-open-btn" onClick={() => updateTableStatus(tableNumber, true)}>
                    เปิดโต๊ะ
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Open Table Modal */}
      {tableToOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
          onClick={() => setTableToOpen(null)}
        >
          <div
            style={{ background: '#111827', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 700 }}>เปิดโต๊ะ {tableToOpen}</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px' }}>เลือกจำนวนคนและประเภท</div>
            </div>

            {/* Counter rows */}
            <div style={{ padding: '20px 24px' }}>
              {([
                { key: 'adultCount', label: 'ผู้ใหญ่', sub: '199 บาท/ท่าน', price: 199 },
                { key: 'child120Count', label: 'เด็ก ≤120ซม', sub: '130 บาท/ท่าน (รวมเครื่องดื่ม)', price: 130 },
                { key: 'child100Count', label: 'เด็ก ≤100ซม', sub: 'ฟรี', price: 0 },
                { key: 'drinkRefillCount', label: 'น้ำรีฟิล', sub: '39 บาท/แก้ว', price: 39 },
              ] as { key: keyof typeof billForm; label: string; sub: string; price: number }[]).map(({ key, label, sub, price }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 500 }}>{label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>{sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button className="tbl-counter-btn" onClick={() => setBillForm(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}>−</button>
                    <span style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 600, minWidth: '28px', textAlign: 'center' }}>{billForm[key]}</span>
                    <button className="tbl-counter-btn plus" onClick={() => setBillForm(prev => ({ ...prev, [key]: prev[key] + 1 }))}>+</button>
                    {price > 0 && billForm[key] > 0 && (
                      <span style={{ color: '#64748b', fontSize: '0.8rem', minWidth: '60px', textAlign: 'right' }}>฿{(billForm[key] * price).toLocaleString()}</span>
                    )}
                    {price === 0 && billForm[key] > 0 && (
                      <span style={{ color: '#10b981', fontSize: '0.8rem', minWidth: '60px', textAlign: 'right' }}>ฟรี</span>
                    )}
                    {billForm[key] === 0 && <span style={{ minWidth: '60px' }} />}
                  </div>
                </div>
              ))}

              {/* Total row */}
              <div style={{ background: '#1e293b', borderRadius: '10px', padding: '16px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>รวมทั้งหมด</span>
                  <button className={`tbl-manual-toggle${useCustomTotal ? ' active' : ''}`} onClick={() => setUseCustomTotal(v => !v)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    ใส่ยอดเอง
                  </button>
                </div>
                {useCustomTotal ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '1rem' }}>฿</span>
                    <input
                      type="number" inputMode="decimal"
                      value={customTotal}
                      onChange={(e) => setCustomTotal(e.target.value)}
                      placeholder={calculateTotal().toString()}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '8px',
                        border: '1px solid rgba(16,185,129,0.4)', background: '#0d1117',
                        color: '#f1f5f9', fontSize: '1.1rem', fontWeight: 700, outline: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ color: '#10b981', fontSize: '1.4rem', fontWeight: 700 }}>฿{calculateTotal().toLocaleString()}</div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div style={{ padding: '0 24px 20px', display: 'flex', gap: '10px' }}>
              {(() => {
                const hasPeople = billForm.adultCount > 0 || billForm.child120Count > 0 || billForm.child100Count > 0;
                const hasValidManual = useCustomTotal && customTotal.trim() !== '' && !isNaN(Number(customTotal.replace(/,/g,''))) && Number(customTotal.replace(/,/g,'')) >= 0;
                const canSave = hasPeople || hasValidManual;
                return (
                  <button className="tbl-save-btn" onClick={saveTableBill} disabled={savingBill || !canSave}>
                    {savingBill ? 'กำลังบันทึก...' : 'บันทึกและเปิดโต๊ะ'}
                  </button>
                );
              })()}
              <button className="tbl-ghost-btn" onClick={() => setTableToOpen(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
