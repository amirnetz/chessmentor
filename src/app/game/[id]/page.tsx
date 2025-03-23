'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import ChessBoard from '@/components/ChessBoard';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('seeking');
  const [reconnectCount, setReconnectCount] = useState(0);

  const connectToStream = useCallback(() => {
    if (!id) return;

    console.log('Connecting to stream...');
    const eventSource = new EventSource(`/api/lichess/stream?challengeId=${id}`);
    let lastHeartbeat = Date.now();

    // Set up heartbeat check
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastHeartbeat > 10000) { // 10 seconds without heartbeat
        console.log('No heartbeat received, reconnecting...');
        eventSource.close();
        connectToStream();
      }
    }, 5000);

    eventSource.onmessage = (event) => {
      lastHeartbeat = Date.now();
      try {
        const data = JSON.parse(event.data);
        console.log('Received event:', data);

        if (data.type === 'gameStart') {
          setGameId(data.game.id);
          setStatus('playing');
        } else if (data.type === 'gameFinish') {
          setStatus('finished');
          setGameId(null);
        } else if (data.type === 'error') {
          setError(data.message);
          setStatus('error');
        }
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Stream error:', error);
      eventSource.close();
      clearInterval(heartbeatInterval);
      if (reconnectCount < 3) {
        setTimeout(() => {
          setReconnectCount(prev => prev + 1);
          connectToStream();
        }, 2000);
      } else {
        setError('Failed to connect to game stream');
        setStatus('error');
      }
    };

    return () => {
      eventSource.close();
      clearInterval(heartbeatInterval);
    };
  }, [id, reconnectCount]);

  useEffect(() => {
    connectToStream();
  }, [connectToStream]);

  const handleCancel = async () => {
    try {
      // Cancel the seek
      await fetch('/api/lichess/seek/cancel', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error canceling seek:', error);
    }
    router.push('/dashboard');
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-5xl mx-auto">
          <div className="p-8 bg-white rounded-lg shadow text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameId) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-5xl mx-auto">
          <div className="p-8 bg-white rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold mb-4">Finding an Opponent</h2>
            <p className="text-gray-600 mb-4">
              We're looking for a suitable opponent for your game...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Game {id}</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {status === 'waiting' && (
            <div className="text-center py-4">
              <p className="text-lg">Finding an opponent...</p>
              <p className="text-sm text-gray-600">This may take a few moments</p>
            </div>
          )}

          {status === 'playing' && gameId && (
            <div className="text-center py-4">
              <p className="text-lg">Game in progress!</p>
              <ChessBoard gameId={gameId} />
            </div>
          )}

          {status === 'finished' && (
            <div className="text-center py-4">
              <p className="text-lg">Game finished</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-[#4d4d4d] text-white rounded hover:bg-[#3d3d3d]"
              >
                Return to Dashboard
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <p className="text-lg text-red-600">An error occurred</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-4 py-2 bg-[#4d4d4d] text-white rounded hover:bg-[#3d3d3d]"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 