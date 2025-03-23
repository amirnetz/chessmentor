declare module 'stockfish.js' {
  interface StockfishInstance {
    postMessage(message: string): void;
    onmessage: (event: MessageEvent) => void;
    onerror: (error: Error) => void;
    terminate(): void;
  }

  function Stockfish(): StockfishInstance;
  export default Stockfish;
} 