import { NextResponse } from 'next/server';
import crypto from 'crypto';

const LICHESS_AUTH_URL = 'https://lichess.org/oauth';
const CLIENT_ID = process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/lichess';

// Generate a code verifier (43-128 characters)
function generateCodeVerifier() {
  // Generate 32 bytes of random data (will give us more than 43 chars after base64)
  const buffer = crypto.randomBytes(32);
  // Convert to base64URL format
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate code challenge from verifier
function generateCodeChallenge(verifier: string) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return Buffer.from(hash)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function GET() {
  try {
    console.log('Starting OAuth flow...'); // Debug log
    
    const state = Math.random().toString(36).substring(7);
    const codeVerifier = generateCodeVerifier();
    console.log('Code verifier length:', codeVerifier.length); // Debug log
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Lichess scopes: https://lichess.org/api#section/Authentication
    const scopes = [
      'board:play',
      'challenge:read',
      'challenge:write',
      'puzzle:read',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID || '',
      redirect_uri: REDIRECT_URI,
      scope: scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `${LICHESS_AUTH_URL}?${params.toString()}`;
    console.log('Generated auth URL:', authUrl); // Debug log

    const response = NextResponse.redirect(authUrl);
    
    // Store both state and code verifier
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    response.cookies.set('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
  }
} 