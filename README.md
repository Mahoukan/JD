# Trivia Showdown

A real-time Jeopardy-style trivia party game for browsers and Discord Activities. One host runs the board, players buzz in and wager, and spectators can follow along live.

The app is built with Express, Socket.IO, and plain HTML/CSS/JavaScript.

## What the Game Does

- Browser lobbies with short join codes for local or remote play
- Discord Activity support with optional Discord display names and avatars
- Host, player, and spectator roles
- Waiting room with live user lists
- Board selection from JSON files in `public/boards/`
- Host board import from `.json` files without restarting the server
- Clue image support from `public/media/`, including a lightbox preview
- Main Trivia Showdown round and Second Trivia Showdown round
- Daily Double flow with host player selection, player wager, and wager scoring
- Final Trivia Showdown with private wagers, private answers, host review, judging, and rankings
- Buzz-in flow with reading and answer timers
- Host answer visibility before reveal
- Host judging with Correct and Incorrect controls
- Host score editing and current-turn controls
- Host-only board reset
- Build badge and `/version` endpoint for deployment checks

## Tech Stack

- Node.js
- Express
- Socket.IO
- Discord Embedded App SDK
- Plain HTML
- Plain CSS
- Plain JavaScript

## Install

```bash
npm install
```

Optional local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Run Locally

```bash
npm start
```

Open:

```text
http://localhost:3001
```

The default port is `3001`. Set `PORT` in `.env` or in your hosting provider to use another port.

## Scripts

```bash
npm run build
npm start
npm run dev
```

`npm run build` bundles the Discord SDK entry file into `public/discord-sdk.js`. `npm start` runs the build first, then starts `server.js`.

## Environment Variables

`.env.example` contains:

```env
PORT=3001
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
BUILD_VERSION=
```

`DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are only needed for Discord Activity identity. Browser lobby play still works without them.

`BUILD_VERSION` is optional. If omitted, the server uses the Railway commit hash when available plus a startup timestamp, or falls back to the package version plus a startup timestamp.

## How to Play

1. Create a lobby as host, or join a lobby with a code.
2. Choose Host, Player, or Spectator.
3. The host selects a board or imports a board JSON file.
4. The host starts the game and selects clues from the board.
5. Players buzz after the clue opens. The host judges answers and controls the reveal.
6. If the board includes a second round, the host can start Second Trivia Showdown.
7. If the board includes a final round, eligible players submit wagers and answers in Final Trivia Showdown.
8. The host reviews final answers, judges them, and shows the final rankings.

## Board JSON Format

Boards live in `public/boards/`. Each `.json` file is scanned by the server and appears in the host board selector.

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
            "answer": "What is Mars?",
            "image": "media/mars.png"
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
            "answer": "What is the Sun?",
            "dailyDouble": true
          }
        ]
      }
    ]
  },
  "finalJeopardy": {
    "category": "WORLD CAPITALS",
    "clue": "This city is the capital of France.",
    "answer": "What is Paris?"
  }
}
```

Notes:

- `jeopardy.board` is required.
- `doubleJeopardy.board` is optional. When present, the host can start Second Trivia Showdown.
- `finalJeopardy` is optional. When present after the second round, the host can start Final Trivia Showdown.
- Add `"dailyDouble": true` to a clue to trigger the Daily Double flow.
- Add `"image": "media/example.png"` to show an image with a clue. Images should live in `public/media/`.
- Runtime fields such as answered clues are managed in memory by the server.
- Imported boards are saved into `public/boards/` and become available immediately.

## Included Boards

The repository includes several playable boards in `public/boards/`, including `Massive Mixed Trivia.json`, `academic-bowl.json`, `General-Knowledge.json`, `pub-quiz-jeopardy.json`, and themed classroom or pop-culture sets.

## Project Structure

```text
.
|-- public/
|   |-- boards/
|   |-- media/
|   |-- app.js
|   |-- discord-sdk.js
|   |-- index.html
|   |-- manifest.json
|   |-- privacy.html
|   |-- service-worker.js
|   |-- style.css
|   |-- terms.html
|-- src/
|   |-- discord-sdk-entry.js
|-- server.js
|-- package.json
|-- package-lock.json
|-- .env.example
|-- LICENSE
|-- README.md
```

## Railway Deployment

This app can run on Railway as a Node.js service.

Recommended setup:

- Build command: leave empty, or use `npm install`
- Start command: `npm start`
- Environment variables:
  - `PORT` is usually provided by Railway automatically
  - `DISCORD_CLIENT_ID` if using Discord identity
  - `DISCORD_CLIENT_SECRET` if using Discord identity
  - `BUILD_VERSION` only if you want to override automatic build versioning

The app exposes:

```text
GET /version
```

Example response:

```json
{
  "build": "1.0.0-..."
}
```

The visible build badge in the game should match this value.

## Discord Activity Setup

1. Create an application in the Discord Developer Portal.
2. Enable Embedded App or Activity support for the application.
3. Configure the Activity URL to point at your deployed app.
4. In OAuth2 settings, add the placeholder redirect URL used by the official starter setup:
   - `https://127.0.0.1`
5. Add these variables to your deployment:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
6. Redeploy the service.
7. Open the Activity in Discord and check the build badge.

Identity behavior:

- In Discord, the client loads the Discord Embedded App SDK and requests `identify`.
- The OAuth token exchange happens through the server at `POST /api/discord/token`.
- Activity auth does not send `redirect_uri` to `authorize()`.
- The server does not send `redirect_uri` during token exchange.
- The client sends only display identity fields through `setUserIdentity`.
- The server sanitizes display name, avatar URL, and Discord user ID.
- Roles, scores, host status, and game state remain server-authoritative.
- If Discord identity fails or variables are missing, gameplay continues with browser names or guest names.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
