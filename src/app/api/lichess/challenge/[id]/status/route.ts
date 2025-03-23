import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('lichess_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    console.log('Checking status for challenge:', params.id);

    // First check if it's already a game
    const gameResponse = await fetch(`https://lichess.org/api/game/${params.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Game response status:', gameResponse.status);

    if (gameResponse.ok) {
      const gameData = await gameResponse.json();
      console.log('Game data found:', gameData);
      return NextResponse.json({
        status: 'started',
        gameId: params.id,
        game: gameData,
      });
    }

    // If not a game, check if it's a challenge
    const challengeResponse = await fetch(`https://lichess.org/api/challenge/${params.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Challenge response status:', challengeResponse.status);

    if (challengeResponse.ok) {
      const challengeData = await challengeResponse.json();
      console.log('Challenge data found:', challengeData);

      // Check challenge status
      if (challengeData.status === 'created' || challengeData.status === 'pending') {
        return NextResponse.json({
          status: 'pending',
          challenge: challengeData,
        });
      } else if (challengeData.status === 'accepted') {
        // If accepted but we didn't find the game, wait a moment and check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        const secondGameResponse = await fetch(`https://lichess.org/api/game/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (secondGameResponse.ok) {
          const gameData = await secondGameResponse.json();
          console.log('Game found after challenge acceptance:', gameData);
          return NextResponse.json({
            status: 'started',
            gameId: params.id,
            game: gameData,
          });
        }
      } else if (challengeData.status === 'declined') {
        return NextResponse.json({
          status: 'declined',
          message: 'Challenge was declined',
        });
      } else if (challengeData.status === 'canceled') {
        return NextResponse.json({
          status: 'canceled',
          message: 'Challenge was canceled',
        });
      }
    } else {
      // Log the error response from the challenge check
      const errorText = await challengeResponse.text();
      console.log('Challenge check error response:', errorText);
    }

    // Only mark as expired if both game and challenge checks fail with 404
    if (gameResponse.status === 404 && challengeResponse.status === 404) {
      console.log('Both game and challenge not found (404), marking as expired');
      return NextResponse.json({ 
        status: 'expired',
        message: 'Challenge has expired' 
      });
    }

    // If we get here but haven't returned yet, the challenge is probably still pending
    console.log('Challenge status indeterminate, assuming still pending');
    return NextResponse.json({
      status: 'pending',
      message: 'Challenge status pending'
    });

  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
} 