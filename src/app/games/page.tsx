'use client';

import { useEffect, useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, Label } from 'recharts';
import openings from '../../data/openings.json';
import blackOpenings from '../../data/black_openings.json';

interface Game {
  id: string;
  date: string;
  white: string;
  black: string;
  result: string;
  pgn: string;
  opening?: string;
  blackDefense?: string;
}

interface OpeningAnalysis {
  matchedOpening?: string;
  matchedBlackDefense?: string;
  positionMatches: {
    moveNumber: number;
    position: string;
    matchedOpenings: string[];
    totalMatchingOpenings: number;
  }[];
  blackDefenseMatches: {
    moveNumber: number;
    position: string;
    matchedDefenses: string[];
    totalMatchingDefenses: number;
  }[];
}

interface OpeningStats {
  name: string;
  wins: number;
  losses: number;
  total: number;
}

// Function to analyze opening moves
function analyzeOpening(pgn: string): OpeningAnalysis {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const moves = chess.history();
  const tempGame = new Chess();
  const analysis: OpeningAnalysis = {
    matchedOpening: undefined,
    matchedBlackDefense: undefined,
    positionMatches: [],
    blackDefenseMatches: []
  };

  // Extract white's moves
  const whiteMoves: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    whiteMoves.push(moves[i]);
  }

  // For each move number, find matching white openings
  for (let moveNumber = 1; moveNumber <= Math.min(8, whiteMoves.length); moveNumber++) {
    const currentWhiteMoves = whiteMoves.slice(0, moveNumber);
    
    // Find all openings that match up to this point
    const matchedOpenings = openings.filter(opening => {
      const openingWhiteMoves = opening.moves.split(' ').filter((_, i) => i % 2 === 0);
      if (currentWhiteMoves.length > openingWhiteMoves.length) return false;
      
      // Compare each white move in the sequence
      for (let j = 0; j < currentWhiteMoves.length; j++) {
        if (currentWhiteMoves[j] !== openingWhiteMoves[j]) return false;
      }
      return true;
    }).map(opening => opening.opening);

    // Apply moves to get position
    tempGame.reset();
    for (let i = 0; i < moveNumber * 2 && i < moves.length; i++) {
      tempGame.move(moves[i]);
    }

    // Add the position match data for white
    analysis.positionMatches.push({
      moveNumber,
      position: tempGame.fen().split(' ')[0],
      matchedOpenings,
      totalMatchingOpenings: matchedOpenings.length
    });

    // Update the main opening to the one with the longest matching sequence
    if (matchedOpenings.length > 0) {
      analysis.matchedOpening = matchedOpenings[0];
    }
  }

  // Analyze black defenses using the full move sequence
  for (let moveNumber = 1; moveNumber <= Math.min(8, Math.floor(moves.length / 2)); moveNumber++) {
    const currentMoves = moves.slice(0, moveNumber * 2);
    const currentMovesStr = currentMoves.join(' ');
    
    // Find all black defenses that match up to this point
    const matchedDefenses = blackOpenings.filter(defense => {
      const defenseMoves = defense.moves.split(' ');
      if (currentMoves.length > defenseMoves.length) return false;
      
      // Compare the full sequence of moves
      for (let j = 0; j < currentMoves.length; j++) {
        if (currentMoves[j] !== defenseMoves[j]) return false;
      }
      return true;
    }).map(defense => defense.opening);

    // Apply moves to get position
    tempGame.reset();
    for (let i = 0; i < moveNumber * 2 && i < moves.length; i++) {
      tempGame.move(moves[i]);
    }

    // Add the position match data for black
    analysis.blackDefenseMatches.push({
      moveNumber,
      position: tempGame.fen().split(' ')[0],
      matchedDefenses,
      totalMatchingDefenses: matchedDefenses.length
    });

    // Update the main black defense to the one with the longest matching sequence
    if (matchedDefenses.length > 0) {
      analysis.matchedBlackDefense = matchedDefenses[0];
    }
  }

  console.log('Opening Analysis:', analysis);
  return analysis;
}

