import { NextRequest, NextResponse } from 'next/server';

async function fetchMonthlyGames(username: string, year: number, month: number) {
  const response = await fetch(
    `https://api.chess.com/pub/player/${username}/games/${year}/${month.toString().padStart(2, '0')}`
  );
  if (!response.ok) {
    if (response.status === 404) {
      return { games: [] };
    }
    throw new Error(`Failed to fetch games for ${year}/${month}`);
  }
  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // We'll look back up to 6 months to try to get 200 games
    const allGames = [];
    let year = currentYear;
    let month = currentMonth;

    // Try to fetch up to 200 games by looking back month by month
    for (let i = 0; i < 6 && allGames.length < 200; i++) {
      try {
        const monthlyData = await fetchMonthlyGames(username, year, month);
        if (monthlyData.games) {
          allGames.push(...monthlyData.games);
        }
      } catch (error) {
        console.error(`Error fetching games for ${year}/${month}:`, error);
      }

      // Move to previous month
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
    }

    // Sort games by date (newest first) and limit to 200
    const sortedGames = allGames
      .sort((a: any, b: any) => b.end_time - a.end_time)
      .slice(0, 200)
      .map((game: any) => ({
        id: game.uuid,
        date: game.end_time,
        white: game.white.username,
        black: game.black.username,
        result: game.white.result === 'win' ? '1-0' : game.black.result === 'win' ? '0-1' : '1/2-1/2',
        pgn: game.pgn
      }));

    return NextResponse.json({ games: sortedGames });
  } catch (error) {
    console.error('Error in games API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
} 