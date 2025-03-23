'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NewGameModal from '@/components/NewGameModal';

export default function DashboardPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateGame = async (options: any) => {
    try {
      setError(null);
      setIsSeeking(true);
      console.log('Creating game with options:', options);
      
      const response = await fetch('/api/lichess/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game');
      }

      console.log('Challenge created:', data);
      router.push(`/game/${data.challengeId}`);
    } catch (error) {
      console.error('Error creating game:', error);
      setError(error instanceof Error ? error.message : 'Failed to create game. Please try again.');
    } finally {
      setIsSeeking(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-8 text-4xl font-bold text-gray-900">
        ChessMentor Dashboard
      </h1>

      {error && (
        <div className="mb-8 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold text-gray-800">Start a Game</h2>
          <p className="mb-4 text-gray-600">
            Choose your preferred time control and start a new game on Lichess.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isSeeking}
            className={`rounded-lg px-6 py-3 text-white transition-colors ${
              isSeeking 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#4d4d4d] hover:bg-[#3d3d3d]'
            }`}
          >
            {isSeeking ? 'Finding Opponent...' : 'New Game'}
          </button>
          {isSeeking && (
            <div className="mt-4 flex items-center text-gray-600">
              <div className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></div>
              Searching for an opponent...
            </div>
          )}
        </div>
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-2xl font-semibold text-gray-800">Recent Games</h2>
          <p className="text-gray-600">
            Your recent games will appear here. After each game, we'll provide analysis and improvement suggestions.
          </p>
        </div>
      </div>

      <NewGameModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onCreateGame={(options) => {
          handleCreateGame(options);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
} 