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
import Swal from 'sweetalert2';

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
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกรูปภาพเท่านั้น');
  if (file.size > 5 * 1024 * 1024) throw new Error('ขนาดไฟล์ต้องไม่เกิน 5MB');
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

const MODAL_CSS = `
  @keyframes modal-spin { to { transform: rotate(360deg); } }
  @keyframes modal-in { from { opacity:0; transform:translateY(8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
  .mf-input { width:100%; padding:9px 12px; border-radius:8px; border:1px solid #1e293b; background:#0d1117; color:#f1f5f9; font-size:0.875rem; outline:none; box-sizing:border-box; transition:border-color 0.15s; font-family:inherit; }
  .mf-input:focus { border-color:#334155; }
  .mf-input::placeholder { color:#334155; }
  .mf-select { width:100%; padding:9px 12px; border-radius:8px; border:1px solid #1e293b; background:#0d1117; color:#f1f5f9; font-size:0.875rem; outline:none; box-sizing:border-box; font-family:inherit; cursor:pointer; }
  .mf-select:focus { border-color:#334155; }
  .mf-textarea { width:100%; padding:9px 12px; border-radius:8px; border:1px solid #1e293b; background:#0d1117; color:#f1f5f9; font-size:0.875rem; outline:none; box-sizing:border-box; resize:vertical; font-family:inherit; line-height:1.5; }
  .mf-textarea:focus { border-color:#334155; }
  .mf-label { display:block; color:#475569; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
  .mf-tag-btn { padding:6px 14px; border-radius:6px; border:1px solid #1e293b; background:transparent; font-size:0.78rem; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:inherit; }
  .mf-tag-btn:hover { border-color:#334155; }
  .mf-btn-ghost { padding:9px 20px; border-radius:8px; border:1px solid #1e293b; background:transparent; color:#64748b; font-size:0.875rem; font-weight:500; cursor:pointer; transition:all 0.15s; font-family:inherit; }
  .mf-btn-ghost:hover { border-color:#334155; color:#94a3b8; }
  .mf-btn-primary { padding:9px 24px; border-radius:8px; border:none; background:#10b981; color:#fff; font-size:0.875rem; font-weight:600; cursor:pointer; transition:background 0.15s; font-family:inherit; }
  .mf-btn-primary:hover { background:#059669; }
  .mf-upload-zone { display:flex; align-items:center; justify-content:center; gap:8px; padding:16px; border-radius:8px; border:1px dashed #1e293b; background:transparent; color:#475569; cursor:pointer; transition:all 0.15s; font-size:0.82rem; font-weight:500; width:100%; box-sizing:border-box; }
  .mf-upload-zone:hover:not([data-uploading='true']) { border-color:#334155; color:#64748b; background:rgba(255,255,255,0.02); }
`;

// ── Shared form body ───────────────────────────────────────────────────────────
type FormData = Omit<MenuItem, 'id'>;

