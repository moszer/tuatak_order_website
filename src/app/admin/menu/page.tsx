'use client';

import { useEffect, useState, useMemo } from 'react';
import { AddMenuItemModal, EditMenuItemModal } from '../components/MenuModals';
import { MenuItem } from '../types';
import Swal from 'sweetalert2';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function MenuPage() {
  const isMobile = useIsMobile();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchMenuItems();
  }, []);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (response.ok) {
        fetchMenuItems();
        setSelectedMenuItem(null);
      } else {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to update menu item',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'Error updating menu item: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const deleteMenuItem = async (itemId: number) => {
    try {
      const response = await fetch(`/api/menu/${itemId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        fetchMenuItems();
      } else {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to delete menu item',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'Error deleting menu item: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const addMenuItem = async (newItem: Omit<MenuItem, 'id'>) => {
    try {
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      const data = await response.json();
      if (response.ok) {
        fetchMenuItems();
        setShowAddMenuModal(false);
        await Swal.fire({
          icon: 'success', title: 'สำเร็จ!', text: 'เพิ่มเมนูสำเร็จ!',
          confirmButtonColor: '#10b981', confirmButtonText: 'ตกลง',
        });
      } else {
        await Swal.fire({
          icon: 'error', title: 'เกิดข้อผิดพลาด',
          text: data.error || 'Failed to add menu item',
          confirmButtonColor: '#ef4444',
        });
      }
    } catch (error) {
      console.error('Error adding menu item:', error);
      await Swal.fire({
        icon: 'error', title: 'เกิดข้อผิดพลาด',
        text: 'Error adding menu item: ' + (error instanceof Error ? error.message : 'Unknown error'),
        confirmButtonColor: '#ef4444',
      });
    }
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map(i => i.category))).filter(Boolean);
    return cats;
  }, [menuItems]);

  const filtered = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || item.nameTh.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menuItems, categoryFilter, search]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes menu-spin { to { transform:rotate(360deg); } }
        .menu-btn-primary { padding:9px 18px; border-radius:8px; border:none; background:#10b981; color:#fff; font-size:0.82rem; font-weight:600; cursor:pointer; transition:background 0.15s; font-family:inherit; display:flex; align-items:center; gap:7px; }
        .menu-btn-primary:hover { background:#059669; }
        .menu-btn-ghost { padding:8px 14px; border-radius:8px; border:1px solid #1e293b; background:transparent; color:#64748b; font-size:0.82rem; font-weight:500; cursor:pointer; transition:all 0.15s; font-family:inherit; display:flex; align-items:center; gap:6px; }
        .menu-btn-ghost:hover:not(:disabled) { border-color:#334155; color:#94a3b8; }
        .menu-btn-ghost:disabled { opacity:0.4; cursor:not-allowed; }
        .menu-cat-btn { padding:6px 14px; border-radius:6px; border:1px solid #1e293b; background:transparent; color:#64748b; font-size:0.78rem; font-weight:500; cursor:pointer; transition:all 0.15s; font-family:inherit; white-space:nowrap; }
        .menu-cat-btn:hover { border-color:#334155; color:#94a3b8; }
        .menu-cat-btn.active { background:#1e293b; border-color:#334155; color:#f1f5f9; font-weight:600; }
        .menu-row { display:grid; align-items:center; padding:14px 20px; border-bottom:1px solid #1a2332; transition:background 0.12s; gap:12px; }
        .menu-row:hover { background:#111827; }
        .menu-row:last-child { border-bottom:none; }
        .menu-action { padding:5px 11px; border-radius:6px; border:1px solid #1e293b; background:transparent; color:#64748b; font-size:0.75rem; font-weight:500; cursor:pointer; transition:all 0.15s; font-family:inherit; display:flex; align-items:center; gap:4px; }
        .menu-action:hover { border-color:#334155; color:#94a3b8; }
        .menu-action.danger { border-color:rgba(239,68,68,0.2); color:rgba(239,68,68,0.7); }
        .menu-action.danger:hover { background:rgba(239,68,68,0.08); color:#ef4444; border-color:rgba(239,68,68,0.4); }
        .menu-search { width:100%; padding:9px 14px 9px 38px; border-radius:8px; border:1px solid #1e293b; background:#0d1117; color:#f1f5f9; font-size:0.82rem; outline:none; transition:border-color 0.15s; font-family:inherit; box-sizing:border-box; }
        .menu-search:focus { border-color:#334155; }
        .menu-search::placeholder { color:#334155; }
        .menu-card { background:#0d1117; border:1px solid #1a2332; border-radius:10px; padding:14px; display:flex; gap:12px; align-items:flex-start; }
        .menu-card-body { flex:1; min-width:0; }
        .menu-card-actions { display:flex; gap:6px; flex-shrink:0; align-items:center; }
      `}} />

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', gap:'12px', flexWrap:'wrap' }}>
        <div>
          <h1 style={{ color:'#f1f5f9', fontSize:'1.25rem', fontWeight:700, margin:0 }}>จัดการเมนู</h1>
          <p style={{ color:'#475569', fontSize:'0.78rem', margin:'4px 0 0' }}>
            {menuItems.length} รายการ · {categories.length} หมวดหมู่
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <button className="menu-btn-ghost" onClick={fetchMenuItems} disabled={menuLoading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: menuLoading ? 'menu-spin 0.8s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            รีเฟรช
          </button>
          <button className="menu-btn-primary" onClick={() => setShowAddMenuModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            เพิ่มเมนู
          </button>
        </div>
      </div>

      {/* Search + Category filter */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:'200px', maxWidth:'320px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
            style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="menu-search"
            type="text"
            placeholder="ค้นหาเมนู..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          <button className={`menu-cat-btn${categoryFilter === 'all' ? ' active' : ''}`} onClick={() => setCategoryFilter('all')}>
            ทั้งหมด ({menuItems.length})
          </button>
          {categories.map(cat => (
            <button key={cat} className={`menu-cat-btn${categoryFilter === cat ? ' active' : ''}`} onClick={() => setCategoryFilter(cat)}>
              {cat} ({menuItems.filter(i => i.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Empty */}
      {menuLoading ? (
        <div style={{ padding:'48px', textAlign:'center' }}>
          <div style={{ width:'28px', height:'28px', border:'2px solid rgba(16,185,129,0.2)', borderTopColor:'#10b981', borderRadius:'50%', animation:'menu-spin 0.8s linear infinite', margin:'0 auto 12px' }} />
          <div style={{ color:'#475569', fontSize:'0.82rem' }}>กำลังโหลด...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#111827', border:'1px solid #1a2332', borderRadius:'12px', padding:'48px', textAlign:'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5" style={{ display:'block', margin:'0 auto 12px' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div style={{ color:'#334155', fontSize:'0.875rem' }}>{search || categoryFilter !== 'all' ? 'ไม่พบเมนูที่ค้นหา' : 'ยังไม่มีเมนู'}</div>
        </div>
      ) : isMobile ? (
        /* Mobile cards */
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {filtered.map(item => (
            <div key={item.id} className="menu-card">
              {item.image ? (
                <img src={item.image} alt={item.nameTh} style={{ width:'52px', height:'52px', borderRadius:'8px', objectFit:'cover', flexShrink:0, border:'1px solid #1e293b' }} />
              ) : (
                <div style={{ width:'52px', height:'52px', borderRadius:'8px', background:'#1e293b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'22px' }}>🍜</div>
              )}
              <div className="menu-card-body">
                <div style={{ color:'#f1f5f9', fontSize:'0.875rem', fontWeight:600, marginBottom:2 }}>{item.nameTh}</div>
                <div style={{ color:'#475569', fontSize:'0.72rem', marginBottom:6 }}>{item.name}</div>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ padding:'2px 8px', borderRadius:'5px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.15)', color:'#f97316', fontSize:'0.68rem', fontWeight:600 }}>{item.category}</span>
                  {item.isPopular && <span style={{ padding:'2px 7px', borderRadius:'4px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', color:'#eab308', fontSize:'0.65rem', fontWeight:600 }}>ยอดนิยม</span>}
                  {item.isSpicy && <span style={{ padding:'2px 7px', borderRadius:'4px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:'0.65rem', fontWeight:600 }}>เผ็ด</span>}
                  {item.isNew && <span style={{ padding:'2px 7px', borderRadius:'4px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#10b981', fontSize:'0.65rem', fontWeight:600 }}>ใหม่</span>}
                  <span style={{ marginLeft:'auto', color:'#10b981', fontSize:'0.9rem', fontWeight:700 }}>
                    {item.price === 0 ? <span style={{ color:'#475569', fontSize:'0.78rem', fontWeight:500 }}>บุฟเฟ่ต์</span> : `฿${item.price.toLocaleString()}`}
                  </span>
                </div>
              </div>
              <div className="menu-card-actions">
                <button className="menu-action" onClick={() => setSelectedMenuItem(item)} title="แก้ไข">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="menu-action danger" title="ลบ"
                  onClick={async () => {
                    const result = await Swal.fire({
                      icon: 'warning', title: 'ลบเมนู',
                      text: `ต้องการลบ "${item.nameTh}" หรือไม่?`,
                      showCancelButton: true,
                      confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก',
                      confirmButtonColor: '#ef4444', cancelButtonColor: '#334155',
                      reverseButtons: true,
                      background: '#0d1117', color: '#f1f5f9',
                    });
                    if (result.isConfirmed) deleteMenuItem(item.id);
                  }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div style={{ background:'#111827', border:'1px solid #1a2332', borderRadius:'12px', overflow:'hidden' }}>
          <div style={{
            display:'grid', gridTemplateColumns:'2fr 1fr 120px 100px 80px',
            padding:'10px 20px', background:'#0d1117', borderBottom:'1px solid #1a2332',
            gap:'12px',
          }}>
            {['ชื่อเมนู', 'หมวดหมู่', 'แท็ก', 'ราคา', ''].map((h, i) => (
              <div key={i} style={{ color:'#475569', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', textAlign: i === 3 ? 'right' : 'left' }}>
                {h}
              </div>
            ))}
          </div>
          {filtered.map(item => (
            <div key={item.id} className="menu-row" style={{ gridTemplateColumns:'2fr 1fr 120px 100px 80px' }}>
              {/* Name */}
              <div style={{ display:'flex', alignItems:'center', gap:'12px', minWidth:0 }}>
                {item.image ? (
                  <img src={item.image} alt={item.nameTh} style={{ width:'38px', height:'38px', borderRadius:'8px', objectFit:'cover', flexShrink:0, border:'1px solid #1e293b' }} />
                ) : (
                  <div style={{ width:'38px', height:'38px', borderRadius:'8px', background:'#1e293b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'16px' }}>🍜</div>
                )}
                <div style={{ minWidth:0 }}>
                  <div style={{ color:'#f1f5f9', fontSize:'0.875rem', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.nameTh}</div>
                  <div style={{ color:'#475569', fontSize:'0.75rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.name}</div>
                </div>
              </div>

              {/* Category */}
              <div>
                <span style={{ padding:'3px 10px', borderRadius:'5px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.15)', color:'#f97316', fontSize:'0.72rem', fontWeight:600 }}>
                  {item.category}
                </span>
              </div>

              {/* Tags */}
              <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                {item.isPopular && <span style={{ padding:'2px 7px', borderRadius:'4px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.2)', color:'#eab308', fontSize:'0.68rem', fontWeight:600 }}>ยอดนิยม</span>}
                {item.isSpicy && <span style={{ padding:'2px 7px', borderRadius:'4px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:'0.68rem', fontWeight:600 }}>เผ็ด</span>}
                {item.isNew && <span style={{ padding:'2px 7px', borderRadius:'4px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#10b981', fontSize:'0.68rem', fontWeight:600 }}>ใหม่</span>}
              </div>

              {/* Price */}
              <div style={{ textAlign:'right' }}>
                <span style={{ color:'#10b981', fontSize:'0.9rem', fontWeight:700 }}>
                  {item.price === 0 ? <span style={{ color:'#475569', fontSize:'0.78rem', fontWeight:500 }}>บุฟเฟ่ต์</span> : `฿${item.price.toLocaleString()}`}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:'6px', justifyContent:'flex-end' }}>
                <button className="menu-action" onClick={() => setSelectedMenuItem(item)} title="แก้ไข">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="menu-action danger" title="ลบ"
                  onClick={async () => {
                    const result = await Swal.fire({
                      icon: 'warning', title: 'ลบเมนู',
                      text: `ต้องการลบ "${item.nameTh}" หรือไม่?`,
                      showCancelButton: true,
                      confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก',
                      confirmButtonColor: '#ef4444', cancelButtonColor: '#334155',
                      reverseButtons: true,
                      background: '#0d1117', color: '#f1f5f9',
                    });
                    if (result.isConfirmed) deleteMenuItem(item.id);
                  }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result count */}
      {!menuLoading && filtered.length > 0 && (
        <div style={{ marginTop:'12px', color:'#334155', fontSize:'0.75rem', textAlign:'right' }}>
          แสดง {filtered.length} จาก {menuItems.length} รายการ
        </div>
      )}

      {selectedMenuItem && (
        <EditMenuItemModal item={selectedMenuItem} onClose={() => setSelectedMenuItem(null)} onSave={(updates) => updateMenuItem(selectedMenuItem.id, updates)} />
      )}
      {showAddMenuModal && (
        <AddMenuItemModal onClose={() => setShowAddMenuModal(false)} onSave={addMenuItem} />
      )}
    </>
  );
}
