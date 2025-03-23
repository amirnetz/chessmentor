import { useEffect, useRef } from 'react';

interface ChessBoardProps {
  gameId: string | null;
}

export default function ChessBoard({ gameId }: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameId || !boardRef.current) return;

    // Load Lichess board widget
    const script = document.createElement('script');
    script.src = 'https://lichess.org/api/board.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore - Lichess board widget is loaded globally
      if (window.LichessBoard) {
        // @ts-ignore
        window.LichessBoard.start({
          position: 'start',
          boardTheme: 'lichess',
          pieceTheme: 'https://lichess.org/assets/piece/cburnett/{piece}.svg',
          draggable: true,
          moveSpeed: 'fast',
          snapbackSpeed: 500,
          snapSpeed: 100,
          pieceSquare: '',
          highlight: {
            lastMove: true,
            check: true,
          },
          animation: {
            duration: 200,
          },
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [gameId]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div ref={boardRef} className="aspect-square w-full" />
    </div>
  );
} 