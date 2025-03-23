'use client';

import { useState } from 'react';
import NewGameModal from '@/components/NewGameModal';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lichessToken, setLichessToken] = useState<string | null>(null);

  const handleCreateGame = async (time: number, increment: number, rated: boolean) => {
    try {
      // First check if we have a Lichess token
      if (!lichessToken) {
        // Redirect to Lichess login
        window.location.href = `https://lichess.org/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_REDIRECT_URI}&scope=challenge:write`;
        return;
      }

      const response = await fetch('/api/lichess/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time,
          increment,
          rated,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const data = await response.json();
      window.location.href = `/game/${data.challengeId}`;
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Chess Mentor</h1>
        
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Play on Lichess
          </button>
          
          <a
            href="/games"
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
          >
            View Chess.com Games
          </a>
        </div>
      </div>

      <NewGameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateGame={handleCreateGame}
      />
    </main>
  );
} 