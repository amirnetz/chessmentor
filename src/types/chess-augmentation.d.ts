import { Move } from 'chess.js';

declare module 'chess.js' {
  interface Move {
    sloppy?: boolean;
  }
} 