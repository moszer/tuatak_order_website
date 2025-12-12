'use client';

import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { MenuItem } from '../data/menuItems';
import { Image } from '@imagekit/next';

interface MenuCardProps {
    item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
    const { addItem } = useCart();
    const [showPopup, setShowPopup] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [comment, setComment] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleOpenPopup = () => {
        setQuantity(1);
        setComment('');
        setShowPopup(true);
    };

    const handleAddToCart = () => {
        setIsAdding(true);
        addItem({
            id: item.id,
            name: item.name,
            nameTh: item.nameTh,
            price: item.price,
            image: item.image,
            quantity: quantity,
            comment: comment.trim() || undefined,
        });
        setTimeout(() => {
            setIsAdding(false);
            setShowPopup(false);
            setQuantity(1);
            setComment('');
        }, 500);
    };

    // Get emoji based on category
    const getCategoryEmoji = () => {
        switch (item.category) {
            case 'hotpot': return '🍲';
            case 'grilled': return '🔥';
            case 'seafood': return '🦐';
            case 'appetizer': return '🥟';
            case 'drinks': return '🧋';
            case 'dessert': return '🍧';
            default: return '🍽️';
        }
    };

    // Get gradient based on category
    const getCategoryGradient = () => {
        switch (item.category) {
            case 'hotpot': return 'linear-gradient(135deg, #FFE5E5 0%, #FFD4D4 100%)';
            case 'grilled': return 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)';
            case 'seafood': return 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)';
            case 'appetizer': return 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)';
            case 'drinks': return 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)';
            case 'dessert': return 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)';
            default: return 'linear-gradient(135deg, #F5F5F5 0%, #EEEEEE 100%)';
        }
    };

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'stretch',
                background: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(45, 37, 32, 0.08)',
                border: '1px solid rgba(45, 37, 32, 0.06)'
            }}>
                {/* Image */}
                <div style={{
                    width: '90px',
                    minHeight: '90px',
                    background: getCategoryGradient(),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {item.image && item.image.trim() !== '' ? (
                        <Image
                            src={item.image.startsWith('https://') 
                                ? item.image.replace('https://ik.imagekit.io/8msldpqil/', '')
                                : item.image}
                            alt={item.nameTh}
                            width={90}
                            height={90}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
                        <span style={{
                            fontSize: '2.5rem',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                        }}>{getCategoryEmoji()}</span>
                    )}

                    {/* Badges */}
                    {(item.isPopular || item.isNew) && (
                        <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}>
                            {item.isPopular && (
                                <span style={{
                                    background: '#FF6B4A',
                                    color: 'white',
                                    fontSize: '0.5rem',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    fontWeight: 600
                                }}>🔥 ยอดนิยม</span>
                            )}
                            {item.isNew && (
                                <span style={{
                                    background: '#4A9FD4',
                                    color: 'white',
                                    fontSize: '0.5rem',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    fontWeight: 600
                                }}>✨ ใหม่</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0,
                    overflow: 'hidden'
                }}>
                    <div>
                        <h3 style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#2D2520',
                            margin: '0 0 2px 0',
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>{item.nameTh}</h3>
                        <p style={{
                            fontSize: '0.7rem',
                            color: '#8B7355',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>{item.name}</p>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '8px'
                    }}>
                        <div>
                            <span style={{
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                color: '#FF6B4A'
                            }}>{item.price}</span>
                            <span style={{
                                fontSize: '0.65rem',
                                color: '#8B7355',
                                marginLeft: '2px'
                            }}>บาท</span>
                        </div>

                        <button
                            onClick={handleOpenPopup}
                            style={{
                                background: '#FF6B4A',
                                border: 'none',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            🛒 หยิบใส่ตะกร้า
                        </button>
                    </div>
                </div>
            </div>

            {/* Popup Modal */}
            {showPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '20px'
                }} onClick={() => setShowPopup(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '360px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            {item.image && item.image.trim() !== '' ? (
                                <div style={{
                                    width: '150px',
                                    height: '150px',
                                    margin: '0 auto 16px',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    background: getCategoryGradient(),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Image
                                        src={item.image.startsWith('https://') 
                                            ? item.image.replace('https://ik.imagekit.io/8msldpqil/', '')
                                            : item.image}
                                        alt={item.nameTh}
                                        width={150}
                                        height={150}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{getCategoryEmoji()}</div>
                            )}
                            <h3 style={{
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                color: '#2D2520',
                                margin: '0 0 4px 0'
                            }}>{item.nameTh}</h3>
                            <p style={{
                                fontSize: '0.85rem',
                                color: '#8B7355',
                                margin: 0
                            }}>{item.name}</p>
                            <p style={{
                                fontSize: '1.2rem',
                                fontWeight: 800,
                                color: '#FF6B4A',
                                margin: '8px 0 0 0'
                            }}>{item.price} บาท</p>
                        </div>

                        {/* Quantity */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#2D2520',
                                marginBottom: '8px'
                            }}>จำนวน</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px'
                            }}>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        border: '2px solid #FF6B4A',
                                        background: 'white',
                                        color: '#FF6B4A',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >−</button>
                                <span style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    color: '#2D2520',
                                    minWidth: '40px',
                                    textAlign: 'center'
                                }}>{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: '#FF6B4A',
                                        color: 'white',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >+</button>
                            </div>
                        </div>

                        {/* Comment */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#2D2520',
                                marginBottom: '8px'
                            }}>หมายเหตุ (ถ้ามี)</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="เช่น ไม่ใส่ผัก, เพิ่มเผ็ด..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid #ddd',
                                    fontSize: '0.9rem',
                                    resize: 'none',
                                    minHeight: '80px',
                                    fontFamily: 'inherit',
                                    color: '#DC2626'
                                }}
                            />
                        </div>

                        {/* Total */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderTop: '1px solid #eee',
                            marginBottom: '16px'
                        }}>
                            <span style={{ fontSize: '0.9rem', color: '#666' }}>รวม</span>
                            <span style={{
                                fontSize: '1.3rem',
                                fontWeight: 800,
                                color: '#FF6B4A'
                            }}>{item.price * quantity} บาท</span>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowPopup(false)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    color: '#666',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >ยกเลิก</button>
                            <button
                                onClick={handleAddToCart}
                                disabled={isAdding}
                                style={{
                                    flex: 2,
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: isAdding ? '#4CAF50' : '#FF6B4A',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >{isAdding ? '✓ เพิ่มแล้ว!' : '🛒 เพิ่มลงตะกร้า'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
