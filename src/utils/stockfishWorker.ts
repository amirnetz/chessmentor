export function createStockfishWorker(): Worker | null {
  if (typeof window === 'undefined') return null;
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this browser');
  }

  try {
    return new Worker('/stockfish.js');
  } catch (error) {
    console.error('Failed to create Stockfish worker:', error);
    return null;
  }
} 