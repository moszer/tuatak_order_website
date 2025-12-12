'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';

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

export default function Cart() {
    const { items, removeItem, updateQuantity, totalPrice, isCartOpen, setIsCartOpen, clearCart } = useCart();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [tableBill, setTableBill] = useState<TableBill | null>(null);
    const [loadingBill, setLoadingBill] = useState(false);
    const pathname = usePathname();

    // Extract table number from URL (e.g., "/table1" -> "1")
    const tableNumber = pathname?.replace('/table', '') || 'unknown';

    // Fetch table bill when cart opens
    useEffect(() => {
        if (isCartOpen && tableNumber !== 'unknown') {
            fetchTableBill();
        }
    }, [isCartOpen, tableNumber]);

    const fetchTableBill = async () => {
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

    const billTotal = tableBill?.totalPrice || 0;
    const grandTotal = totalPrice + billTotal;

    const handleSubmitOrder = async () => {
        // Prevent multiple submissions
        if (isSubmitting) {
            return;
        }

        if (items.length === 0) return;

        // Check if table is open before submitting order
        try {
            const statusResponse = await fetch(`/api/tables/status?table=${tableNumber}`);
            const statusData = await statusResponse.json();
            
            if (!statusData.success || !statusData.isReady) {
                alert('⚠️ โปรดเปิดโต๊ะก่อนสั่งอาหาร\n\nกรุณาแจ้งพนักงานให้เปิดโต๊ะให้ก่อน');
                return;
            }
        } catch (error) {
            console.error('Error checking table status:', error);
            alert('⚠️ ไม่สามารถตรวจสอบสถานะโต๊ะได้\n\nกรุณาลองใหม่อีกครั้ง');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tableNumber,
                    items: items.map(item => ({
                        id: item.id,
                        name: item.name,
                        nameTh: item.nameTh,
                        price: item.price,
                        quantity: item.quantity,
                        comment: item.comment,
                    })),
                    totalPrice,
                }),
            });

            if (response.ok) {
                setOrderSuccess(true);
                clearCart();
                setTimeout(() => {
                    setOrderSuccess(false);
                    setIsCartOpen(false);
                }, 2000);
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'เกิดข้อผิดพลาดในการสั่งอาหาร');
            }
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('เกิดข้อผิดพลาดในการสั่งอาหาร กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isCartOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn"
                onClick={() => setIsCartOpen(false)}
            />

            {/* Cart Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-dark z-50 animate-slideInRight shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                            🛒
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">ตะกร้าสินค้า</h2>
                            <p className="text-sm text-gray-400">โต๊ะ {tableNumber} • {items.length} รายการ</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCartOpen(false)}
                        className="w-10 h-10 rounded-full bg-dark-lighter flex items-center justify-center text-gray-400 hover:text-white hover:bg-card-hover transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Success Message */}
                {orderSuccess && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(45, 37, 32, 0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 60
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
                        <h3 style={{ color: '#4CAF50', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
                            สั่งอาหารสำเร็จ!
                        </h3>
                        <p style={{ color: '#888' }}>กรุณารอสักครู่...</p>
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="text-6xl mb-4">🍽️</div>
                            <h3 className="text-xl font-semibold text-white mb-2">ตะกร้าว่างเปล่า</h3>
                            <p className="text-gray-400 mb-6">เลือกเมนูอร่อยๆ ได้เลย!</p>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="btn-primary"
                            >
                                ดูเมนู
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="card p-4">
                                    <div className="flex gap-4">
                                        {/* Item Image/Placeholder */}
                                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-dark flex items-center justify-center text-2xl flex-shrink-0">
                                            🍲
                                        </div>

                                        {/* Item Details */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-white truncate">{item.nameTh}</h4>
                                            <p className="text-sm text-gray-500">{item.name}</p>
                                            <p className="text-primary font-bold mt-1">฿{item.price} x {item.quantity}</p>
                                            {item.comment && (
                                                <p className="text-xs mt-1" style={{ color: '#DC2626' }}>📝 {item.comment}</p>
                                            )}
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-center justify-end mt-3 pt-3 border-t border-white/5">
                                        <span className="text-secondary font-bold">฿{item.price * item.quantity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-6 border-t border-white/10 space-y-4">
                        {/* Food Total */}
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-lg text-white font-semibold">รวมทั้งหมด</span>
                            <span className="text-2xl font-bold text-gradient">฿{totalPrice.toLocaleString()}</span>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            flexDirection: 'column'
                        }}>
                            {/* Submit Order Button */}
                            <button
                                onClick={handleSubmitOrder}
                                disabled={isSubmitting || items.length === 0}
                                className="w-full btn-primary text-lg py-4 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ opacity: isSubmitting || items.length === 0 ? 0.5 : 1 }}
                            >
                                {isSubmitting ? (
                                    '⏳ กำลังส่งออเดอร์...'
                                ) : (
                                    '🍜 ยืนยันสั่งอาหาร'
                                )}
                            </button>

                            {/* Clear Cart */}
                            <button
                                onClick={clearCart}
                                className="w-full text-center text-gray-500 hover:text-red-500 text-sm transition-colors"
                            >
                                ล้างตะกร้า
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
