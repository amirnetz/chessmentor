import Stockfish from 'stockfish.js';

export function createStockfishWorker(): Worker | null {
  if (typeof window === "undefined") return null; // Prevent SSR issues
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this browser.');
  }

  try {
    // Create a worker from our dedicated worker file
    const worker = new Worker(
      new URL('./stockfish.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    return worker;
  } catch (error) {
    console.error('Failed to create Stockfish worker:', error);
    return null;
  }
} 