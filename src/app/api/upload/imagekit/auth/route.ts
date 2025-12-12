import { NextRequest, NextResponse } from 'next/server';
import { getUploadAuthParams } from '@imagekit/next/server';

// ImageKit authentication endpoint for client-side upload
export async function GET(request: NextRequest) {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || 'public_KxA6nOGAMrPHFO/cQoYQOdr6Gm0=';
    
    if (!privateKey) {
      return NextResponse.json(
        { error: 'IMAGEKIT_PRIVATE_KEY is not configured. Please set it in .env.local' },
        { status: 500 }
      );
    }

    // Use ImageKit SDK to generate authentication parameters
    const { token, expire, signature } = getUploadAuthParams({
      privateKey,
      publicKey,
    });

    return NextResponse.json({
      token,
      signature,
      expire,
      publicKey,
    });
  } catch (error: any) {
    console.error('Error generating auth parameters:', error);
    const errorMessage = error.message || 'Failed to generate authentication parameters';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

