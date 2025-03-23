import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('lichess_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log('Creating game with options:', body);

    // Create an open challenge
    const response = await fetch('https://lichess.org/api/challenge/open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        rated: String(body.rated || false),
        clock_limit: String(body.time),
        clock_increment: String(body.increment),
        variant: 'standard',
      }),
      cache: 'no-store',
      keepalive: true,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lichess API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Lichess API error: ${errorText}`);
    }

    const challengeData = await response.json();
    console.log('Challenge created:', challengeData);
    
    return NextResponse.json({
      challengeId: challengeData.id,
      seeking: true,
      message: 'Looking for an opponent...',
    });

  } catch (error) {
    console.error('Game creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create game' },
      { status: 500 }
    );
  }
} 