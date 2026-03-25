'use client';

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

interface BillSummaryButtonProps {
    tableNumber: string;
}

export default function BillSummaryButton({ tableNumber }: BillSummaryButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [tableBill, setTableBill] = useState<TableBill | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTableBill();
        }
    }, [isOpen, tableNumber]);

    const fetchTableBill = async () => {
        try {
            setLoading(true);
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
            setLoading(false);
        }
    };

    return (
        <>
            {/* Bill Summary Button */}
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8C69 100%)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(255, 107, 74, 0.4)',
                    zIndex: 40,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 107, 74, 0.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 74, 0.4)';
                }}
            >
                <span style={{ fontSize: '1.3rem' }}>💰</span>
                <span>สรุปบิล</span>
            </button>

            {/* Bill Summary Modal */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 1000,
                        }}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal */}
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'linear-gradient(135deg, #2D2520 0%, #3D352E 100%)',
                            borderRadius: '24px',
                            padding: '32px',
                            maxWidth: '500px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            zIndex: 1001,
                            border: '2px solid rgba(255, 107, 74, 0.3)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                            paddingBottom: '16px',
                            borderBottom: '2px solid rgba(255, 107, 74, 0.3)'
                        }}>
                            <h2 style={{
                                color: 'white',
                                fontSize: '1.8rem',
                                fontWeight: 800,
                                margin: 0
                            }}>
                                💰 สรุปบิล
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    transition: 'all 0.3s ease'
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

                        {/* Content */}
                        {loading ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                color: 'white'
                            }}>
                                กำลังโหลด...
                            </div>
                        ) : tableBill && tableBill.totalPrice > 0 ? (
                            <div>
                                <div style={{
                                    color: '#FF6B4A',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    marginBottom: '16px'
                                }}>
                                    โต๊ะที่ {tableNumber}
                                </div>

                                {/* Bill Details */}
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
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '10px'
                                        }}>
                                            <span style={{ color: '#E0E0E0', fontSize: '0.95rem' }}>
                                                👤 ผู้ใหญ่: {tableBill.adultCount} ท่าน × ฿{tableBill.adultPrice}
                                            </span>
                                            <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>
                                                ฿{(tableBill.adultCount * tableBill.adultPrice).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {tableBill.child120Count > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '10px'
                                        }}>
                                            <span style={{ color: '#E0E0E0', fontSize: '0.95rem' }}>
                                                👶 เด็ก 120cm: {tableBill.child120Count} คน × ฿{tableBill.child120Price}
                                            </span>
                                            <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>
                                                ฿{(tableBill.child120Count * tableBill.child120Price).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {tableBill.child100Count > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '10px'
                                        }}>
                                            <span style={{ color: '#E0E0E0', fontSize: '0.95rem' }}>
                                                🎁 เด็ก 100cm: {tableBill.child100Count} คน
                                            </span>
                                            <span style={{ color: '#4CAF50', fontSize: '0.95rem', fontWeight: 600 }}>
                                                ฟรี
                                            </span>
                                        </div>
                                    )}
                                    {tableBill.drinkRefillCount > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '10px'
                                        }}>
                                            <span style={{ color: '#E0E0E0', fontSize: '0.95rem' }}>
                                                🥤 น้ำรีฟิล: {tableBill.drinkRefillCount} × ฿{tableBill.drinkRefillPrice}
                                            </span>
                                            <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>
                                                ฿{(tableBill.drinkRefillCount * tableBill.drinkRefillPrice).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Total */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '20px',
                                    background: 'rgba(255, 107, 74, 0.15)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 107, 74, 0.3)',
                                    marginTop: '20px'
                                }}>
                                    <span style={{
                                        color: 'white',
                                        fontSize: '1.3rem',
                                        fontWeight: 700
                                    }}>
                                        รวมบิลบุฟเฟ่ต์:
                                    </span>
                                    <span style={{
                                        color: '#FF6B4A',
                                        fontSize: '1.8rem',
                                        fontWeight: 800
                                    }}>
                                        ฿{tableBill.totalPrice.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                color: '#8B7355'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                                <p style={{ fontSize: '1rem' }}>ยังไม่มีข้อมูลบิลบุฟเฟ่ต์</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}

