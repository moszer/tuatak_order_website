'use client';

import { useRef, useState } from 'react';
import {
  Image,
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitProvider,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from '@imagekit/next';
import { MenuItem } from '../types';

type AddMenuItemModalProps = {
  onClose: () => void;
  onSave: (newItem: Omit<MenuItem, 'id'>) => void;
};

type EditMenuItemModalProps = {
  item: MenuItem;
  onClose: () => void;
  onSave: (updates: Partial<MenuItem>) => void;
};

async function fetchAuthParams() {
  const response = await fetch('/api/upload/imagekit/auth');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }
  const data = await response.json();

  if (data.error || !data.signature || !data.token || !data.expire) {
    throw new Error(data.error || 'Invalid authentication response');
  }

  return {
    signature: data.signature,
    expire: data.expire,
    token: data.token,
    publicKey: data.publicKey || 'public_KxA6nOGAMrPHFO/cQoYQOdr6Gm0=',
  };
}

function validateFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('กรุณาเลือกรูปภาพเท่านั้น');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์ต้องไม่เกิน 5MB');
  }
}

function getImageSrc(src: string) {
  return src.startsWith('https://') ? src.replace('https://ik.imagekit.io/8msldpqil/', '') : src;
}

function getUploadErrorMessage(error: any) {
  if (error instanceof ImageKitAbortError) return 'Upload was aborted';
  if (error instanceof ImageKitInvalidRequestError) return 'Invalid request: ' + error.message;
  if (error instanceof ImageKitUploadNetworkError) return 'Network error: ' + error.message;
  if (error instanceof ImageKitServerError) return 'Server error: ' + error.message;
  if (error?.message) return error.message;
  return 'Unknown error';
}