export default function GamesPage(): JSX.Element | null {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [game, setGame] = useState(new Chess());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openingAnalysis, setOpeningAnalysis] = useState<OpeningAnalysis | null>(null);
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null);
  const [selectedDefense, setSelectedDefense] = useState<string | null>(null);

  // Load saved username on component mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('chesscom_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsSubmitted(true);
      fetchGames(savedUsername);
    }
  }, []);

  const formatDate = (dateString: string) => {
    try {
      // Convert Unix timestamp to milliseconds
      const timestamp = parseInt(dateString) * 1000;
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const fetchGames = async (usernameToFetch: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chesscom/games?username=${encodeURIComponent(usernameToFetch)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch games');
      }

      console.log('Analyzing openings for', data.games.length, 'games');
      // Add opening information to each game
      const gamesWithOpenings = data.games.map((game: Game) => {
        const analysis = analyzeOpening(game.pgn);
        console.log('Game', game.id, 'opening:', analysis.matchedOpening, 'defense:', analysis.matchedBlackDefense);
        return {
          ...game,
          opening: analysis.matchedOpening,
          blackDefense: analysis.matchedBlackDefense
        };
      });

      console.log('Games with openings:', gamesWithOpenings);
      setGames(gamesWithOpenings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
      console.error('Error fetching games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Save username to localStorage
    localStorage.setItem('chesscom_username', username);
    setIsSubmitted(true);
    await fetchGames(username);
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    const newGame = new Chess();
    newGame.loadPgn(game.pgn);
    setGame(newGame);
    
    // Perform opening analysis
    const analysis = analyzeOpening(game.pgn);
    setOpeningAnalysis(analysis);
  };

  const handleChangeUsername = () => {
    setIsSubmitted(false);
    setGames([]);
    setSelectedGame(null);
    setError(null);
  };

  const filteredGames = games.filter(game => {
    // Color filter
    if (colorFilter === 'white' && game.black === username) return false;
    if (colorFilter === 'black' && game.white === username) return false;

    // Result filter
    if (resultFilter === 'won') {
      const isWhite = game.white === username;
      if ((isWhite && game.result !== '1-0') || (!isWhite && game.result !== '0-1')) return false;
    }
    if (resultFilter === 'lost') {
      const isWhite = game.white === username;
      if ((isWhite && game.result !== '0-1') || (!isWhite && game.result !== '1-0')) return false;
    }

    // Opening/Defense filter
    if (selectedOpening) {
      // Only show games where player is white and uses this opening
      if (game.white !== username || game.opening !== selectedOpening) return false;
    }
    if (selectedDefense) {
      // Only show games where player is black and uses this defense
      if (game.black !== username || game.blackDefense !== selectedDefense) return false;
    }

    return true;
  });

  const { openingStats, defenseStats } = useMemo(() => {
    const openings = new Map<string, OpeningStats>();
    const defenses = new Map<string, OpeningStats>();

    // Process all games (not filtered) to collect statistics
    games.forEach(game => {
      const isPlayerWhite = game.white === username;
      const isWin = (isPlayerWhite && game.result === '1-0') || (!isPlayerWhite && game.result === '0-1');
      const isLoss = (isPlayerWhite && game.result === '0-1') || (!isPlayerWhite && game.result === '1-0');

      // Process white openings - only when player is white
      if (isPlayerWhite && game.opening) {
        const opening = game.opening;
        if (!openings.has(opening)) {
          openings.set(opening, { name: opening, wins: 0, losses: 0, total: 0 });
        }
        const stats = openings.get(opening)!;
        if (isWin) stats.wins++;
        if (isLoss) stats.losses++;
        stats.total++;
      }

      // Process black defenses - only when player is black
      if (!isPlayerWhite && game.blackDefense) {
        const defense = game.blackDefense;
        if (!defenses.has(defense)) {
          defenses.set(defense, { name: defense, wins: 0, losses: 0, total: 0 });
        }
        const stats = defenses.get(defense)!;
        if (isWin) stats.wins++;
        if (isLoss) stats.losses++;
        stats.total++;
      }
    });

    // Convert to arrays and sort by frequency
    return {
      openingStats: Array.from(openings.values()).sort((a, b) => b.total - a.total),
      defenseStats: Array.from(defenses.values()).sort((a, b) => b.total - a.total)
    };
  }, [games, username]);

  const renderOpeningAnalysis = () => {
    if (!openingAnalysis) return null;
    
    return (
      <div className="space-y-4">
        {/* White's Opening */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-700 mb-2">White's Opening</h4>
          {openingAnalysis.matchedOpening && (
            <div className="text-green-700 font-medium mb-2">
              Identified Opening: {openingAnalysis.matchedOpening}
            </div>
          )}
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">Matching Openings by Move:</div>
            {openingAnalysis.positionMatches.map((match, index) => (
              <div key={index} className="text-sm border-b border-gray-200 pb-2 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="font-medium">After White's Move {match.moveNumber}:</span>
                  <span className={`${
                    match.totalMatchingOpenings > 0 ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {match.totalMatchingOpenings} matching {match.totalMatchingOpenings === 1 ? 'opening' : 'openings'}
                  </span>
                </div>
                {match.totalMatchingOpenings > 0 && (
                  <div className="pl-4 text-gray-600 mt-1 text-xs">
                    {match.matchedOpenings.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Black's Defense */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Black's Defense</h4>
          {openingAnalysis.matchedBlackDefense && (
            <div className="text-blue-700 font-medium mb-2">
              Identified Defense: {openingAnalysis.matchedBlackDefense}
            </div>
          )}
          <div className="space-y-2">
            <div className="text-sm font-medium mb-2">Matching Defenses by Move:</div>
            {openingAnalysis.blackDefenseMatches.map((match, index) => (
              <div key={index} className="text-sm border-b border-gray-200 pb-2 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="font-medium">After Move {match.moveNumber}:</span>
                  <span className={`${
                    match.totalMatchingDefenses > 0 ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {match.totalMatchingDefenses} matching {match.totalMatchingDefenses === 1 ? 'defense' : 'defenses'}
                  </span>
                </div>
                {match.totalMatchingDefenses > 0 && (
                  <div className="pl-4 text-gray-600 mt-1 text-xs">
                    {match.matchedDefenses.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    if (openingStats.length === 0 && defenseStats.length === 0) return null;

    const chartConfig = {
      margin: { top: 5, right: 30, left: 5, bottom: 5 },
      labelWidth: 180,
      fontSize: 12
    };

    const handleChartClick = (chartData: any, chartName: 'opening' | 'defense') => {
      if (chartData && chartData.activePayload && chartData.activePayload[0]) {
        // If clicking on a bar, filter by that opening/defense
        const name = chartData.activePayload[0].payload.name;
        if (chartName === 'opening') {
          // If clicking the same opening again, deselect it
          if (selectedOpening === name) {
            setSelectedOpening(null);
            if (!selectedDefense) setColorFilter('all');
          } else {
            setSelectedOpening(name);
            setSelectedDefense(null); // Clear defense selection
            setColorFilter('white'); // Force white color filter
          }
        } else {
          // If clicking the same defense again, deselect it
          if (selectedDefense === name) {
            setSelectedDefense(null);
            if (!selectedOpening) setColorFilter('all');
          } else {
            setSelectedDefense(name);
            setSelectedOpening(null); // Clear opening selection
            setColorFilter('black'); // Force black color filter
          }
        }
      } else {
        // If clicking on empty space, clear filters
        if (chartName === 'opening') {
          setSelectedOpening(null);
          if (!selectedDefense) setColorFilter('all'); // Only reset color if no defense is selected
        } else {
          setSelectedDefense(null);
          if (!selectedOpening) setColorFilter('all'); // Only reset color if no opening is selected
        }
      }
    };

    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-xl font-semibold mb-4">Opening Statistics</h2>
        
        {/* White Openings Chart */}
        {openingStats.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              White Openings
              {selectedOpening && (
                <button
                  onClick={() => setSelectedOpening(null)}
                  className="ml-2 text-sm text-blue-500 hover:text-blue-600"
                  type="button"
                >
                  (Clear Filter)
                </button>
              )}
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={openingStats}
                  layout="vertical"
                  margin={chartConfig.margin}
                  onClick={(data) => handleChartClick(data, 'opening')}
                >
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={chartConfig.labelWidth}
                    tick={({ x, y, payload }) => (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={4}
                          textAnchor="end"
                          fill={selectedOpening === payload.value ? '#2563eb' : '#000000'}
                          fontSize={chartConfig.fontSize}
                        >
                          {payload.value}
                        </text>
                      </g>
                    )}
                    interval={0}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const entry = props.payload;
                      const total = entry.wins + entry.losses;
                      const winPercentage = Math.round((entry.wins / total) * 100);
                      if (name === 'wins') {
                        return [`${value} wins (${winPercentage}% win rate)`, name];
                      }
                      return [`${value} losses`, name];
                    }}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="wins" 
                    stackId="a" 
                    fill="#22c55e"
                    name="Wins"
                  >
                    {openingStats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        stroke={entry.name === selectedOpening ? "#000000" : undefined}
                        strokeWidth={entry.name === selectedOpening ? 2 : 0}
                      />
                    ))}
                  </Bar>
                  <Bar 
                    dataKey="losses" 
                    stackId="a" 
                    fill="#ef4444"
                    name="Losses"
                  >
                    {openingStats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        stroke={entry.name === selectedOpening ? "#000000" : undefined}
                        strokeWidth={entry.name === selectedOpening ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Black Defenses Chart */}
        {defenseStats.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              Black Defenses
              {selectedDefense && (
                <button
                  onClick={() => setSelectedDefense(null)}
                  className="ml-2 text-sm text-blue-500 hover:text-blue-600"
                  type="button"
                >
                  (Clear Filter)
                </button>
              )}
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={defenseStats}
                  layout="vertical"
                  margin={chartConfig.margin}
                  onClick={(data) => handleChartClick(data, 'defense')}
                >
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={chartConfig.labelWidth}
                    tick={({ x, y, payload }) => (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={4}
                          textAnchor="end"
                          fill={selectedDefense === payload.value ? '#2563eb' : '#000000'}
                          fontSize={chartConfig.fontSize}
                        >
                          {payload.value}
                        </text>
                      </g>
                    )}
                    interval={0}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const entry = props.payload;
                      const total = entry.wins + entry.losses;
                      const winPercentage = Math.round((entry.wins / total) * 100);
                      if (name === 'wins') {
                        return [`${value} wins (${winPercentage}% win rate)`, name];
                      }
                      return [`${value} losses`, name];
                    }}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="wins" 
                    stackId="a" 
                    fill="#22c55e"
                    name="Wins"
                  >
                    {defenseStats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        stroke={entry.name === selectedDefense ? "#000000" : undefined}
                        strokeWidth={entry.name === selectedDefense ? 2 : 0}
                      />
                    ))}
                  </Bar>
                  <Bar 
                    dataKey="losses" 
                    stackId="a" 
                    fill="#ef4444"
                    name="Losses"
                  >
                    {defenseStats.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        stroke={entry.name === selectedDefense ? "#000000" : undefined}
                        strokeWidth={entry.name === selectedDefense ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Chess.com Games</h1>
      
      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Enter Chess.com Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="e.g., MagnusCarlsen"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            View Games
          </button>
        </form>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Viewing games for: <span className="font-semibold">{username}</span>
            </div>
            <button
              onClick={handleChangeUsername}
              className="text-blue-500 hover:text-blue-600"
              type="button"
            >
              Change Username
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              Loading games...
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4 bg-red-50 rounded">
              {error}
              <button
                onClick={() => fetchGames(username)}
                className="block mx-auto mt-2 text-sm text-red-600 hover:text-red-700"
                type="button"
              >
                Try Again
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center text-gray-500 p-4 bg-gray-50 rounded">
              No games found for {username}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Games List */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
                
                {/* Filter Buttons */}
                <div className="flex justify-between items-start mb-4">
                  {/* Color Filter */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Color:</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setColorFilter('all')}
                        className={`px-3 py-1 text-sm rounded ${
                          colorFilter === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setColorFilter('white')}
                        className={`px-3 py-1 text-sm rounded ${
                          colorFilter === 'white'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        White
                      </button>
                      <button
                        onClick={() => setColorFilter('black')}
                        className={`px-3 py-1 text-sm rounded ${
                          colorFilter === 'black'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        Black
                      </button>
                    </div>
                  </div>

                  {/* Result Filter */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Result:</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setResultFilter('all')}
                        className={`px-3 py-1 text-sm rounded ${
                          resultFilter === 'all'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setResultFilter('won')}
                        className={`px-3 py-1 text-sm rounded ${
                          resultFilter === 'won'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        Won
                      </button>
                      <button
                        onClick={() => setResultFilter('lost')}
                        className={`px-3 py-1 text-sm rounded ${
                          resultFilter === 'lost'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        type="button"
                      >
                        Lost
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredGames.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className={`w-full text-left p-2 rounded ${
                        selectedGame?.id === game.id
                          ? 'bg-blue-100 border-blue-500'
                          : 'hover:bg-gray-100'
                      }`}
                      type="button"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span>{game.white} vs {game.black}</span>
                          <span className="text-sm text-gray-500">• {formatDate(game.date)}</span>
                        </div>
                        <span className="font-semibold">{game.result}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <div className="flex items-center space-x-3">
                          {game.opening && (
                            <div className="text-green-600">
                              White: {game.opening}
                            </div>
                          )}
                          {game.blackDefense && (
                            <>
                              <div className="text-gray-400">|</div>
                              <div className="text-blue-600">
                                Black: {game.blackDefense}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {/* Statistics Panel */}
                {renderStats()}

                {/* Game Viewer */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Game Viewer</h2>
                    {selectedGame && (
                      <Link
                        href={`/analysis?pgn=${encodeURIComponent(selectedGame.pgn)}&white=${encodeURIComponent(selectedGame.white)}&black=${encodeURIComponent(selectedGame.black)}`}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                      >
                        Analyze Game
                      </Link>
                    )}
                  </div>
                  {selectedGame && (
                    <div className="space-y-4">
                      <div className="aspect-square">
                        <Chessboard
                          position={game.fen()}
                          boardOrientation="white"
                          customBoardStyle={{
                            borderRadius: '4px',
                            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                      </div>
                      {/* Opening Analysis Panel */}
                      <div className="bg-gray-50 p-4 rounded">
                        <h3 className="font-semibold mb-2">Opening Analysis</h3>
                        {renderOpeningAnalysis()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}