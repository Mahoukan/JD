# Trivia Showdown

A real-time Trivia Showdown party game for browsers and Discord Activities. One host runs the grid, players buzz in and bet, and spectators can follow along live.

The app is built with Express, Socket.IO, and plain HTML/CSS/JavaScript.

## What the Game Does

- Browser lobbies with short join codes for local or remote play
- Discord Activity support with optional Discord display names and avatars
- Host, player, and spectator roles
- Waiting room with live user lists
- Grid selection from JSON files in `public/boards/`
- Host grid import from `.json` files without restarting the server
- Prompt image support from `public/media/`, including a lightbox preview
- Warm Up and Power Round play
- Risk Tile flow with host player selection, player bet, and bet scoring
- Face-a-Face with private bets, private guesses, host review, judging, and rankings
- Buzz-in flow with reading and guess timers
- Host guess visibility before reveal
- Host judging with Correct and Incorrect controls
- Host score editing and current-turn controls
- Host-only grid reset
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
3. The host selects a grid or imports a grid JSON file.
4. The host starts the game and selects prompts from the grid.
5. Players buzz after the prompt opens. The host judges guesses and controls the reveal.
6. If the grid includes a Power Round, the host can start it after Warm Up.
7. If the grid includes Face-a-Face, eligible players submit bets and guesses.
8. The host reviews Face-a-Face guesses, judges them, and shows the final rankings.

## Grid JSON Format

Grids live in `public/boards/`. Each `.json` file is scanned by the server and appears in the host grid selector.

Minimal structure:

```json
{
  "id": "SAMPLE-GRID",
  "name": "Sample Grid",
  "rounds": {
    "round1": {
      "categories": [
        {
          "category": "SCIENCE",
          "prompts": [
            {
              "value": 200,
              "prompt": "This planet is known as the Red Planet.",
              "guessAnswer": "What is Mars?",
              "image": "media/mars.png"
            }
          ]
        }
      ]
    },
    "round2": {
      "categories": [
        {
          "category": "SPACE",
          "prompts": [
            {
              "value": 400,
              "prompt": "This star is at the center of our solar system.",
              "guessAnswer": "What is the Sun?",
              "type": "risk"
            }
          ]
        }
      ]
    },
    "final": {
      "category": "WORLD CAPITALS",
      "prompt": "This city is the capital of France.",
      "guessAnswer": "What is Paris?"
    }
  }
}
```

Notes:

- `rounds.round1.categories` is required.
- `rounds.round2.categories` is optional. When present, the host can start Power Round.
- `rounds.final` is optional. When present after Power Round, the host can start Face-a-Face.
- Add `"type": "risk"` to a prompt to trigger the Risk Tile flow.
- Add `"image": "media/example.png"` to show an image with a prompt. Images should live in `public/media/`.
- Runtime fields such as answered prompts are managed in memory by the server.
- Imported grids are saved into `public/boards/` and become available immediately.
- Legacy grid files using the previous keys are still accepted and normalized on load for compatibility.

## Included Grids

The repository includes several playable grids in `public/boards/`, including `Massive Mixed Trivia.json`, `academic-bowl.json`, `General-Knowledge.json`, and themed classroom or pop-culture sets.

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
