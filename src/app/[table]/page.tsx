'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ImageKitProvider } from '@imagekit/next';
import MenuCard from '../components/MenuCard';
import CategoryFilter from '../components/CategoryFilter';

interface MenuItem {
    id: number;
    name: string;
    nameTh: string;
    description: string;
    price: number;
    image: string;
    category: string;
    isPopular?: boolean;
    isSpicy?: boolean;
    isNew?: boolean;
}

export default function TablePage() {
    const params = useParams();
    const tableId = params.table as string;

    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(true);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [tableReady, setTableReady] = useState<boolean | null>(null);
    const [showNotReadyPopup, setShowNotReadyPopup] = useState(false);

    // Extract table number from URL (e.g., "table1" -> "1")
    const tableNumber = tableId?.replace('table', '') || '?';

    const checkTableStatus = async () => {
        try {
            const response = await fetch(`/api/tables/status?table=${tableNumber}`);
            const data = await response.json();
            if (data.success) {
                const isReady = data.isReady || false;
                setTableReady(isReady);
                
                if (!isReady) {
                    setShowNotReadyPopup(true);
                    setShowWelcome(false);
                } else {
                    // Table is ready, proceed with session
                    startTableSession();
                }
            }
        } catch (error) {
            console.error('Error checking table status:', error);
            // Default to not ready if check fails
            setTableReady(false);
            setShowNotReadyPopup(true);
        }
    };

    const startTableSession = async () => {
        try {
            const response = await fetch(`/api/tables/${tableNumber}`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                setSessionStarted(true);
                // Auto-hide welcome after 3 seconds if it's a new session
                if (data.isNew) {
                    setTimeout(() => {
                        setShowWelcome(false);
                    }, 3000);
                } else {
                    // If session already exists, don't show welcome
                    setShowWelcome(false);
                }
            }
        } catch (error) {
            console.error('Error starting table session:', error);
            // Continue anyway
            setSessionStarted(true);
            setShowWelcome(false);
        }
    };

    useEffect(() => {
        fetchMenuItems();
        checkTableStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableNumber]);

    const fetchMenuItems = async () => {
        try {
            const response = await fetch('/api/menu');
            const data = await response.json();
            setMenuItems(data.menuItems || []);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            setMenuItems([]);
        } finally {
            setLoading(false);
        }
    };

    const getItemsByCategory = (category: string) => {
        return category === 'all' 
            ? menuItems 
            : menuItems.filter((item) => item.category === category);
    };

    const filteredItems = useMemo(() => {
        let items = getItemsByCategory(activeCategory);

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            items = items.filter(
                item =>
                    item.name.toLowerCase().includes(query) ||
                    item.nameTh.includes(query) ||
                    (item.description && item.description.toLowerCase().includes(query))
            );
        }

        return items;
    }, [activeCategory, searchQuery, menuItems]);

    // Heights for layout calculation
    const HEADER_H = 80;
    const BAR_H = 40;
    const TOTAL_TOP = HEADER_H + BAR_H; // 120px

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes tbl-pulse { 0%,100% { transform: scale(1); opacity:1; } 50% { transform: scale(1.08); opacity:0.85; } }
                @keyframes tbl-spin { to { transform: rotate(360deg); } }
                @keyframes tbl-fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
            ` }} />

            {/* Table Not Ready */}
            {showNotReadyPopup && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1001, padding: '20px',
                }}>
                    <div style={{
                        background: '#2D2520',
                        borderRadius: '20px', padding: '40px 32px',
                        maxWidth: '420px', width: '100%',
                        textAlign: 'center',
                        border: '1px solid rgba(255,107,74,0.25)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                        animation: 'tbl-fadein 0.3s ease',
                    }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '20px', animation: 'tbl-pulse 2s ease-in-out infinite' }}>⏳</div>
                        <div style={{ display: 'inline-block', background: 'rgba(255,107,74,0.12)', border: '1px solid rgba(255,107,74,0.3)', borderRadius: '8px', padding: '4px 14px', marginBottom: '16px' }}>
                            <span style={{ color: '#FF6B4A', fontSize: '0.85rem', fontWeight: 600 }}>โต๊ะ {tableNumber}</span>
                        </div>
                        <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: '10px' }}>กำลังเตรียมโต๊ะ</h1>
                        <p style={{ color: '#b5a99d', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.7 }}>
                            โต๊ะนี้ยังไม่พร้อมใช้งาน<br />กรุณารอให้พนักงานเปิดโต๊ะก่อน
                        </p>
                        <button
                            onClick={checkTableStatus}
                            style={{
                                padding: '13px 32px', borderRadius: '10px', border: 'none',
                                background: '#FF6B4A', color: 'white',
                                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(255,107,74,0.4)', transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#E55A3A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#FF6B4A'; e.currentTarget.style.transform = 'none'; }}
                        >
                            ตรวจสอบอีกครั้ง
                        </button>
                    </div>
                </div>
            )}

            {/* Welcome Screen */}
            {showWelcome && tableReady && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'linear-gradient(160deg, #2D2520 0%, #3D352E 60%, #2D2520 100%)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '40px 20px',
                    animation: 'tbl-fadein 0.4s ease',
                }}>
                    <div style={{ textAlign: 'center', maxWidth: '440px' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '24px', animation: 'tbl-pulse 2s ease-in-out infinite' }}>🍜</div>
                        <h1 style={{ color: 'white', fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>ยินดีต้อนรับ!</h1>
                        <div style={{ display: 'inline-block', background: 'rgba(255,107,74,0.15)', border: '1px solid rgba(255,107,74,0.35)', borderRadius: '10px', padding: '6px 20px', marginBottom: '20px' }}>
                            <span style={{ color: '#FF6B4A', fontSize: '1.2rem', fontWeight: 700 }}>โต๊ะ {tableNumber}</span>
                        </div>
                        <p style={{ color: '#b5a99d', fontSize: '1rem', marginBottom: '32px', lineHeight: 1.7 }}>
                            เลือกเมนูที่ต้องการได้เลย<br />แล้วหยิบใส่ตะกร้าเพื่อสั่งอาหาร
                        </p>
                        <button
                            onClick={() => setShowWelcome(false)}
                            style={{
                                padding: '14px 40px', borderRadius: '12px', border: 'none',
                                background: '#FF6B4A', color: 'white',
                                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(255,107,74,0.45)', transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#E55A3A'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,107,74,0.5)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#FF6B4A'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,107,74,0.45)'; }}
                        >
                            เริ่มสั่งอาหาร →
                        </button>
                    </div>
                </div>
            )}

            {/* Table indicator bar — full width, below header */}
            {tableReady && !showNotReadyPopup && (
                <div style={{
                    position: 'fixed',
                    top: `${HEADER_H}px`, left: 0, right: 0,
                    height: `${BAR_H}px`,
                    background: 'linear-gradient(90deg, #3D352E 0%, #4D443C 100%)',
                    borderBottom: '1px solid rgba(255,107,74,0.2)',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '10px', zIndex: 45,
                    fontSize: '0.82rem', fontWeight: 600,
                }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 6px #4CAF50' }} />
                    <span style={{ color: '#FF6B4A' }}>โต๊ะ {tableNumber}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>
                    <span style={{ color: '#b5a99d' }}>Table {tableNumber}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>|</span>
                    <span style={{ color: '#b5a99d', fontWeight: 400 }}>เลือกหมวดหมู่จากแถบด้านซ้าย</span>
                </div>
            )}

            {/* Menu Section — Only show if table is ready */}
            {tableReady && !showNotReadyPopup && (
                <ImageKitProvider urlEndpoint="https://ik.imagekit.io/8msldpqil">
                    <section id="menu" className="menu-section" style={{ marginTop: `${TOTAL_TOP}px` }}>
                        {/* Sidebar Filter */}
                        <aside className="sidebar" style={{ top: `${TOTAL_TOP}px`, height: `calc(100vh - ${TOTAL_TOP}px)` }}>
                            <CategoryFilter
                                activeCategory={activeCategory}
                                onCategoryChange={setActiveCategory}
                            />
                        </aside>

                        {/* Menu Content */}
                        <div className="menu-content" style={{ minHeight: `calc(100vh - ${TOTAL_TOP}px)` }}>
                            {/* Search Bar */}
                            <div className="search-bar">
                                <input
                                    type="text"
                                    placeholder="ค้นหาเมนู..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="search-input"
                                />
                            </div>

                            {/* Menu Items */}
                            <div className="menu-list">
                                {loading ? (
                                    <div className="empty-state">
                                        <div style={{ width: 40, height: 40, border: '3px solid #eee', borderTopColor: '#FF6B4A', borderRadius: '50%', margin: '0 auto 16px', animation: 'tbl-spin 1s linear infinite' }} />
                                        <h3>กำลังโหลดเมนู...</h3>
                                    </div>
                                ) : filteredItems.length > 0 ? (
                                    filteredItems.map((item) => (
                                        <MenuCard key={item.id} item={item} />
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
                                        <h3>ไม่พบเมนู</h3>
                                        <p>ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น</p>
                                        <button
                                            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                                            className="btn-primary"
                                        >
                                            ล้างตัวกรอง
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </ImageKitProvider>
            )}
        </>
    );
}
