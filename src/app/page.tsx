'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2D2520 0%, #3D352E 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      {/* Logo */}
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        overflow: 'hidden',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <Image
          src="/logo.jpg"
          alt="TUATAK Shabunt"
          width={120}
          height={120}
          style={{ objectFit: 'cover' }}
        />
      </div>

      <h1 style={{
        color: 'white',
        fontSize: '2rem',
        fontWeight: 800,
        marginBottom: '8px',
        textAlign: 'center'
      }}>TUATAK Shabunt</h1>

      <p style={{
        color: '#FF6B4A',
        fontSize: '1rem',
        marginBottom: '32px'
      }}>เลือกโต๊ะของคุณ</p>

      {/* Table Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        maxWidth: '320px',
        width: '100%'
      }}>
        {tables.map((table) => (
          <Link
            key={table}
            href={`/table${table}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <span style={{ fontSize: '2rem', marginBottom: '8px' }}>🍜</span>
            <span style={{
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 700
            }}>โต๊ะ {table}</span>
            <span style={{
              color: '#8B7355',
              fontSize: '0.75rem'
            }}>Table {table}</span>
          </Link>
        ))}
      </div>

      <p style={{
        color: '#666',
        fontSize: '0.8rem',
        marginTop: '32px',
        textAlign: 'center'
      }}>
        สแกน QR Code หรือเลือกโต๊ะเพื่อเริ่มสั่งอาหาร
      </p>
    </div>
  );
}
