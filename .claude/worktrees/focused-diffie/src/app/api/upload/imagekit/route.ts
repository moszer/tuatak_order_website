import { NextRequest, NextResponse } from 'next/server';

// ImageKit authentication endpoint for client-side upload
// This endpoint generates authentication parameters (token, signature, expire)
export async function GET(request: NextRequest) {
  try {
    const crypto = require('crypto');
    
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || 'public_KxA6nOGAMrPHFO/cQoYQOdr6Gm0=';
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
    
    if (!privateKey) {
      return NextResponse.json(
        { error: 'IMAGEKIT_PRIVATE_KEY is not configured' },
        { status: 500 }
      );
    }

    // Generate token (random string)
    const token = crypto.randomBytes(16).toString('hex');
    
    // Calculate expire time (1 hour from now)
    const expire = Math.floor(Date.now() / 1000) + 3600;
    
    // Generate signature
    const signatureString = token + expire.toString();
    const signature = crypto
      .createHmac('sha1', Buffer.from(privateKey, 'utf-8'))
      .update(signatureString)
      .digest('hex');

    return NextResponse.json({
      token,
      signature,
      expire,
    });
  } catch (error) {
    console.error('Error generating auth parameters:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication parameters' },
      { status: 500 }
    );
  }
}

