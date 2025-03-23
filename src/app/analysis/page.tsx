'use client';

import { useEffect, useState, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useSearchParams } from 'next/navigation';

interface TopMove {
  move: string;
  evaluation: number;
  pv: string[];
}

interface PositionTopMoves {
  [fen: string]: TopMove[];
}

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const pgn = searchParams.get('pgn') || '';
  const white = searchParams.get('white') || '';
  const black = searchParams.get('black') || '';

  const [game, setGame] = useState(new Chess());
  const gameRef = useRef(new Chess());  // Add ref to track current game state
  const [currentMove, setCurrentMove] = useState(0);
  const [moves, setMoves] = useState<string[]>([]);
  const [formattedMoves, setFormattedMoves] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<string | null>(null);
  const [topMoves, setTopMoves] = useState<TopMove[]>([]);
  const [positionTopMoves, setPositionTopMoves] = useState<PositionTopMoves>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [engine, setEngine] = useState<any>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    from: string;
    to: string;
    fen: string;
    moveObject: {
      san: string;
      from: string;
      to: string;
      piece: string;
      color: string;
    } | null;
    error?: string;
    uciMove: string;
    currentTurn: string;
    moveIndex: number;
  } | null>(null);

  // Update gameRef whenever game changes
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      console.log('Initializing Stockfish...');
      const stockfish = new Worker('/stockfish.js');
      
      if (!stockfish) {
        console.error("Stockfish failed to initialize");
        setError("Stockfish failed to initialize.");
        return;
      }

      console.log('Stockfish initialized');
      
      stockfish.onmessage = (event: MessageEvent) => {
        const output = event.data as string;
        console.log('Stockfish output:', output);
        
        if (output.includes('uciok')) {
          console.log('Received uciok, setting options...');
          stockfish.postMessage('setoption name MultiPV value 3');
          stockfish.postMessage('setoption name Threads value 4');
          stockfish.postMessage('setoption name Hash value 16');
          stockfish.postMessage('setoption name Minimum Thinking Time value 20');
          stockfish.postMessage('setoption name Slow Mover value 100');
          stockfish.postMessage('setoption name UCI_LimitStrength value false');
          stockfish.postMessage('setoption name UCI_Elo value 1500');
          stockfish.postMessage('isready');
        } else if (output.includes('readyok')) {
          console.log('Engine is ready');
          setIsEngineReady(true);
        } else if (output.includes('bestmove')) {
          console.log('Received bestmove');
          setIsEvaluating(false);
        } else if (output.includes('info depth')) {
          const match = output.match(/info depth \d+ .*?multipv (\d+) .*?score (cp|mate) (-?\d+).*? pv (\S+)/);
          if (match) {
            const [, rank, type, value, uciMove] = match;

            // Keep evaluation from White's perspective
            const evalValue = type === 'cp' ? parseInt(value) / 100 : parseInt(value);

            // Extract UCI move details
            const from = uciMove.slice(0, 2);
            const to = uciMove.slice(2, 4);
            const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

            // Clone the current game state using the ref
            const tempGame = new Chess();
            tempGame.load(gameRef.current.fen());

            // Extract the full PV line - get only the moves after "pv"
            const pvMatch = output.match(/\bpv\b(.*?)(?=\s+\b(?:multipv|depth|seldepth|score|nodes|nps|tbhits|time|$)|\s*$)/);
            const pvMoves = pvMatch ? pvMatch[1].trim().split(' ') : [];

            // Get the current position's turn
            const currentTurn = tempGame.turn();

            // Log the current state
            console.log('Current state:', {
              gameFen: gameRef.current.fen(),
              tempGameFen: tempGame.fen(),
              turn: currentTurn,
              moveHistory: gameRef.current.history({ verbose: true }).map(m => m.san),
              lastMove: gameRef.current.history({ verbose: true }).length > 0 ? gameRef.current.history({ verbose: true })[gameRef.current.history({ verbose: true }).length - 1] : null
            });

            // If we're analyzing a move that doesn't match the current turn,
            // we need to find and apply the appropriate preceding moves
            if (pvMoves.length > 0) {
                // If it's white's turn and we're looking at a black move (from rank 7),
                // we need to find a white move to apply first
                if (currentTurn === 'w' && from[1] === '7') {
                    // Look for a white move in the PV line that comes before our target move
                    for (let i = 0; i < pvMoves.length; i++) {
                        const moveToTry = pvMoves[i];
                        // Skip if this is our target move
                        if (moveToTry === uciMove) continue;
                        
                        // Try to find a valid white move
                        const tryFrom = moveToTry.slice(0, 2);
                        // Check if this is a white move (from rank 2)
                        if (tryFrom[1] === '2') {
                            try {
                                const tryTo = moveToTry.slice(2, 4);
                                const tryPromotion = moveToTry.length > 4 ? moveToTry[4] : undefined;
                                
                                console.log('Trying white move:', {
                                    move: moveToTry,
                                    from: tryFrom,
                                    to: tryTo,
                                    promotion: tryPromotion,
                                    currentTurn: tempGame.turn()
                                });

                                const result = tempGame.move({ from: tryFrom, to: tryTo, promotion: tryPromotion });
                                if (result) {
                                    console.log('Successfully applied white move:', result);
                                    break;
                                }
                            } catch (error) {
                                console.error("Error trying white move:", error);
                            }
                        }
                    }
                }

                // Now we should be at the right position to make our move
                console.log('Ready to apply target move:', {
                    uciMove,
                    currentFen: tempGame.fen(),
                    currentTurn: tempGame.turn()
                });
            }

            // Store debug info for display
            setDebugInfo({
              from,
              to,
              fen: gameRef.current.fen(),
              moveObject: null,
              uciMove,
              currentTurn: tempGame.turn(),
              moveIndex: pvMoves.indexOf(uciMove)
            });

            // Add debug logging
            console.log('Before move:', {
              fen: tempGame.fen(),
              turn: tempGame.turn(),
              from,
              to,
              promotion,
              isCheck: tempGame.isCheck(),
              moves: tempGame.moves({ verbose: true }),
              pvMoves
            });

            try {
              // Apply the move to the temporary game instance
              const moveObject = tempGame.move({ 
                from, 
                to, 
                promotion
              });

              // Add debug logging for successful move
              console.log('After move:', {
                success: !!moveObject,
                moveObject,
                newFen: tempGame.fen(),
                newTurn: tempGame.turn()
              });

              // Get correct standard algebraic notation
              const notation = moveObject ? moveObject.san : uciMove;

              // Get the PV line (principal variation)
              const pvMatch = output.match(/pv (.+)/);
              const pv = pvMatch ? pvMatch[1].split(' ').slice(0, 3) : [];

              setTopMoves(prev => {
                const newMoves = [...prev];
                const index = parseInt(rank) - 1;
                newMoves[index] = { move: notation, evaluation: evalValue, pv };
                return newMoves;
              });

              // Store top moves for the current position
              setPositionTopMoves(prev => ({
                ...prev,
                [gameRef.current.fen()]: [...(prev[gameRef.current.fen()] || []), { move: notation, evaluation: evalValue, pv }]
              }));

              // Update main evaluation from the best move
              if (parseInt(rank) === 1) {
                // Keep evaluation from White's perspective
                //const finalEval = tempGame.turn() === 'b' ? -evalValue : evalValue;
                const finalEval = evalValue;
                setEvaluation(finalEval.toFixed(1));
                console.log(`${tempGame.turn() === "w" ? "White" : "Black"} overall Eval : ${finalEval.toFixed(1)}`);
              }

              // Log move details for debugging
              console.log(`${tempGame.turn() === "w" ? "White" : "Black"} to move: ${notation} (${evalValue.toFixed(2)})`);
              
              // Update debug info with move object
              setDebugInfo(prev => prev ? {
                ...prev,
                moveObject: moveObject ? {
                  san: moveObject.san,
                  from: moveObject.from,
                  to: moveObject.to,
                  piece: moveObject.piece,
                  color: moveObject.color
                } : null,
                currentTurn: tempGame.turn(),
                error: undefined  // Clear any previous error
              } : null);
            } catch (error) {
              console.error("Error applying move:", error);
              // Update debug info with error
              setDebugInfo(prev => prev ? {
                ...prev,
                error: error instanceof Error ? error.message : String(error)
              } : null);
              // Fallback to UCI notation if move conversion fails
              setTopMoves(prev => {
                const newMoves = [...prev];
                const index = parseInt(rank) - 1;
                newMoves[index] = { move: uciMove, evaluation: evalValue, pv: [] };
                return newMoves;
              });
            }
          }
        }
      };

      stockfish.onerror = (error) => {
        console.error("Stockfish error:", error);
        setError("Failed to initialize Stockfish");
      };

      console.log('Sending uci command...');
      stockfish.postMessage('uci');
      setEngine(stockfish);

      return () => {
        console.log('Terminating Stockfish...');
        stockfish.terminate();
      };
    } catch (err) {
      console.error('Stockfish init error:', err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    if (engine && isEngineReady) {
      console.log("Sending position to Stockfish...");
      setIsEvaluating(true);
      setTopMoves([]); // Reset top moves for new position

      // Get all moves in UCI format
      const moveHistory = game.history({ verbose: true });
      const uciMoves = moveHistory.map(move => move.from + move.to + (move.promotion || '')).join(' ');
      
      // Send the starting position and moves to Stockfish
      engine.postMessage('position startpos' + (uciMoves ? ` moves ${uciMoves}` : ''));
      console.log('Sent to Stockfish:', 'position startpos' + (uciMoves ? ` moves ${uciMoves}` : ''));
      
      engine.postMessage('go depth 15 movetime 1000');
    }
  }, [game.fen(), engine, isEngineReady]);

  useEffect(() => {
    if (pgn) {
      const newGame = new Chess();
      newGame.loadPgn(pgn);
      
      // Extract moves from PGN
      const moveHistory = newGame.history({ verbose: true });
      const moveList = moveHistory.map(move => `${move.color === 'w' ? 'White' : 'Black'}: ${move.san}`);
      setMoves(moveList);
      
      // Format moves in PGN style
      const formatted = [];
      for (let i = 0; i < moveHistory.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moveHistory[i].san;
        const blackMove = moveHistory[i + 1] ? moveHistory[i + 1].san : '';
        formatted.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
      }
      setFormattedMoves(formatted);
      
      // Set to final position
      setGame(newGame);
      setCurrentMove(moveList.length);
    }
  }, [pgn]);

  const goToStart = () => {
    const newGame = new Chess();
    setGame(newGame);
    setCurrentMove(0);
  };

  const goToEnd = () => {
    const newGame = new Chess();
    newGame.loadPgn(pgn);
    setGame(newGame);
    setCurrentMove(moves.length);
  };

  const goToNextMove = () => {
    if (currentMove < moves.length) {
      const newGame = new Chess();
      // Apply moves up to current position
      for (let i = 0; i <= currentMove; i++) {
        const move = moves[i].split(': ')[1];
        newGame.move(move);
      }
      setGame(newGame);
      setCurrentMove(currentMove + 1);
    }
  };

  const goToPreviousMove = () => {
    if (currentMove > 0) {
      const newGame = new Chess();
      // Apply moves up to previous position
      for (let i = 0; i < currentMove - 1; i++) {
        const move = moves[i].split(': ')[1];
        newGame.move(move);
      }
      setGame(newGame);
      setCurrentMove(currentMove - 1);
    }
  };

  const goToMove = (index: number) => {
    const newGame = new Chess();
    // Apply moves up to selected position
    for (let i = 0; i <= index; i++) {
      const move = moves[i].split(': ')[1];
      newGame.move(move);
    }
    setGame(newGame);
    setCurrentMove(index + 1);
  };

  const getEvaluationDisplay = () => {
    if (error) {
      return <span className="text-red-500">{error}</span>;
    }
    if (!isEngineReady) {
      return <span className="text-gray-500">Loading engine...</span>;
    }
    if (isEvaluating) {
      return <span className="text-gray-500">Evaluating...</span>;
    }
    if (!evaluation) {
      return <span className="text-gray-500">No evaluation</span>;
    }
    
    const evalValue = parseFloat(evaluation);
    //const isPositive = evalValue >= 0;
    //const displayValue = isPositive ? `+${evalValue.toFixed(1)}` : evalValue.toFixed(1);
    const displayValue = evalValue.toFixed(1);
    const isPositive = evalValue >= 0;
    
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {displayValue}
      </span>
    );
  };

  const getTopMovesDisplay = () => {
    if (!topMoves.length) return null;

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Top Moves:</h3>
        <ul className="space-y-1">
          {topMoves.map((move, index) => {
            const evalValue = move.evaluation;  // Keep evaluation from White's perspective
            const displayValue = evalValue >= 0 ? `+${evalValue.toFixed(1)}` : evalValue.toFixed(1);
            
            return (
              <li key={index} className="text-blue-500">
                {index + 1}. {move.move} ({displayValue})
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Game Analysis</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">
            {white} vs {black}
          </h2>
          <div className="text-sm text-gray-600">
            Move {currentMove} of {moves.length}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Chess Board */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="aspect-square mb-4">
              <Chessboard
                position={game.fen()}
                boardOrientation="white"
                customBoardStyle={{
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                }}
              />
            </div>

            {/* Evaluation */}
            <div className="text-center mb-4">
              <div className="text-lg font-semibold">
                {getEvaluationDisplay()}
              </div>
              {getTopMovesDisplay()}
            </div>

            {/* Navigation Controls */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={goToStart}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                disabled={currentMove === 0}
              >
                ⏮️
              </button>
              <button
                onClick={goToPreviousMove}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={currentMove === 0}
              >
                ⬅️
              </button>
              <button
                onClick={goToNextMove}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={currentMove === moves.length}
              >
                ➡️
              </button>
              <button
                onClick={goToEnd}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                disabled={currentMove === moves.length}
              >
                ⏭️
              </button>
            </div>
          </div>

          {/* Move List */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Move List</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {formattedMoves.map((move, index) => {
                const moveNumber = index + 1;
                const [whiteMove, blackMove] = move.split(' ').slice(1);
                const isCurrentWhiteMove = currentMove === moveNumber * 2 - 1;
                const isCurrentBlackMove = currentMove === moveNumber * 2;

                // Get the position before each move
                const whiteMoveGame = new Chess();
                const blackMoveGame = new Chess();
                
                // Apply moves up to but not including the current move
                moves.slice(0, index * 2).forEach(m => {
                  const moveStr = m.split(': ')[1];
                  whiteMoveGame.move(moveStr);
                  blackMoveGame.move(moveStr);
                });
                
                // For black's move, also apply white's move
                if (blackMove) {
                  blackMoveGame.move(whiteMove);
                }

                // Get suggested moves for each position
                const whiteSuggestedMoves = positionTopMoves[whiteMoveGame.fen()] || [];
                const blackSuggestedMoves = positionTopMoves[blackMoveGame.fen()] || [];

                // Only check if moves were among suggestions if we have suggestions for that position
                const hasWhiteSuggestions = whiteSuggestedMoves.length > 0;
                const hasBlackSuggestions = blackSuggestedMoves.length > 0;
                const isWhiteMoveTopMove = hasWhiteSuggestions && whiteSuggestedMoves.some(tm => tm.move === whiteMove);
                const isBlackMoveTopMove = hasBlackSuggestions && blackSuggestedMoves.some(tm => tm.move === blackMove);

                return (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-gray-500">{moveNumber}.</span>
                    <button
                      onClick={() => goToMove(index * 2)}
                      className={`px-1.5 py-0.5 rounded ${
                        hasWhiteSuggestions
                          ? isWhiteMoveTopMove 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                          : 'hover:bg-gray-100'
                      } ${
                        isCurrentWhiteMove ? 'font-bold' : ''
                      }`}
                    >
                      {whiteMove}
                    </button>
                    {blackMove && (
                      <button
                        onClick={() => goToMove(index * 2 + 1)}
                        className={`px-1.5 py-0.5 rounded ${
                          hasBlackSuggestions
                            ? isBlackMoveTopMove 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                            : 'hover:bg-gray-100'
                        } ${
                          isCurrentBlackMove ? 'font-bold' : ''
                        }`}
                      >
                        {blackMove}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 