# ChessMentor

ChessMentor is a web application that helps chess players improve their game by providing real-time analysis and insights. The application integrates with Lichess to provide a seamless playing experience while offering post-game analysis and improvement suggestions.

## Features (Phase 1)

- Lichess integration for playing chess games
- Real-time game visualization
- OAuth authentication with Lichess
- Responsive and modern UI

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with your Lichess API credentials:
```bash
NEXT_PUBLIC_LICHESS_CLIENT_ID=your_client_id
LICHESS_CLIENT_SECRET=your_client_secret
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Next.js 14
- TypeScript
- TailwindCSS
- Chess.js
- Lichess API

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. 