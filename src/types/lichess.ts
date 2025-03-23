export interface LichessUser {
  id: string;
  username: string;
  perfs: {
    bullet: LichessPerf;
    blitz: LichessPerf;
    rapid: LichessPerf;
    classical: LichessPerf;
  };
  title?: string;
  createdAt: number;
  seenAt: number;
}

export interface LichessPerf {
  games: number;
  rating: number;
  rd: number;
  prog: number;
  prov?: boolean;
}

export interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  lastMoveAt: number;
  status: string;
  players: {
    white: LichessPlayer;
    black: LichessPlayer;
  };
  winner?: 'white' | 'black';
}

export interface LichessPlayer {
  user: {
    id: string;
    name: string;
    title?: string;
  };
  rating: number;
  ratingDiff?: number;
} 