export function AddMenuItemModal({ onClose, onSave }: AddMenuItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    nameTh: '',
    description: '',
    price: 0,
    image: '',
    category: 'hotpot',
    isPopular: false,
    isSpicy: false,
    isNew: false,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file);
    } catch (error: any) {
      alert(error.message);
      return;
    }

    setUploading(true);
    try {
      const authParams = await fetchAuthParams();
      const uploadResponse = await upload({
        file,
        fileName: `menu_${Date.now()}_${file.name}`,
        folder: '/menu_images/',
        useUniqueFileName: true,
        signature: authParams.signature,
        token: authParams.token,
        expire: authParams.expire,
        publicKey: authParams.publicKey,
      });

      if (!uploadResponse.url) {
        throw new Error('Upload response missing URL');
      }

      setFormData((prev) => ({ ...prev, image: uploadResponse.url! }));
      alert('อัพโหลดรูปภาพสำเร็จ!');
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = getUploadErrorMessage(error);
      if (errorMessage.includes('IMAGEKIT_PRIVATE_KEY')) {
        alert(
          'กรุณาตั้งค่า IMAGEKIT_PRIVATE_KEY ในไฟล์ .env.local\n\nดูคำแนะนำได้ที่ ImageKit Dashboard > Developer Options > API Keys'
        );
      } else {
        alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nameTh || !formData.category) {
      alert('กรุณากรอกชื่อเมนู (ไทย/อังกฤษ) และหมวดหมู่');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '550px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid #2a2a2a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              color: '#fff',
              fontSize: '1.25rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            ➕ เพิ่มเมนูใหม่
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#262626',
              border: '1px solid #333',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#a1a1a1',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              ชื่อเมนู (ภาษาอังกฤษ) *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
              placeholder="Menu Name (English)"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              ชื่อเมนู (ภาษาไทย) *
            </label>
            <input
              type="text"
              value={formData.nameTh}
              onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
              placeholder="ชื่อเมนู (ภาษาไทย)"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              คำอธิบาย
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
              placeholder="คำอธิบายเมนู"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              ราคา (บาท)
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
              }
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
              placeholder="0"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              รูปภาพเมนู
            </label>

            <ImageKitProvider urlEndpoint="https://ik.imagekit.io/8msldpqil">
              {formData.image && (
                <div
                  style={{
                    marginBottom: '12px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #333',
                    background: '#262626',
                    position: 'relative',
                  }}
                >
                  <Image
                    src={getImageSrc(formData.image)}
                    width={400}
                    height={200}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, image: '' });
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <label
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px dashed #404040',
                  background: uploading ? '#333' : '#262626',
                  color: '#a1a1a1',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease',
                  opacity: uploading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = '#333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = '#404040';
                    e.currentTarget.style.background = '#262626';
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                {uploading ? '⏳ กำลังอัพโหลด...' : '📤 คลิกเพื่ออัพโหลดรูปภาพ'}
              </label>

              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#262626',
                  border: '1px solid #333',
                }}
              >
                <div
                  style={{
                    color: '#737373',
                    fontSize: '0.8rem',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                >
                  หรือกรอก URL รูปภาพ
                </div>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #333',
                    background: '#1a1a1a',
                    color: 'white',
                    fontSize: '0.85rem',
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </ImageKitProvider>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              หมวดหมู่ *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
            >
              <option value="hotpot">สุกี้ (Hot Pot)</option>
              <option value="grilled">ปิ้งย่าง (Grilled)</option>
              <option value="seafood">อาหารทะเล (Seafood)</option>
              <option value="appetizer">เรียกน้ำย่อย (Appetizers)</option>
              <option value="drinks">เครื่องดื่ม (Drinks)</option>
              <option value="dessert">ของหวาน (Desserts)</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#a1a1a1',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
              />
              <span>⭐ ยอดนิยม</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#a1a1a1',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="checkbox"
                checked={formData.isSpicy}
                onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
              />
              <span>🌶️ เผ็ด</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#a1a1a1',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <input
                type="checkbox"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
              />
              <span>🆕 ใหม่</span>
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: '#a1a1a1',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditMenuItemModal({ item, onClose, onSave }: EditMenuItemModalProps) {
  const [formData, setFormData] = useState({
    name: item.name,
    nameTh: item.nameTh,
    description: item.description,
    price: item.price,
    image: item.image,
    category: item.category,
    isPopular: item.isPopular,
    isSpicy: item.isSpicy,
    isNew: item.isNew,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file);
    } catch (error: any) {
      alert(error.message);
      return;
    }

    setUploading(true);
    try {
      const authParams = await fetchAuthParams();
      const uploadResponse = await upload({
        file,
        fileName: `menu_${Date.now()}_${file.name}`,
        folder: '/menu_images/',
        useUniqueFileName: true,
        signature: authParams.signature,
        token: authParams.token,
        expire: authParams.expire,
        publicKey: authParams.publicKey,
      });

      if (!uploadResponse.url) {
        throw new Error('Upload response missing URL');
      }

      setFormData((prev) => ({ ...prev, image: uploadResponse.url! }));
      alert('อัพโหลดรูปภาพสำเร็จ!');
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = getUploadErrorMessage(error);
      if (errorMessage.includes('IMAGEKIT_PRIVATE_KEY')) {
        alert(
          'กรุณาตั้งค่า IMAGEKIT_PRIVATE_KEY ในไฟล์ .env.local\n\nดูคำแนะนำได้ที่ ImageKit Dashboard > Developer Options > API Keys'
        );
      } else {
        alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '550px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid #2a2a2a',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            color: '#fff',
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          แก้ไขเมนู: {item.nameTh}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                fontSize: '0.85rem',
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              ชื่อภาษาอังกฤษ
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                fontSize: '0.85rem',
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              ชื่อภาษาไทย
            </label>
            <input
              type="text"
              value={formData.nameTh}
              onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                fontSize: '0.85rem',
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              คำอธิบาย
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                fontSize: '0.85rem',
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              ราคา (฿) - ใส่ 0 สำหรับบุฟเฟ่ต์
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
              }
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
            />
            {formData.price === 0 && (
              <p
                style={{
                  color: '#10b981',
                  fontSize: '0.8rem',
                  marginTop: '4px',
                }}
              >
                ✓ ตั้งเป็นราคาบุฟเฟ่ต์ (0 บาท)
              </p>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                marginBottom: '6px',
                fontWeight: 500,
                fontSize: '0.85rem',
              }}
            >
              รูปภาพเมนู
            </label>

            <ImageKitProvider urlEndpoint="https://ik.imagekit.io/8msldpqil">
              {formData.image && (
                <div
                  style={{
                    marginBottom: '12px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #333',
                    background: '#262626',
                    position: 'relative',
                  }}
                >
                  <Image
                    src={getImageSrc(formData.image)}
                    width={400}
                    height={200}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '180px',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, image: '' });
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              <label
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px dashed #404040',
                  background: uploading ? '#333' : '#262626',
                  color: '#a1a1a1',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s ease',
                  opacity: uploading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = '#333';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.borderColor = '#404040';
                    e.currentTarget.style.background = '#262626';
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                {uploading ? '⏳ กำลังอัพโหลด...' : '📤 คลิกเพื่ออัพโหลดรูปภาพ'}
              </label>

              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#262626',
                  border: '1px solid #333',
                }}
              >
                <div
                  style={{
                    color: '#737373',
                    fontSize: '0.8rem',
                    marginBottom: '6px',
                    fontWeight: 500,
                  }}
                >
                  หรือกรอก URL รูปภาพ
                </div>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #333',
                    background: '#1a1a1a',
                    color: 'white',
                    fontSize: '0.85rem',
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </ImageKitProvider>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#a1a1a1',
                fontSize: '0.85rem',
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              หมวดหมู่
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: 'white',
                fontSize: '0.9rem',
              }}
            >
              <option value="hotpot">สุกี้ (Hot Pot)</option>
              <option value="grilled">ปิ้งย่าง (Grilled)</option>
              <option value="seafood">อาหารทะเล (Seafood)</option>
              <option value="appetizer">เรียกน้ำย่อย (Appetizers)</option>
              <option value="drinks">เครื่องดื่ม (Drinks)</option>
              <option value="dessert">ของหวาน (Desserts)</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #333',
                background: '#262626',
                color: '#a1a1a1',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

