'use client';

import { useEffect, useState } from 'react';
import { AddMenuItemModal, EditMenuItemModal } from '../components/MenuModals';
import { MenuItem } from '../types';
import Swal from 'sweetalert2';

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);

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

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
      }}>
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600 }}>
          จัดการเมนูและราคา
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddMenuModal(true)}
            style={{
              padding: '10px 18px', borderRadius: '8px', border: 'none',
              background: '#10b981', color: 'white', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; }}
          >
            ➕ เพิ่มเมนู
          </button>
          <button
            onClick={fetchMenuItems}
            disabled={menuLoading}
            style={{
              padding: '10px 18px', borderRadius: '8px',
              border: '1px solid #2a2a2a', background: '#262626',
              color: menuLoading ? '#737373' : '#fff',
              cursor: menuLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem', fontWeight: 500,
            }}
          >
            🔄 รีเฟรช
          </button>
        </div>
      </div>

      {menuLoading ? (
        <div style={{ textAlign: 'center', color: '#a1a1a1', padding: '40px', fontSize: '1rem' }}>
          กำลังโหลด...
        </div>
      ) : menuItems.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#737373', padding: '40px', fontSize: '1rem' }}>
          ไม่มีรายการเมนู
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {menuItems.map((item) => (
            <div
              key={item.id}
              style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a2a' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>
                    {item.nameTh}
                  </div>
                  <div style={{ color: '#737373', fontSize: '0.85rem', marginBottom: '6px' }}>
                    {item.name}
                  </div>
                  <div style={{ color: '#a1a1a1', fontSize: '0.8rem', marginBottom: '8px' }}>
                    {item.description}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#262626', color: '#f97316', fontSize: '0.7rem', border: '1px solid #333' }}>
                      {item.category}
                    </span>
                    {item.isPopular && (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#262626', color: '#eab308', fontSize: '0.7rem', border: '1px solid #333' }}>
                        ⭐ ยอดนิยม
                      </span>
                    )}
                    {item.isSpicy && (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#262626', color: '#ef4444', fontSize: '0.7rem', border: '1px solid #333' }}>
                        🌶️ เผ็ด
                      </span>
                    )}
                    {item.isNew && (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#262626', color: '#10b981', fontSize: '0.7rem', border: '1px solid #333' }}>
                        🆕 ใหม่
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 600 }}>
                    ฿{item.price === 0 ? '0 (บุฟเฟ่ต์)' : item.price.toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setSelectedMenuItem(item)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px',
                        border: '1px solid #333', background: '#262626', color: '#fff',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                      }}
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      onClick={async () => {
                        const result = await Swal.fire({
                          icon: 'question', title: 'ยืนยันการลบเมนู',
                          text: `คุณต้องการลบ "${item.nameTh}" หรือไม่?`,
                          showCancelButton: true,
                          confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก',
                          confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
                          reverseButtons: true,
                        });
                        if (result.isConfirmed) deleteMenuItem(item.id);
                      }}
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
            </div>
          ))}
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {selectedMenuItem && (
        <EditMenuItemModal
          item={selectedMenuItem}
          onClose={() => setSelectedMenuItem(null)}
          onSave={(updates) => { updateMenuItem(selectedMenuItem.id, updates); }}
        />
      )}

      {/* Add Menu Item Modal */}
      {showAddMenuModal && (
        <AddMenuItemModal
          onClose={() => setShowAddMenuModal(false)}
          onSave={addMenuItem}
        />
      )}
    </div>
  );
}
