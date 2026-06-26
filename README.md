# Discord Jeopardy Activity

A real-time Jeopardy-style game built for Discord Activity hosting. The app uses Express and Socket.IO with plain HTML, CSS, and JavaScript so hosts, players, and spectators can share the same live game state.

## Current Features

- Role selection for host, players, and spectators
- Waiting room with connected user lists
- Host-only game start
- JSON-driven Jeopardy board rendering
- Responsive board layout with player score display
- Host clue selection
- Shared question screen
- Host answer reveal
- Used clues marked blank on the board
- Player buzzing with buzz timing
- Host judging with Correct and Incorrect controls
- Score updates for judged answers
- Locked-out players after incorrect answers

## Planned Features

- Score editing controls for the host
- Timers for questions and buzzing
- Daily Doubles
- Final Jeopardy
- Board selection and loading multiple board files
- Discord Activity SDK integration polish
- Persistent game/session management

## Installation

Install dependencies:

```bash
npm install
```

## Running Locally

Start the server:

```bash
npm start
```

By default, the app runs at:

```text
http://localhost:3001
```

To use a different port, set `PORT` in your environment. See `.env.example`.

## Project Structure

```text
.
├── public/
│   ├── boards/
│   │   └── test-board.json
│   ├── app.js
│   ├── index.html
│   └── style.css
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## JSON Board Format

Boards live in `public/boards/` and are loaded by the server. The current format supports a Jeopardy round with categories and questions:

```json
{
  "id": "TEST-BOARD",
  "name": "Test Board",
  "jeopardy": {
    "board": [
      {
        "category": "SCIENCE",
        "questions": [
          {
            "value": 200,
            "clue": "This planet is known as the Red Planet.",
            "answer": "What is Mars?"
          }
        ]
      }
    ]
  }
}
```

The server adds temporary in-memory gameplay fields such as `answered`; the source JSON files do not need to include them.

## Technology Stack

- Node.js
- Express
- Socket.IO
- Plain HTML
- Plain CSS
- Plain JavaScript

## License

This project is licensed under the MIT License. See `LICENSE` for details.
