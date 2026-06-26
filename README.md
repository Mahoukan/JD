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
BUILD_VERSION=
```

Discord variables are optional for local browser testing. If they are not configured, the app still works with `Guest xxxx` names.

Discord Activity identity follows the official Embedded App SDK starter flow. The SDK `authorize()` call and server token exchange do not send `redirect_uri`.

`BUILD_VERSION` is optional. If omitted, the server uses the Railway commit hash when available plus a startup timestamp, or falls back to the package version plus a startup timestamp.

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
  - `BUILD_VERSION` only if you want to override automatic build versioning

Make sure your Discord application settings use the deployed Railway URL when you begin configuring the Discord Activity launch flow.

The app exposes `GET /version`, which returns:

```json
{
  "build": "1.0.0-..."
}
```

The visible build badge in the app should match this value.

## Discord Activity Setup

1. Create an application in the Discord Developer Portal.
2. Enable Embedded App / Activity support for the application.
3. Configure the Activity URL to point at your Railway deployment URL.
4. In OAuth2 settings, add the placeholder redirect URL used by the official starter setup:
   - `https://127.0.0.1`
5. Copy the application client ID and client secret into Railway:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
6. Redeploy the Railway service.
7. Open the app in Discord and check the build badge so you know the newest deployment is running.

Identity behavior:

- In Discord, the client loads the Discord Embedded App SDK and requests `identify`.
- The OAuth token exchange happens through the server at `POST /api/discord/token`.
- Activity auth does not send `redirect_uri` to `authorize()`.
- The server does not send `redirect_uri` during token exchange.
- The client sends only display identity fields through `setUserIdentity`.
- The server sanitizes display name, avatar URL, and Discord user ID.
- Roles, scores, host status, and game state remain server-authoritative.
- If Discord identity fails or variables are missing, gameplay continues with Guest names.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
