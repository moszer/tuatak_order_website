'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';

interface TableBill {
    adultCount: number;
    child120Count: number;
    child100Count: number;
    drinkRefillCount: number;
    adultPrice: number;
    child120Price: number;
    drinkRefillPrice: number;
    totalPrice: number;
}

interface OrderItem {
    id: string;
    name: string;
    nameTh: string;
    price: number;
    quantity: number;
    comment?: string;
}

interface Order {
    _id: string;
    tableNumber: string;
    items: OrderItem[];
    totalPrice: number;
    status: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export default function Header() {
    const pathname = usePathname();
    const { totalItems, setIsCartOpen } = useCart();
    const [showBillModal, setShowBillModal] = useState(false);
    const [tableBill, setTableBill] = useState<TableBill | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingBill, setLoadingBill] = useState(false);

    // Extract table number from pathname (e.g., "/table1" -> "1")
    const tableNumber = pathname?.startsWith('/table') ? pathname.replace('/table', '') : null;

    useEffect(() => {
        if (showBillModal && tableNumber) {
            fetchTableBill();
            fetchOrders();
        }
    }, [showBillModal, tableNumber]);

    const fetchTableBill = async () => {
        if (!tableNumber) return;
        try {
            setLoadingBill(true);
            const response = await fetch(`/api/tables/bill?table=${tableNumber}`);
            const data = await response.json();
            if (data.success && data.bill) {
                setTableBill({
                    adultCount: data.bill.adultCount || 0,
                    child120Count: data.bill.child120Count || 0,
                    child100Count: data.bill.child100Count || 0,
                    drinkRefillCount: data.bill.drinkRefillCount || 0,
                    adultPrice: parseFloat(data.bill.adultPrice || 199),
                    child120Price: parseFloat(data.bill.child120Price || 130),
                    drinkRefillPrice: parseFloat(data.bill.drinkRefillPrice || 39),
                    totalPrice: parseFloat(data.bill.totalPrice || 0),
                });
            } else {
                setTableBill(null);
            }
        } catch (error) {
            console.error('Error fetching table bill:', error);
            setTableBill(null);
        } finally {
            setLoadingBill(false);
        }
    };

