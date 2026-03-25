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

    return (
        <>
            {/* Table Not Ready Popup */}
            {showNotReadyPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001,
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #2D2520 0%, #3D352E 100%)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '500px',
                        width: '100%',
                        textAlign: 'center',
                        border: '2px solid rgba(255, 107, 74, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{
                            fontSize: '5rem',
                            marginBottom: '24px',
                            animation: 'pulse 2s ease-in-out infinite'
                        }}>
                            ⏳
                        </div>
                        <h1 style={{
                            color: 'white',
                            fontSize: '2rem',
                            fontWeight: 800,
                            marginBottom: '16px'
                        }}>
                            กำลังเตรียมโต๊ะ
                        </h1>
                        <h2 style={{
                            color: '#FF6B4A',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            marginBottom: '24px'
                        }}>
                            โต๊ะที่ {tableNumber}
                        </h2>
                        <p style={{
                            color: '#E0E0E0',
                            fontSize: '1.1rem',
                            marginBottom: '32px',
                            lineHeight: '1.6'
                        }}>
                            โต๊ะนี้ยังไม่พร้อมใช้งาน<br />
                            กรุณารอให้เจ้าหน้าที่เปิดใช้งานก่อน
                        </p>
                        <button
                            onClick={() => {
                                // Refresh page to check status again
                                window.location.reload();
                            }}
                            style={{
                                padding: '16px 32px',
                                borderRadius: '12px',
                                border: 'none',
                                background: '#FF6B4A',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 20px rgba(255, 107, 74, 0.4)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            🔄 ตรวจสอบอีกครั้ง
                        </button>
                    </div>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            @keyframes pulse {
                                0%, 100% { transform: scale(1); }
                                50% { transform: scale(1.1); }
                            }
                        `
                    }} />
                </div>
            )}

            {/* Welcome Screen */}
            {showWelcome && tableReady && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, #2D2520 0%, #3D352E 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '40px 20px'
                }}>
                    <div style={{
                        textAlign: 'center',
                        maxWidth: '500px'
                    }}>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '24px',
                            animation: 'pulse 2s ease-in-out infinite'
                        }}>
                            🍜
                        </div>
                        <h1 style={{
                            color: 'white',
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            marginBottom: '16px'
                        }}>
                            ยินดีต้อนรับ!
                        </h1>
                        <h2 style={{
                            color: '#FF6B4A',
                            fontSize: '1.8rem',
                            fontWeight: 700,
                            marginBottom: '24px'
                        }}>
                            โต๊ะที่ {tableNumber}
                        </h2>
                        <p style={{
                            color: '#E0E0E0',
                            fontSize: '1.2rem',
                            marginBottom: '32px',
                            lineHeight: '1.6'
                        }}>
                            เริ่มต้นการสั่งอาหารของคุณ<br />
                            เลือกเมนูที่คุณต้องการได้เลย
                        </p>
                        <button
                            onClick={() => setShowWelcome(false)}
                            style={{
                                padding: '16px 32px',
                                borderRadius: '12px',
                                border: 'none',
                                background: '#FF6B4A',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 20px rgba(255, 107, 74, 0.4)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 6px 25px rgba(255, 107, 74, 0.6)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 107, 74, 0.4)';
                            }}
                        >
                            เริ่มสั่งอาหาร →
                        </button>
                    </div>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            @keyframes pulse {
                                0%, 100% { transform: scale(1); }
                                50% { transform: scale(1.1); }
                            }
                        `
                    }} />
                </div>
            )}

            {/* Table indicator bar - Only show if table is ready */}
            {tableReady && !showNotReadyPopup && (
            <div style={{
                position: 'fixed',
                top: '80px',
                left: '80px',
                right: 0,
                background: 'linear-gradient(135deg, #FF6B4A 0%, #E55A3A 100%)',
                color: 'white',
                padding: '8px 16px',
                zIndex: 45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 600
            }}>
                <span>🍜</span>
                <span>โต๊ะที่ {tableNumber}</span>
                <span>|</span>
                <span>Table {tableNumber}</span>
            </div>
            )}

            {/* Menu Section with Sidebar Filter - Only show if table is ready */}
            {tableReady && !showNotReadyPopup && (
            <ImageKitProvider urlEndpoint="https://ik.imagekit.io/8msldpqil">
                <section id="menu" className="menu-section" style={{ marginTop: '116px' }}>
                    {/* Sidebar Filter */}
                    <aside className="sidebar" style={{ top: '116px', height: 'calc(100vh - 116px)' }}>
                        <CategoryFilter
                            activeCategory={activeCategory}
                            onCategoryChange={setActiveCategory}
                        />
                    </aside>

                    {/* Menu Content */}
                    <div className="menu-content" style={{ minHeight: 'calc(100vh - 116px)' }}>
                        {/* Search Bar */}
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="ค้นหาจากชื่อ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        {/* Menu Items List */}
                        <div className="menu-list">
                            {loading ? (
                                <div className="empty-state">
                                    <div className="text-5xl mb-4 animate-spin">🍲</div>
                                    <h3>กำลังโหลดเมนู...</h3>
                                </div>
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <MenuCard key={item.id} item={item} />
                                ))
                            ) : (
                                <div className="empty-state">
                                    <div className="text-5xl mb-4">🔍</div>
                                    <h3>ไม่พบเมนู</h3>
                                    <p>ลองค้นหาด้วยคำอื่น</p>
                                    <button
                                        onClick={() => {
                                            setSearchQuery('');
                                            setActiveCategory('all');
                                        }}
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
