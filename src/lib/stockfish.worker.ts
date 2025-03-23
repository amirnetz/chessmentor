import Stockfish from 'stockfish.js';

// Initialize Stockfish
const stockfish = Stockfish();

// Handle messages from the main thread
self.onmessage = (event: MessageEvent) => {
  const message = event.data;
  
  // Forward the message to Stockfish
  stockfish.postMessage(message);
};

// Forward Stockfish's messages back to the main thread
stockfish.onmessage = (event: MessageEvent) => {
  self.postMessage(event.data);
}; 