    const fetchOrders = async () => {
        if (!tableNumber) return;
        try {
            const response = await fetch(`/api/orders?table=${tableNumber}`);
            const data = await response.json();
            if (data.orders) {
                // Filter out empty orders (orders with no items)
                const ordersWithItems = data.orders.filter((order: Order) => 
                    order.items && order.items.length > 0
                );
                setOrders(ordersWithItems);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]);
        }
    };

    // Don't show header on admin page or login page
    if (pathname === '/admin' || pathname === '/login' || pathname === '/register') {
        return null;
    }

    return (
        <>
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -45%);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%);
                    }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: '#2D2520',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div className="container">
                <nav className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-14 h-14 rounded-full overflow-hidden transform group-hover:scale-110 transition-transform">
                            <Image
                                src="/logo.jpg"
                                alt="TUATAK Shabunt"
                                width={56}
                                height={56}
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">TUATAK</h1>
                            <p className="text-xs text-secondary -mt-1">Shabunt</p>
                        </div>
                    </Link>

                    {/* Right Side Buttons */}
                    <div className="flex items-center gap-3">
                        {/* Bill Summary Button - Only show on table pages */}
                        {tableNumber && (
                            <button
                                onClick={() => setShowBillModal(true)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 8px rgba(255, 107, 74, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 74, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 74, 0.3)';
                                }}
                            >
                                <span>💰</span>
                                <span className="hidden sm:inline">สรุปบิล</span>
                            </button>
                        )}

                        {/* Cart Button */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-2 btn-primary py-2 px-4"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                            <span className="hidden sm:inline">Cart</span>
                            {totalItems > 0 && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary text-dark text-xs font-bold flex items-center justify-center animate-bounce-slow">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </nav>
            </div>

            {/* Bill Summary Modal */}
            {showBillModal && (
                <>
                    {/* Backdrop with animation */}
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            zIndex: 1000,
                            animation: 'fadeIn 0.3s ease-out'
                        }}
                        onClick={() => setShowBillModal(false)}
                    />

                    {/* Modal with modern design */}
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: '#1a1613',
                            borderRadius: '24px',
                            padding: '0',
                            maxWidth: '700px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            zIndex: 1001,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Section */}
                        <div style={{
                            background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                            padding: '28px 32px',
                            borderRadius: '24px 24px 0 0',
                            borderBottom: 'none',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: '200px',
                                height: '200px',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                                borderRadius: '50%',
                                transform: 'translate(30%, -30%)'
                            }} />
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                <div>
                                    <h2 style={{
                                        color: 'white',
                                        fontSize: '1.75rem',
                                        fontWeight: 700,
                                        margin: '0 0 6px 0',
                                        letterSpacing: '-0.3px'
                                    }}>
                                        สรุปบิล
                                    </h2>
                                    <p style={{
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontSize: '0.95rem',
                                        margin: 0,
                                        fontWeight: 500
                                    }}>
                                        โต๊ะที่ {tableNumber}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowBillModal(false)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                        transition: 'all 0.2s ease',
                                        fontWeight: 300
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                                        e.currentTarget.style.transform = 'rotate(90deg)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                        e.currentTarget.style.transform = 'rotate(0deg)';
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div style={{
                            padding: '32px',
                            background: '#1a1613'
                        }}>

                        {/* Content */}
                        {loadingBill ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 40px',
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
                                <p style={{ fontSize: '1rem', color: '#8B7355' }}>กำลังโหลดข้อมูล...</p>
                            </div>
                        ) : (
                            <div>

                                {/* Buffet Bill Section */}
                                {tableBill && tableBill.totalPrice > 0 && (
                                    <div style={{
                                        marginBottom: '28px',
                                        background: '#25201c',
                                        borderRadius: '16px',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            padding: '20px 24px',
                                            background: 'rgba(255, 107, 74, 0.08)',
                                            borderBottom: '1px solid rgba(255, 107, 74, 0.15)'
                                        }}>
                                            <h3 style={{
                                                color: '#FF6B4A',
                                                fontSize: '1.1rem',
                                                fontWeight: 600,
                                                margin: 0,
                                                letterSpacing: '-0.2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span>💰</span>
                                                <span>บิลบุฟเฟ่ต์</span>
                                            </h3>
                                        </div>
                                        <div style={{
                                            padding: '20px 24px'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                marginBottom: '20px'
                                            }}>
                                                {tableBill.adultCount > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '14px 16px',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                                    }}>
                                                        <span style={{ color: '#D4D4D4', fontSize: '0.95rem', fontWeight: 500 }}>
                                                            👤 ผู้ใหญ่ {tableBill.adultCount} ท่าน × ฿{tableBill.adultPrice}
                                                        </span>
                                                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                                                            ฿{(tableBill.adultCount * tableBill.adultPrice).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {tableBill.child120Count > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '14px 16px',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                                    }}>
                                                        <span style={{ color: '#D4D4D4', fontSize: '0.95rem', fontWeight: 500 }}>
                                                            👶 เด็ก 120cm {tableBill.child120Count} คน × ฿{tableBill.child120Price}
                                                        </span>
                                                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                                                            ฿{(tableBill.child120Count * tableBill.child120Price).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {tableBill.child100Count > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '14px 16px',
                                                        background: 'rgba(76, 175, 80, 0.08)',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(76, 175, 80, 0.15)'
                                                    }}>
                                                        <span style={{ color: '#D4D4D4', fontSize: '0.95rem', fontWeight: 500 }}>
                                                            🎁 เด็ก 100cm {tableBill.child100Count} คน
                                                        </span>
                                                        <span style={{ color: '#4CAF50', fontSize: '1rem', fontWeight: 600 }}>
                                                            ฟรี
                                                        </span>
                                                    </div>
                                                )}
                                                {tableBill.drinkRefillCount > 0 && (
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '14px 16px',
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                                    }}>
                                                        <span style={{ color: '#D4D4D4', fontSize: '0.95rem', fontWeight: 500 }}>
                                                            🥤 น้ำรีฟิล {tableBill.drinkRefillCount} × ฿{tableBill.drinkRefillPrice}
                                                        </span>
                                                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                                                            ฿{(tableBill.drinkRefillCount * tableBill.drinkRefillPrice).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '16px 20px',
                                                background: 'rgba(255, 107, 74, 0.1)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255, 107, 74, 0.2)'
                                            }}>
                                                <span style={{
                                                    color: '#FF6B4A',
                                                    fontSize: '1rem',
                                                    fontWeight: 600
                                                }}>
                                                    รวมบิลบุฟเฟ่ต์
                                                </span>
                                                <span style={{
                                                    color: '#FF6B4A',
                                                    fontSize: '1.5rem',
                                                    fontWeight: 700
                                                }}>
                                                    ฿{tableBill.totalPrice.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Orders Section */}
                                {orders.length > 0 && (
                                    <div style={{
                                        marginBottom: '28px',
                                        marginTop: orders.length > 0 ? '28px' : '0'
                                    }}>
                                        <div style={{
                                            padding: '20px 24px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            marginBottom: '20px'
                                        }}>
                                            <h3 style={{
                                                color: '#FF6B4A',
                                                fontSize: '1.1rem',
                                                fontWeight: 600,
                                                margin: 0,
                                                letterSpacing: '-0.2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span>🍽️</span>
                                                <span>คำสั่งซื้อ ({orders.length})</span>
                                            </h3>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px'
                                        }}>
                                            {orders.map((order) => {
                                                const orderDate = new Date(order.createdAt);
                                                const formattedDate = orderDate.toLocaleString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });
                                                
                                                return (
                                                    <div
                                                        key={order._id}
                                                        style={{
                                                            background: '#25201c',
                                                            borderRadius: '16px',
                                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <div style={{
                                                            padding: '18px 20px',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                            <div>
                                                                <div style={{
                                                                    color: 'white',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 600,
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    #{order._id}
                                                                </div>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    color: '#8B7355',
                                                                    fontSize: '0.8rem'
                                                                }}>
                                                                    <span>📅</span>
                                                                    <span>{formattedDate}</span>
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: order.status === 'completed' 
                                                                    ? 'rgba(76, 175, 80, 0.15)' 
                                                                    : order.status === 'preparing'
                                                                    ? 'rgba(255, 193, 7, 0.15)'
                                                                    : 'rgba(255, 107, 74, 0.15)',
                                                                border: `1px solid ${order.status === 'completed' 
                                                                    ? 'rgba(76, 175, 80, 0.3)' 
                                                                    : order.status === 'preparing'
                                                                    ? 'rgba(255, 193, 7, 0.3)'
                                                                    : 'rgba(255, 107, 74, 0.3)'}`,
                                                                color: order.status === 'completed'
                                                                    ? '#4CAF50'
                                                                    : order.status === 'preparing'
                                                                    ? '#FFC107'
                                                                    : '#FF6B4A',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600
                                                            }}>
                                                                {order.status === 'completed' ? '✓ เสร็จสิ้น' : 
                                                                 order.status === 'preparing' ? '⏳ กำลังทำ' : '⏱️ รอทำ'}
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            padding: '18px 20px'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '10px',
                                                                marginBottom: '16px'
                                                            }}>
                                                                {order.items.map((item, index) => (
                                                                    <div
                                                                        key={index}
                                                                        style={{
                                                                            display: 'flex',
                                                                            justifyContent: 'space-between',
                                                                            alignItems: 'flex-start',
                                                                            padding: '12px 14px',
                                                                            background: 'rgba(255, 255, 255, 0.02)',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid rgba(255, 255, 255, 0.04)'
                                                                        }}
                                                                    >
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{
                                                                                color: '#E0E0E0',
                                                                                fontSize: '0.9rem',
                                                                                fontWeight: 500,
                                                                                marginBottom: item.comment ? '4px' : '0'
                                                                            }}>
                                                                                {item.nameTh} <span style={{ color: '#8B7355', fontSize: '0.85rem' }}>× {item.quantity}</span>
                                                                            </div>
                                                                            {item.comment && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                    color: '#DC2626',
                                                                                    fontSize: '0.8rem',
                                                                                    fontStyle: 'italic',
                                                                                    marginTop: '4px'
                                                                                }}>
                                                                                    <span>📝</span>
                                                                                    <span>{item.comment}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div style={{
                                                                            color: 'white',
                                                                            fontSize: '0.95rem',
                                                                            fontWeight: 600,
                                                                            minWidth: '80px',
                                                                            textAlign: 'right'
                                                                        }}>
                                                                            ฿{(item.price * item.quantity).toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '14px 16px',
                                                                background: 'rgba(255, 107, 74, 0.08)',
                                                                borderRadius: '10px',
                                                                border: '1px solid rgba(255, 107, 74, 0.15)'
                                                            }}>
                                                                <span style={{
                                                                    color: '#FF6B4A',
                                                                    fontSize: '0.95rem',
                                                                    fontWeight: 600
                                                                }}>
                                                                    รวมคำสั่งซื้อนี้
                                                                </span>
                                                                <span style={{
                                                                    color: '#FF6B4A',
                                                                    fontSize: '1.25rem',
                                                                    fontWeight: 700
                                                                }}>
                                                                    ฿{order.totalPrice.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Grand Total */}
                                {((tableBill && tableBill.totalPrice > 0) || orders.length > 0) && (
                                    <div style={{
                                        padding: '24px',
                                        background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                                        borderRadius: '16px',
                                        marginTop: '28px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: '150px',
                                            height: '150px',
                                            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                                            borderRadius: '50%',
                                            transform: 'translate(30%, -30%)'
                                        }} />
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            position: 'relative',
                                            zIndex: 1
                                        }}>
                                            {orders.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <span style={{
                                                        color: 'rgba(255, 255, 255, 0.95)',
                                                        fontSize: '0.95rem',
                                                        fontWeight: 500
                                                    }}>
                                                        รวมอาหาร
                                                    </span>
                                                    <span style={{
                                                        color: 'white',
                                                        fontSize: '1.25rem',
                                                        fontWeight: 600
                                                    }}>
                                                        ฿{orders.reduce((sum, order) => sum + order.totalPrice, 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                            {tableBill && tableBill.totalPrice > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <span style={{
                                                        color: 'rgba(255, 255, 255, 0.95)',
                                                        fontSize: '0.95rem',
                                                        fontWeight: 500
                                                    }}>
                                                        รวมบิลบุฟเฟ่ต์
                                                    </span>
                                                    <span style={{
                                                        color: 'white',
                                                        fontSize: '1.25rem',
                                                        fontWeight: 600
                                                    }}>
                                                        ฿{tableBill.totalPrice.toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingTop: '16px',
                                                borderTop: '2px solid rgba(255, 255, 255, 0.25)',
                                                marginTop: '4px'
                                            }}>
                                                <span style={{
                                                    color: 'white',
                                                    fontSize: '1.25rem',
                                                    fontWeight: 700
                                                }}>
                                                    รวมทั้งหมด
                                                </span>
                                                <span style={{
                                                    color: 'white',
                                                    fontSize: '2rem',
                                                    fontWeight: 800,
                                                    letterSpacing: '-0.5px'
                                                }}>
                                                    ฿{(
                                                        (tableBill?.totalPrice || 0) + 
                                                        orders.reduce((sum, order) => sum + order.totalPrice, 0)
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {(!tableBill || tableBill.totalPrice === 0) && orders.length === 0 && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 40px'
                                    }}>
                                        <div style={{
                                            width: '72px',
                                            height: '72px',
                                            margin: '0 auto 20px',
                                            borderRadius: '16px',
                                            background: 'rgba(255, 107, 74, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2.5rem',
                                            border: '1px solid rgba(255, 107, 74, 0.15)'
                                        }}>
                                            📋
                                        </div>
                                        <p style={{
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: '#D4D4D4',
                                            margin: '0 0 8px 0'
                                        }}>
                                            ยังไม่มีข้อมูลบิล
                                        </p>
                                        <p style={{
                                            fontSize: '0.85rem',
                                            color: '#8B7355',
                                            margin: 0
                                        }}>
                                            เมื่อมีการสั่งอาหารหรือเปิดโต๊ะ ข้อมูลจะแสดงที่นี่
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </div>
                </>
            )}
        </header>
        </>
    );
}
