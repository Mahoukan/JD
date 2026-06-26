# Discord Jeopardy Activity

A real-time Jeopardy-style party game built with Express, Socket.IO, and plain HTML/CSS/JavaScript. It is designed to work in a normal browser for local testing and as the foundation for a Discord Activity.

## Features

- Manual role selection for host, players, and spectators
- Waiting room with live connected user lists
- Optional Discord identity foundation with display names and avatars
- Board selection from JSON files in `public/boards/`
- Jeopardy and Double Jeopardy rounds
- Daily Double flow with player selection, wager entry, and wager-based scoring
- Final Jeopardy flow with secret wagers, secret answers, review, judging, and final rankings
- Real-time buzzing with late buzz timing
- Host judging with Correct and Incorrect controls
- Host-only score editing
- Host-only Reset Board
- Player score tracking across rounds
- Used clues tracked separately by round

## Tech Stack

- Node.js
- Express
- Socket.IO
- Plain HTML
- Plain CSS
- Plain JavaScript

## Installation

Clone the repository, then install dependencies:

```bash
npm install
```

Create a local environment file if you need custom settings:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Running Locally

Start the server:

```bash
npm start
```

Open:

```text
http://localhost:3001
```

The default port is `3001`. Set `PORT` in `.env` or your hosting provider if you need a different port.

## Environment Variables

`.env.example` contains the supported local variables:

```env
PORT=3001
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

Discord variables are optional. If they are not configured, local browser testing still works with `Guest xxxx` names.

## Board JSON Format

Boards live in `public/boards/`. Each `.json` file is scanned by the server at startup and shown in the host board selector.

Minimal structure:

```json
{
  "id": "SAMPLE-BOARD",
  "name": "Sample Board",
  "jeopardy": {
    "board": [
      {
        "category": "SCIENCE",
        "questions": [
          {
            "value": 200,
            "clue": "This planet is known as the Red Planet.",
            "answer": "Mars"
          }
        ]
      }
    ]
  },
  "doubleJeopardy": {
    "board": [
      {
        "category": "SPACE",
        "questions": [
          {
            "value": 400,
            "clue": "This star is at the center of our solar system.",
            "answer": "The Sun",
            "dailyDouble": true
          }
        ]
      }
    ]
  },
  "finalJeopardy": {
    "category": "WORLD CAPITALS",
    "clue": "This city is the capital of France.",
    "answer": "Paris"
  }
}
```

Notes:

- `jeopardy.board` is required for a valid board.
- `doubleJeopardy.board` is optional, but required for the Double Jeopardy button to appear.
- `finalJeopardy` is optional, but required for Final Jeopardy.
- Add `"dailyDouble": true` to any clue that should trigger Daily Double.
- Runtime fields such as `answered` are managed in memory by the server.

## Folder Structure

```text
.
|-- public/
|   |-- boards/
|   |   |-- test-board.json
|   |-- app.js
|   |-- index.html
|   |-- style.css
|-- server.js
|-- package.json
|-- package-lock.json
|-- .env.example
|-- .gitignore
|-- LICENSE
|-- README.md
```

## Development Roadmap

Completed foundation:

- Core game flow
- Board selection
- Daily Double
- Double Jeopardy
- Final Jeopardy
- Host score editing
- Discord identity foundation

Possible next steps:

- Discord launch and activity hosting polish
- Better mobile and embedded layout tuning
- Optional timers
- Session persistence
- More host controls and recovery tools
- Automated tests for server game-state transitions

## Railway Deployment Notes

This app can run on Railway as a Node.js service.

Recommended setup:

- Build command: leave empty or use `npm install`
- Start command: `npm start`
- Environment variables:
  - `PORT` is usually provided by Railway automatically
  - `DISCORD_CLIENT_ID` if using Discord identity
  - `DISCORD_CLIENT_SECRET` if using Discord identity

Make sure your Discord application settings use the deployed Railway URL when you begin configuring the Discord Activity launch flow.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