function MenuForm({
  formData,
  setFormData,
  onClose,
  onSubmit,
  submitLabel,
  uploading,
  setUploading,
  fileInputRef,
  title,
  subtitle,
}: {
  formData: FormData;
  setFormData: (d: FormData) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  title: string;
  subtitle: string;
}) {
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { validateFile(file); } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message, confirmButtonColor: '#ef4444' });
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
      if (!uploadResponse.url) throw new Error('Upload response missing URL');
      setFormData({ ...formData, image: uploadResponse.url! });
      await Swal.fire({ icon: 'success', title: 'อัพโหลดสำเร็จ', confirmButtonColor: '#10b981', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      const msg = getUploadErrorMessage(error);
      if (msg.includes('IMAGEKIT_PRIVATE_KEY')) {
        await Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', html: 'กรุณาตั้งค่า IMAGEKIT_PRIVATE_KEY ในไฟล์ .env.local', confirmButtonColor: '#f97316' });
      } else {
        await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg, confirmButtonColor: '#ef4444' });
      }
    } finally {
      setUploading(false);
    }
  };

  const toggle = (key: 'isPopular' | 'isSpicy' | 'isNew') => setFormData({ ...formData, [key]: !formData[key] });

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{ __html: MODAL_CSS }} />
      <div
        style={{ background:'#0d1117', borderRadius:'14px', width:'100%', maxWidth:'560px', maxHeight:'92vh', overflowY:'auto', border:'1px solid #1e293b', boxShadow:'0 32px 80px rgba(0,0,0,0.7)', animation:'modal-in 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid #1a2332', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h2 style={{ color:'#f1f5f9', fontSize:'1.05rem', fontWeight:700, margin:0 }}>{title}</h2>
            <p style={{ color:'#334155', fontSize:'0.75rem', margin:'3px 0 0' }}>{subtitle}</p>
          </div>
          <button onClick={onClose} style={{ background:'#1e293b', border:'none', borderRadius:'7px', width:'30px', height:'30px', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding:'20px 24px 24px' }}>

          {/* Image */}
          <div style={{ marginBottom:'20px' }}>
            <label className="mf-label">รูปภาพ</label>
            <ImageKitProvider urlEndpoint="https://ik.imagekit.io/8msldpqil">
              <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                {/* Preview */}
                <div style={{ width:'88px', height:'88px', borderRadius:'10px', background:'#111827', border:'1px solid #1e293b', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  {formData.image ? (
                    <>
                      <Image src={getImageSrc(formData.image)} width={88} height={88} alt="Preview" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      <button type="button" onClick={() => setFormData({ ...formData, image: '' })}
                        style={{ position:'absolute', top:'4px', right:'4px', background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%', width:'22px', height:'22px', color:'#fff', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  )}
                </div>

                {/* Upload controls */}
                <div style={{ flex:1 }}>
                  <label className="mf-upload-zone" data-uploading={uploading ? 'true' : 'false'} style={{ opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} style={{ display:'none' }} />
                    {uploading ? (
                      <>
                        <span style={{ width:'14px', height:'14px', border:'2px solid rgba(16,185,129,0.3)', borderTopColor:'#10b981', borderRadius:'50%', display:'inline-block', animation:'modal-spin 0.8s linear infinite' }} />
                        กำลังอัพโหลด...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                        อัพโหลดรูปภาพ
                      </>
                    )}
                  </label>
                  <div style={{ marginTop:'8px', position:'relative' }}>
                    <input className="mf-input" type="text" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="หรือวาง URL รูปภาพ..." style={{ paddingLeft:'32px', fontSize:'0.78rem' }} />
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </div>
                </div>
              </div>
            </ImageKitProvider>
          </div>

          {/* Name fields - 2 col */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
            <div>
              <label className="mf-label">ชื่อภาษาไทย *</label>
              <input className="mf-input" type="text" required value={formData.nameTh} onChange={e => setFormData({ ...formData, nameTh: e.target.value })} placeholder="ชุดสุกี้..." />
            </div>
            <div>
              <label className="mf-label">ชื่อภาษาอังกฤษ *</label>
              <input className="mf-input" type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Signature Set..." />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom:'14px' }}>
            <label className="mf-label">คำอธิบาย</label>
            <textarea className="mf-textarea" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="รายละเอียดเมนู..." />
          </div>

          {/* Price + Category - 2 col */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
            <div>
              <label className="mf-label">ราคา (฿) — 0 = บุฟเฟ่ต์</label>
              <input className="mf-input" type="number" min="0" step="0.01" value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
              {formData.price === 0 && <p style={{ color:'#10b981', fontSize:'0.72rem', margin:'4px 0 0' }}>บุฟเฟ่ต์ (ไม่คิดราคาเดี่ยว)</p>}
            </div>
            <div>
              <label className="mf-label">หมวดหมู่ *</label>
              <select className="mf-select" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                <option value="hotpot">สุกี้ (Hot Pot)</option>
                <option value="grilled">ปิ้งย่าง (Grilled)</option>
                <option value="seafood">อาหารทะเล (Seafood)</option>
                <option value="appetizer">เรียกน้ำย่อย (Appetizers)</option>
                <option value="drinks">เครื่องดื่ม (Drinks)</option>
                <option value="dessert">ของหวาน (Desserts)</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom:'22px' }}>
            <label className="mf-label">แท็ก</label>
            <div style={{ display:'flex', gap:'8px' }}>
              <button type="button" className="mf-tag-btn" onClick={() => toggle('isPopular')}
                style={{ color: formData.isPopular ? '#eab308' : '#475569', borderColor: formData.isPopular ? 'rgba(234,179,8,0.35)' : '#1e293b', background: formData.isPopular ? 'rgba(234,179,8,0.08)' : 'transparent' }}>
                ยอดนิยม
              </button>
              <button type="button" className="mf-tag-btn" onClick={() => toggle('isSpicy')}
                style={{ color: formData.isSpicy ? '#ef4444' : '#475569', borderColor: formData.isSpicy ? 'rgba(239,68,68,0.35)' : '#1e293b', background: formData.isSpicy ? 'rgba(239,68,68,0.08)' : 'transparent' }}>
                เผ็ด
              </button>
              <button type="button" className="mf-tag-btn" onClick={() => toggle('isNew')}
                style={{ color: formData.isNew ? '#10b981' : '#475569', borderColor: formData.isNew ? 'rgba(16,185,129,0.35)' : '#1e293b', background: formData.isNew ? 'rgba(16,185,129,0.08)' : 'transparent' }}>
                ใหม่
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', paddingTop:'16px', borderTop:'1px solid #1a2332' }}>
            <button type="button" className="mf-btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="mf-btn-primary">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Modal ──────────────────────────────────────────────────────────────────
export function AddMenuItemModal({ onClose, onSave }: AddMenuItemModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '', nameTh: '', description: '', price: 0, image: '',
    category: 'hotpot', isPopular: false, isSpicy: false, isNew: false,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nameTh || !formData.category) {
      await Swal.fire({ icon: 'warning', title: 'แจ้งเตือน', text: 'กรุณากรอกชื่อเมนู (ไทย/อังกฤษ) และหมวดหมู่', confirmButtonColor: '#f97316' });
      return;
    }
    onSave(formData);
  };

  return (
    <MenuForm
      formData={formData}
      setFormData={setFormData}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="เพิ่มเมนู"
      uploading={uploading}
      setUploading={setUploading}
      fileInputRef={fileInputRef}
      title="เพิ่มเมนูใหม่"
      subtitle="กรอกข้อมูลเมนูใหม่ที่ต้องการเพิ่ม"
    />
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
export function EditMenuItemModal({ item, onClose, onSave }: EditMenuItemModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: item.name, nameTh: item.nameTh, description: item.description,
    price: item.price, image: item.image, category: item.category,
    isPopular: item.isPopular, isSpicy: item.isSpicy, isNew: item.isNew,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <MenuForm
      formData={formData}
      setFormData={setFormData}
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSave(formData); }}
      submitLabel="บันทึก"
      uploading={uploading}
      setUploading={setUploading}
      fileInputRef={fileInputRef}
      title={`แก้ไขเมนู`}
      subtitle={item.nameTh}
    />
  );
}
