import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('lichess_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Cancel all seeks
    const response = await fetch('https://lichess.org/api/board/seek/cancel', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to cancel seek:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error('Failed to cancel seek');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error canceling seek:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel seek' },
      { status: 500 }
    );
  }
} 