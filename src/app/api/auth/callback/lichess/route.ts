import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const CLIENT_ID = process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/lichess';

export async function GET(request: NextRequest) {
  console.log('Received callback request'); // Debug log
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');
  const state = searchParams.get('state');

  console.log('Callback params:', { code, error, error_description, state }); // Debug log

  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(
      `${BASE_URL}/login?error=${encodeURIComponent(error)}&description=${encodeURIComponent(error_description || '')}`
    );
  }

  if (!code) {
    console.error('No code received');
    return NextResponse.redirect(`${BASE_URL}/login?error=no_code`);
  }

  // Verify state
  const savedState = request.cookies.get('oauth_state')?.value;
  if (!savedState || savedState !== state) {
    console.error('State mismatch');
    return NextResponse.redirect(`${BASE_URL}/login?error=invalid_state`);
  }

  // Get code verifier
  const codeVerifier = request.cookies.get('oauth_code_verifier')?.value;
  if (!codeVerifier) {
    console.error('No code verifier found');
    return NextResponse.redirect(`${BASE_URL}/login?error=no_code_verifier`);
  }

  try {
    // Exchange code for token
    console.log('Exchanging code for token...'); // Debug log
    const tokenResponse = await fetch('https://lichess.org/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID || '',
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token response error:', errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const data = await tokenResponse.json();
    console.log('Received token response'); // Debug log

    // Create response with the new token
    const response = NextResponse.redirect(`${BASE_URL}/dashboard`);
    
    // Clear the OAuth cookies
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_code_verifier');
    
    // Set the access token cookie
    response.cookies.set('lichess_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log('Set token cookie, redirecting to dashboard'); // Debug log
    return response;
  } catch (error) {
    console.error('Auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(`${BASE_URL}/login?error=${encodeURIComponent(errorMessage)}`);
  }
} 