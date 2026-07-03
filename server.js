import "dotenv/config";
import express from "express";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import http from "http";
import { basename, dirname, join } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import {
  normalizeGridForStorage,
  normalizeGridPack,
  stripAnsweredTracking
} from "./src/grid-normalizer.js";
import { query, testDatabaseConnection } from "./src/db.js";
import { sessionMiddleware } from "./src/session.js";
import { isGoogleAuthConfigured, passport, setupPassport } from "./src/auth.js";
import { saveCompletedMatch } from "./src/match-history.js";
const app = express();
const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3001;
const READING_TIMER_MS = 5000;
const ANSWER_TIMER_MS = 10000;
const TIMER_BROADCAST_MS = 250;
const LOBBY_CODE_LENGTH = 5;
const LOBBY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
const buildCommit = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || packageJson.version;
const BUILD_VERSION = process.env.BUILD_VERSION ||
  `${buildCommit}-${Date.now()}`;
const gridsDirectory = join(__dirname, "public", "boards");
let availableGrids = discoverAvailableGrids();
const selectedGrid = availableGrids[0] ?? createFallbackGridOption();
const initialGrid = loadGridByFilename(selectedGrid.filename) ?? createEmptyGrid(selectedGrid);

app.set("trust proxy", 1);

setupPassport();

app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

io.engine.use(sessionMiddleware);

app.get("/api/auth/config", (req, res) => {
  res.json({
    ok: true,
    googleConfigured: isGoogleAuthConfigured()
  });
});

function requireGoogleAuthConfigured(req, res, next) {
  if (isGoogleAuthConfigured()) {
    next();
    return;
  }

  res.status(503).json({
    ok: false,
    error: "Google login is not configured."
  });
}

app.get(
  "/auth/google",
  requireGoogleAuthConfigured,
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

app.get(
  "/auth/google/callback",
  requireGoogleAuthConfigured,
  passport.authenticate("google", {
    failureRedirect: "/?login=failed",
  }),
  (req, res) => {
    req.session.player = req.user;
    res.redirect("/");
  },
);

app.post("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("trivia.sid");
      res.json({ ok: true });
    });
  });
});

app.get("/api/me", (req, res) => {
  res.json({
    ok: true,
    loggedIn: Boolean(req.session.player),
    player: req.session.player || null,
  });
});

app.post("/api/account/display-name", async (req, res) => {
  if (!req.session.player?.id) {
    res.status(401).json({
      ok: false,
      error: "You must be signed in to change your account name."
    });
    return;
  }

  const displayName = sanitizeAccountDisplayName(req.body?.displayName);

  if (!displayName) {
    res.status(400).json({
      ok: false,
      error: "Display name is required."
    });
    return;
  }

  try {
    const result = await query(
      `
        UPDATE players
        SET
          display_name = $2,
          last_seen_at = NOW()
        WHERE id = $1
        RETURNING id, display_name, avatar_url
      `,
      [req.session.player.id, displayName]
    );
    const player = result.rows[0];

    if (!player) {
      res.status(404).json({
        ok: false,
        error: "Account not found."
      });
      return;
    }

    req.session.player = {
      ...req.session.player,
      id: player.id,
      displayName: player.display_name,
      avatarUrl: player.avatar_url || "",
      provider: req.session.player.provider || "google",
      providerUserId: req.session.player.providerUserId || ""
    };

    req.session.save((error) => {
      if (error) {
        console.error("Failed to save updated account session:", error);
        res.status(500).json({
          ok: false,
          error: "Could not update display name."
        });
        return;
      }

      res.json({
        ok: true,
        player: req.session.player
      });
    });
  } catch (error) {
    console.error("Failed to update account display name:", error);
    res.status(500).json({
      ok: false,
      error: "Could not update display name."
    });
  }
});
app.get("/api/db-health", async (req, res) => {
  try {
    const result = await testDatabaseConnection();

    res.json({
      ok: true,
      databaseTime: result.now,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      ok: false,
      error: "Database connection failed.",
    });
  }
});

app.get("/api/matches/recent", async (req, res) => {
  try {
    const result = await query(`
      SELECT *
      FROM recent_matches_view
      LIMIT 10
    `);

    res.json({
      ok: true,
      matches: result.rows.map(formatRecentMatchRow)
    });
  } catch (error) {
    if (error.code !== "42P01") {
      console.error("Recent matches view query failed:", error);
      res.status(500).json({
        ok: false,
        error: "Could not load recent matches."
      });
      return;
    }

    try {
      const fallbackResult = await query(`
        SELECT
          m.id,
          m.grid_name,
          m.ended_at,
          winner.display_name AS winner_name,
          COUNT(mp.match_id)::int AS player_count
        FROM matches m
        LEFT JOIN match_players winner
          ON winner.match_id = m.id
          AND winner.placement = 1
        LEFT JOIN match_players mp
          ON mp.match_id = m.id
        GROUP BY m.id, m.grid_name, m.ended_at, winner.display_name
        ORDER BY m.ended_at DESC
        LIMIT 10
      `);

      res.json({
        ok: true,
        matches: fallbackResult.rows.map(formatRecentMatchRow)
      });
    } catch (fallbackError) {
      console.error("Recent matches fallback query failed:", fallbackError);
      res.status(500).json({
        ok: false,
        error: "Could not load recent matches."
      });
    }
  }
});

app.get("/api/matches/me/recent", async (req, res) => {
  const playerId = req.session.player?.id;

  if (!playerId) {
    res.json({
      ok: true,
      loggedIn: false,
      matches: []
    });
    return;
  }

  try {
    const result = await query(
      `
        SELECT
          m.id AS match_id,
          m.grid_name,
          m.ended_at,
          COALESCE(winner.display_name, winner_row.display_name) AS winner_name,
          COUNT(mp_all.match_id)::int AS player_count,
          my_row.final_score AS my_score,
          my_row.placement AS my_placement,
          my_row.result AS my_result
        FROM match_players my_row
        JOIN matches m ON m.id = my_row.match_id
        LEFT JOIN players winner ON winner.id = m.winner_player_id
        LEFT JOIN match_players winner_row
          ON winner_row.match_id = m.id
          AND winner_row.placement = 1
        LEFT JOIN match_players mp_all ON mp_all.match_id = m.id
        WHERE my_row.player_id = $1
        GROUP BY
          m.id,
          m.grid_name,
          m.ended_at,
          winner.display_name,
          winner_row.display_name,
          my_row.final_score,
          my_row.placement,
          my_row.result
        ORDER BY m.ended_at DESC
        LIMIT 10
      `,
      [playerId]
    );

    res.json({
      ok: true,
      loggedIn: true,
      matches: result.rows.map(formatPlayerRecentMatchRow)
    });
  } catch (error) {
    console.error("Player recent matches query failed:", error);
    res.status(500).json({
      ok: false,
      error: "Could not load your recent matches."
    });
  }
});

app.get("/api/matches/:matchId", async (req, res) => {
  const playerId = req.session.player?.id;

  if (!playerId) {
    res.status(401).json({
      ok: false,
      error: "Sign in to view match details."
    });
    return;
  }

  const matchId = sanitizePlainText(req.params.matchId, 80);

  if (!matchId) {
    res.status(400).json({
      ok: false,
      error: "Invalid match."
    });
    return;
  }

  try {
    const participation = await query(
      `
        SELECT 1
        FROM match_players
        WHERE match_id = $1
          AND player_id = $2
        LIMIT 1
      `,
      [matchId, playerId]
    );

    if (!participation.rows[0]) {
      res.status(403).json({
        ok: false,
        error: "You cannot view this match."
      });
      return;
    }

    const [matchResult, playersResult, faceAFaceResult, faceAFacePlayersResult] =
      await Promise.all([
        query(
          `
            SELECT
              m.id,
              m.grid_name,
              m.ended_at,
              COALESCE(winner.display_name, winner_row.display_name) AS winner_name
            FROM matches m
            LEFT JOIN players winner ON winner.id = m.winner_player_id
            LEFT JOIN match_players winner_row
              ON winner_row.match_id = m.id
              AND winner_row.placement = 1
            WHERE m.id = $1
            LIMIT 1
          `,
          [matchId]
        ),
        query(
          `
            SELECT
              display_name,
              avatar_url,
              final_score,
              placement,
              result
            FROM match_players
            WHERE match_id = $1
            ORDER BY placement ASC, final_score DESC
          `,
          [matchId]
        ),
        query(
          `
            SELECT category, prompt, guess_answer
            FROM match_face_a_face
            WHERE match_id = $1
            LIMIT 1
          `,
          [matchId]
        ),
        query(
          `
            SELECT
              display_name,
              bet,
              guess,
              result,
              score_change
            FROM match_face_a_face_players
            WHERE match_id = $1
            ORDER BY display_name ASC
          `,
          [matchId]
        )
      ]);

    const match = matchResult.rows[0];

    if (!match) {
      res.status(404).json({
        ok: false,
        error: "Match not found."
      });
      return;
    }

    res.json({
      ok: true,
      match: {
        id: match.id,
        gridName: match.grid_name || "",
        endedAt: match.ended_at || null,
        winnerName: match.winner_name || "",
        players: playersResult.rows.map(formatMatchDetailPlayerRow),
        faceAFace: faceAFaceResult.rows[0]
          ? {
              category: faceAFaceResult.rows[0].category || "",
              prompt: faceAFaceResult.rows[0].prompt || "",
              guessAnswer: faceAFaceResult.rows[0].guess_answer || ""
            }
          : null,
        faceAFacePlayers: faceAFacePlayersResult.rows.map(formatMatchDetailFaceAFacePlayerRow)
      }
    });
  } catch (error) {
    console.error("Match detail query failed:", error);
    res.status(500).json({
      ok: false,
      error: "Could not load match details."
    });
  }
});

app.get("/api/stats/me", async (req, res) => {
  const playerId = req.session.player?.id;

  if (!playerId) {
    res.json({
      ok: true,
      loggedIn: false,
      stats: null
    });
    return;
  }

  try {
    const result = await query(
      `
        SELECT *
        FROM player_stats_view
        WHERE player_id = $1
        LIMIT 1
      `,
      [playerId]
    );

    res.json({
      ok: true,
      loggedIn: true,
      stats: result.rows[0]
        ? formatPlayerStatsRow(result.rows[0], { includePlayerId: true })
        : createEmptyPlayerStats(req.session.player)
    });
  } catch (error) {
    if (error.code !== "42P01") {
      console.error("Player stats view query failed:", error);
      res.status(500).json({
        ok: false,
        error: "Could not load player stats."
      });
      return;
    }

    try {
      const fallbackResult = await query(
        `
          SELECT
            p.id AS player_id,
            p.display_name,
            p.avatar_url,
            COALESCE(ps.games_played, 0)::int AS games_played,
            COALESCE(ps.wins, 0)::int AS wins,
            COALESCE(ps.losses, 0)::int AS losses,
            COALESCE(ps.highest_score, 0)::int AS highest_score,
            COALESCE(ps.total_score, 0)::int AS total_score,
            COALESCE(ps.total_placement, 0)::int AS total_placement,
            ps.last_played_at
          FROM players p
          LEFT JOIN player_stats ps ON ps.player_id = p.id
          WHERE p.id = $1
          LIMIT 1
        `,
        [playerId]
      );

      res.json({
        ok: true,
        loggedIn: true,
        stats: fallbackResult.rows[0]
          ? formatPlayerStatsRow(fallbackResult.rows[0], { includePlayerId: true })
          : createEmptyPlayerStats(req.session.player)
      });
    } catch (fallbackError) {
      console.error("Player stats fallback query failed:", fallbackError);
      res.status(500).json({
        ok: false,
        error: "Could not load player stats."
      });
    }
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const result = await query(`
      SELECT *
      FROM player_stats_view
      WHERE games_played > 0
      ORDER BY wins DESC, highest_score DESC, games_played DESC
      LIMIT 10
    `);

    res.json({
      ok: true,
      leaderboard: result.rows.map((row) => formatPlayerStatsRow(row))
    });
  } catch (error) {
    if (error.code !== "42P01") {
      console.error("Leaderboard view query failed:", error);
      res.status(500).json({
        ok: false,
        error: "Could not load leaderboard."
      });
      return;
    }

    try {
      const fallbackResult = await query(`
        SELECT
          p.display_name,
          p.avatar_url,
          COALESCE(ps.games_played, 0)::int AS games_played,
          COALESCE(ps.wins, 0)::int AS wins,
          COALESCE(ps.losses, 0)::int AS losses,
          COALESCE(ps.highest_score, 0)::int AS highest_score,
          COALESCE(ps.total_score, 0)::int AS total_score,
          COALESCE(ps.total_placement, 0)::int AS total_placement,
          ps.last_played_at
        FROM player_stats ps
        JOIN players p ON p.id = ps.player_id
        WHERE COALESCE(ps.games_played, 0) > 0
        ORDER BY ps.wins DESC, ps.highest_score DESC, ps.games_played DESC
        LIMIT 10
      `);

      res.json({
        ok: true,
        leaderboard: fallbackResult.rows.map((row) => formatPlayerStatsRow(row))
      });
    } catch (fallbackError) {
      console.error("Leaderboard fallback query failed:", fallbackError);
      res.status(500).json({
        ok: false,
        error: "Could not load leaderboard."
      });
    }
  }
});

if (process.env.NODE_ENV !== "production") {
  app.get("/api/session-test", (req, res) => {
    req.session.views = Number(req.session.views || 0) + 1;

    res.json({
      ok: true,
      message: "Session is working.",
      views: req.session.views,
    });
  });
}

app.get(["/", "/index.html"], (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.type("html").send(renderIndexHtml());
});

app.use(express.static("public", {
  immutable: true,
  maxAge: "1y",
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html") || filePath.endsWith("service-worker.js")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  }
}));

app.get("/api/discord/config", (req, res) => {
  res.json({
    clientId: process.env.DISCORD_CLIENT_ID || ""
  });
});

app.get("/version", (req, res) => {
  res.json({
    build: BUILD_VERSION
  });
});

app.post("/api/discord/token", async (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const code = typeof req.body?.code === "string" ? req.body.code : "";

  if (!clientId || !clientSecret) {
    console.warn("Discord token exchange blocked: DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is missing.");
    res.status(400).json({ error: "Discord auth is not configured." });
    return;
  }

  if (!code) {
    console.warn("Discord token exchange blocked: authorization code is missing.");
    res.status(400).json({ error: "Discord authorization code is missing." });
    return;
  }

  try {
    const tokenResponse = await exchangeDiscordToken({
      clientId,
      clientSecret,
      code
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.warn("Discord token exchange failed:", tokenResponse.status, errorBody);
      res.status(502).json({ error: "Discord token exchange failed." });
      return;
    }

    const tokenData = await tokenResponse.json();
    res.json({
      access_token: tokenData.access_token
    });
  } catch (error) {
    console.warn(`Discord token exchange failed: ${error.message}`);
    res.status(502).json({ error: "Discord token exchange failed." });
  }
});

const GameManager = {
  games: new Map(),
  hasGame(gameId) {
    const id = sanitizeGameId(gameId);
    return Boolean(id && this.games.has(id));
  },
  createLobby() {
    const lobbyCode = generateLobbyCode();
    this.games.set(lobbyCode, createGameContext(lobbyCode, { lobbyCode }));
    console.log(`Lobby created: ${lobbyCode}`);
    return this.games.get(lobbyCode);
  },
  getGame(gameId = "development") {
    const id = gameId || "development";

    if (!this.games.has(id)) {
      this.games.set(id, createGameContext(id));
      console.log(`Game instance created: ${id}`);
    }

    return this.games.get(id);
  }
};

let activeGameContext = GameManager.getGame("development");
let gameState = activeGameContext.state;
let timerTimeout = activeGameContext.timerTimeout;
let timerBroadcastInterval = activeGameContext.timerBroadcastInterval;

function getUser(socket) {
  return {
    id: socket.id,
    name: socket.data.name || `Guest ${socket.id.slice(0, 4)}`,
    avatarUrl: socket.data.avatarUrl || "",
    discordUserId: socket.data.discordUserId || "",
    databasePlayerId: socket.data.databasePlayerId || "",
    provider: socket.data.provider || "",
    providerUserId: socket.data.providerUserId || "",
    clientToken: socket.data.clientToken || "",
    role: socket.data.role || null,
    connected: true,
    disconnectedAt: null
  };
}

function renderIndexHtml() {
  return readFileSync(join(__dirname, "public", "index.html"), "utf8")
    .replaceAll("__BUILD_VERSION__", BUILD_VERSION);
}

function exchangeDiscordToken({ clientId, clientSecret, code }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code
  });

  return fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
}

function formatRecentMatchRow(row) {
  return {
    id: row.id,
    gridName: row.grid_name || row.gridName || "",
    endedAt: row.ended_at || row.endedAt || null,
    winnerName: row.winner_name || row.winnerName || "",
    playerCount: Number(row.player_count ?? row.playerCount ?? 0)
  };
}

function formatPlayerRecentMatchRow(row) {
  return {
    id: row.match_id || row.matchId || "",
    gridName: row.grid_name || row.gridName || "",
    endedAt: row.ended_at || row.endedAt || null,
    winnerName: row.winner_name || row.winnerName || "",
    playerCount: Number(row.player_count ?? row.playerCount ?? 0),
    myScore: Number(row.my_score ?? row.myScore ?? 0),
    myPlacement: Number(row.my_placement ?? row.myPlacement ?? 0),
    myResult: row.my_result || row.myResult || ""
  };
}

function formatMatchDetailPlayerRow(row) {
  return {
    displayName: row.display_name || "",
    avatarUrl: row.avatar_url || "",
    finalScore: Number(row.final_score || 0),
    placement: Number(row.placement || 0),
    result: row.result || ""
  };
}

function formatMatchDetailFaceAFacePlayerRow(row) {
  return {
    displayName: row.display_name || "",
    bet: Number(row.bet || 0),
    guess: row.guess || "",
    result: row.result || "",
    scoreChange: Number(row.score_change || 0)
  };
}

function formatPlayerStatsRow(row, { includePlayerId = false } = {}) {
  const gamesPlayed = Number(row.games_played ?? row.gamesPlayed ?? 0);
  const wins = Number(row.wins ?? 0);
  const losses = Number(row.losses ?? 0);
  const highestScore = Number(row.highest_score ?? row.highestScore ?? 0);
  const totalScore = Number(row.total_score ?? row.totalScore ?? 0);
  const totalPlacement = Number(row.total_placement ?? row.totalPlacement ?? 0);
  const stats = {
    displayName: row.display_name || row.displayName || "",
    avatarUrl: row.avatar_url || row.avatarUrl || "",
    gamesPlayed,
    wins,
    losses,
    winRatePercentage: getPercentageValue(
      row.win_rate_percentage ?? row.winRatePercentage,
      gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0
    ),
    highestScore,
    averageScore: getAverageValue(
      row.average_score ?? row.averageScore,
      gamesPlayed > 0 ? totalScore / gamesPlayed : 0
    ),
    averagePlacement: getAverageValue(
      row.average_placement ?? row.averagePlacement,
      gamesPlayed > 0 ? totalPlacement / gamesPlayed : 0
    ),
    lastPlayedAt: row.last_played_at || row.lastPlayedAt || null
  };

  if (includePlayerId) {
    stats.playerId = row.player_id || row.playerId || "";
  }

  return stats;
}

function createEmptyPlayerStats(player) {
  return {
    playerId: player.id,
    displayName: player.displayName || "",
    avatarUrl: player.avatarUrl || "",
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRatePercentage: 0,
    highestScore: 0,
    averageScore: 0,
    averagePlacement: 0,
    lastPlayedAt: null
  };
}

function getPercentageValue(value, fallback) {
  return roundStatValue(value === undefined || value === null ? fallback : Number(value));
}

function getAverageValue(value, fallback) {
  return roundStatValue(value === undefined || value === null ? fallback : Number(value));
}

function roundStatValue(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function sanitizeAccountDisplayName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

function createGameContext(id, options = {}) {
  return {
    id,
    lobbyCode: options.lobbyCode || "",
    state: createInitialGameState(),
    timerTimeout: null,
    timerBroadcastInterval: null
  };
}

function createInitialGameState() {
  return {
    host: null,
    players: [],
    spectators: [],
    phase: "waiting",
    gameStartedAt: null,
    matchSavedId: "",
    matchSavedAt: null,
    matchSavePending: false,
    availableGrids,
    selectedGridFilename: selectedGrid.filename,
    grid: structuredCloneGrid(initialGrid),
    currentRound: "round1",
    currentTurnPlayerId: null,
    currentPrompt: null,
    guessRevealed: false,
    buzzingOpen: false,
    buzzedPlayer: null,
    buzzes: [],
    lockedOutPlayers: [],
    riskTileState: createEmptyRiskTileState(),
    faceAFaceState: createEmptyFaceAFaceState(),
    timer: createEmptyTimer(),
    resultMessage: ""
  };
}

function structuredCloneGrid(grid) {
  return JSON.parse(JSON.stringify(grid));
}

function setActiveGameContext(gameContext) {
  activeGameContext = gameContext;
  gameState = gameContext.state;
  timerTimeout = gameContext.timerTimeout;
  timerBroadcastInterval = gameContext.timerBroadcastInterval;
}

function saveActiveTimerHandles() {
  activeGameContext.timerTimeout = timerTimeout;
  activeGameContext.timerBroadcastInterval = timerBroadcastInterval;
}

function getSocketGame(socket) {
  return GameManager.getGame(socket.data.gameId || "development");
}

function runInSocketGame(socket, callback) {
  const previousGameContext = activeGameContext;
  setActiveGameContext(getSocketGame(socket));

  try {
    return callback();
  } finally {
    saveActiveTimerHandles();

    if (previousGameContext && previousGameContext !== activeGameContext) {
      setActiveGameContext(previousGameContext);
    }
  }
}

function runInGameContext(gameContext, callback) {
  const previousGameContext = activeGameContext;
  setActiveGameContext(gameContext);

  try {
    return callback();
  } finally {
    saveActiveTimerHandles();

    if (previousGameContext && previousGameContext !== activeGameContext) {
      setActiveGameContext(previousGameContext);
    }
  }
}

function onGameEvent(socket, eventName, handler) {
  socket.on(eventName, (...args) => {
    runInSocketGame(socket, () => {
      Promise.resolve(handler(...args)).catch((error) => {
        console.error(`Error handling ${eventName}:`, error);
        socket.emit("actionRejected", "Something went wrong. Try again.");
      });
    });
  });
}

function onGameEvents(socket, eventNames, handler) {
  eventNames.forEach((eventName) => onGameEvent(socket, eventName, handler));
}

function setSocketGame(socket, gameId) {
  const nextGameId = sanitizeGameId(gameId) || "development";
  const previousGameId = socket.data.gameId || "development";

  if (previousGameId === nextGameId) {
    setActiveGameContext(GameManager.getGame(nextGameId));
    return;
  }

  runInSocketGame(socket, () => {
    removeUserFromAllRoles(socket.id);
    sendGameState();
  });
  socket.leave(previousGameId);
  socket.data.gameId = nextGameId;
  socket.join(nextGameId);
  setActiveGameContext(GameManager.getGame(nextGameId));
}

function leaveCurrentGame(socket) {
  const previousGameContext = activeGameContext;

  removeUserFromAllRoles(socket.id);

  if (gameState.host === null) {
    gameState.phase = "waiting";
    resetCurrentPromptState();
  }

  socket.data.role = null;

  if (socket.data.isDiscordActivity) {
    socket.emit("leftGame");
    sendGameState();
    return;
  }

  socket.data.lobbyCode = "";
  socket.leave(previousGameContext.id);
  sendGameState();
  saveActiveTimerHandles();
  socket.data.gameId = "development";
  socket.join(socket.data.gameId);
  setActiveGameContext(GameManager.getGame(socket.data.gameId));
  socket.emit("leftGame");
  sendGameState();
}

function sendGameState() {
  const sockets = io.sockets.adapter.rooms.get(activeGameContext.id) || new Set();

  sockets.forEach((socketId) => {
    const socket = io.sockets.sockets.get(socketId);

    if (socket) {
      socket.emit("gameState", createVisibleGameState(socket));
    }
  });
}

function createVisibleGameState(socket) {
  return {
    lobbyCode: activeGameContext.lobbyCode || "",
    host: gameState.host,
    players: gameState.players,
    spectators: gameState.spectators,
    hostAvailable: gameState.host === null,
    phase: gameState.phase,
    gameStartedAt: gameState.gameStartedAt,
    matchSavedId: gameState.matchSavedId,
    matchSavedAt: gameState.matchSavedAt,
    availableGrids: gameState.availableGrids,
    selectedGridFilename: gameState.selectedGridFilename,
    grid: getVisibleGrid(socket),
    currentRound: gameState.currentRound,
    currentTurnPlayerId: gameState.currentTurnPlayerId,
    currentPrompt: getVisibleCurrentPrompt(socket),
    guessRevealed: gameState.guessRevealed,
    buzzingOpen: gameState.buzzingOpen,
    buzzedPlayer: gameState.buzzedPlayer,
    buzzes: gameState.buzzes,
    lockedOutPlayers: gameState.lockedOutPlayers,
    riskTileState: gameState.riskTileState,
    faceAFaceState: getVisibleFaceAFaceState(),
    timer: getVisibleTimer(),
    resultMessage: gameState.resultMessage
  };
}

function broadcastAllGameStates() {
  GameManager.games.forEach((gameContext) => {
    runInGameContext(gameContext, sendGameState);
  });
}

function generateLobbyCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";

    for (let index = 0; index < LOBBY_CODE_LENGTH; index += 1) {
      const randomIndex = Math.floor(Math.random() * LOBBY_CODE_ALPHABET.length);
      code += LOBBY_CODE_ALPHABET[randomIndex];
    }

    if (!GameManager.games.has(code)) {
      return code;
    }
  }

  return `L${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.data.gameId = "development";
  socket.data.name = `Guest ${socket.id.slice(0, 4)}`;
  socket.data.avatarUrl = "";
  socket.data.discordUserId = "";
  socket.data.databasePlayerId = "";
  socket.data.provider = "";
  socket.data.providerUserId = "";
  socket.data.clientToken = "";
  socket.data.role = null;
  socket.data.isDiscordActivity = false;
  socket.data.lobbyCode = "";
  socket.join(socket.data.gameId);
  setActiveGameContext(getSocketGame(socket));

  socket.emit("connected", getUser(socket));
  sendGameState();

  socket.on("setGameInstance", ({ instanceId } = {}) => {
    const gameId = sanitizeGameId(instanceId) || "development";
    socket.data.isDiscordActivity = true;
    socket.data.lobbyCode = "";
    setSocketGame(socket, gameId);
    socket.emit("gameInstanceConfirmed", {
      gameId
    });
    sendGameState();
  });

  socket.on("createLobby", ({ clientToken } = {}) => {
    if (socket.data.isDiscordActivity) {
      socket.emit("lobbyError", "Lobby codes are not used inside Discord Activities.");
      return;
    }

    if (clientToken) {
      socket.data.clientToken = sanitizeClientToken(clientToken);
    }

    const lobby = GameManager.createLobby();
    setSocketGame(socket, lobby.id);
    socket.data.lobbyCode = lobby.lobbyCode;
    socket.data.role = null;
    addSocketToRole(socket, "host");
    socket.emit("lobbyJoined", {
      lobbyCode: lobby.lobbyCode
    });
    socket.emit("roleConfirmed", getUser(socket));
    sendGameState();
  });

  socket.on("joinLobby", ({ lobbyCode, clientToken } = {}) => {
    if (socket.data.isDiscordActivity) {
      socket.emit("lobbyError", "Lobby codes are not used inside Discord Activities.");
      return;
    }

    const code = sanitizeLobbyCode(lobbyCode);

    if (!GameManager.hasGame(code)) {
      socket.emit("lobbyError", "Lobby code not found.");
      return;
    }

    if (clientToken) {
      socket.data.clientToken = sanitizeClientToken(clientToken);
    }

    setSocketGame(socket, code);
    socket.data.lobbyCode = code;
    socket.data.role = null;
    const restoredRole = restoreUserSession(socket, {
      name: socket.data.name,
      avatarUrl: socket.data.avatarUrl,
      discordUserId: "",
      databasePlayerId: socket.data.databasePlayerId,
      provider: socket.data.provider,
      providerUserId: socket.data.providerUserId,
      clientToken: socket.data.clientToken
    });

    if (restoredRole) {
      socket.data.role = restoredRole;
    }

    socket.emit("lobbyJoined", {
      lobbyCode: code
    });

    if (restoredRole) {
      socket.emit("roleConfirmed", getUser(socket));
    }

    sendGameState();
  });

  // TODO: For saved match stats, prefer database identity from the verified Express session/Discord auth instead of trusting client-supplied fields.
  onGameEvent(socket, "setUserIdentity", ({ name, avatarUrl, discordUserId, databasePlayerId, provider, providerUserId, clientToken } = {}) => {
    const identity = sanitizeIdentity({
      name,
      avatarUrl,
      discordUserId,
      databasePlayerId,
      provider,
      providerUserId,
      clientToken
    });
    const restoredRole = restoreUserSession(socket, identity);

    if (identity.name) {
      socket.data.name = identity.name;
    }

    socket.data.avatarUrl = identity.avatarUrl;
    socket.data.discordUserId = identity.discordUserId;
    socket.data.databasePlayerId = identity.databasePlayerId || socket.data.databasePlayerId || "";
    socket.data.provider = identity.provider || socket.data.provider || "";
    socket.data.providerUserId = identity.providerUserId || socket.data.providerUserId || "";
    socket.data.clientToken = identity.clientToken;
    socket.data.role = restoredRole || socket.data.role;
    updateUserIdentity(socket.id, identity);
    socket.emit("identityUpdated", getUser(socket));
    sendGameState();
  });

  onGameEvent(socket, "chooseRole", (payload) => {
    const role = typeof payload === "string" ? payload : payload?.role;
    const clientToken = typeof payload === "object"
      ? sanitizeClientToken(payload?.clientToken)
      : "";

    if (!["host", "player", "spectator"].includes(role)) {
      socket.emit("roleRejected", "Invalid role.");
      return;
    }

    if (!socket.data.isDiscordActivity && !socket.data.lobbyCode) {
      socket.emit("roleRejected", "Create or join a lobby first.");
      return;
    }

    if (!socket.data.discordUserId && clientToken) {
      socket.data.clientToken = clientToken;
    }

    const restoredRole = restoreUserSession(socket, {
      name: socket.data.name,
      avatarUrl: socket.data.avatarUrl,
      discordUserId: socket.data.discordUserId,
      databasePlayerId: socket.data.databasePlayerId,
      provider: socket.data.provider,
      providerUserId: socket.data.providerUserId,
      clientToken: socket.data.clientToken
    });

    if (restoredRole) {
      socket.data.role = restoredRole;
    }

    if (socket.data.role === role) {
      socket.emit("roleConfirmed", getUser(socket));
      sendGameState();
      return;
    }

    if (role === "host" && gameState.host !== null) {
      socket.emit("roleRejected", "Host has already been chosen.");
      return;
    }

    addSocketToRole(socket, role);

    socket.emit("roleConfirmed", getUser(socket));
    sendGameState();
  });

  onGameEvent(socket, "leaveGame", () => {
    leaveCurrentGame(socket);
  });

  onGameEvent(socket, "removeUser", ({ userId } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can remove users.");
      return;
    }

    const targetUserId = sanitizePlainText(userId, 80);

    if (!targetUserId) {
      socket.emit("actionRejected", "Choose a user to remove.");
      return;
    }

    if (targetUserId === gameState.host?.id) {
      socket.emit("actionRejected", "The host cannot be removed.");
      return;
    }

    const removedUser = removeUserFromAllRoles(targetUserId);

    if (!removedUser) {
      socket.emit("actionRejected", "That user is not in this game.");
      return;
    }

    const removedSocket = io.sockets.sockets.get(targetUserId);

    if (removedSocket) {
      removedSocket.data.role = null;
      removedSocket.emit("removedFromGame");
      removedSocket.emit("leftGame");
    }

    sendGameState();
  });

  onGameEvent(socket, "startGame", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start the game.");
      return;
    }

    gameState.phase = "grid";
    gameState.currentRound = "round1";
    gameState.currentTurnPlayerId = gameState.players[0]?.id || null;
    gameState.gameStartedAt = new Date().toISOString();
    gameState.matchSavedId = "";
    gameState.matchSavedAt = null;
    gameState.matchSavePending = false;
    resetCurrentPromptState();
    sendGameState();
  });

  onGameEvent(socket, "setCurrentTurn", ({ playerId } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can change the turn.");
      return;
    }

    if (!setCurrentTurnPlayer(playerId)) {
      socket.emit("actionRejected", "That player is not active.");
      return;
    }

    sendGameState();
  });

  onGameEvent(socket, "selectPrompt", ({ categoryIndex, questionIndex } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can select prompts.");
      return;
    }

    if (gameState.phase !== "grid") {
      socket.emit("actionRejected", "The grid is not active.");
      return;
    }

    const category = getCurrentRoundCategories()?.[categoryIndex];
    const prompt = category?.prompts?.[questionIndex];

    if (!category || !prompt) {
      socket.emit("actionRejected", "That prompt is not on the grid.");
      return;
    }

    if (prompt.answered) {
      socket.emit("actionRejected", "That prompt has already been guessed.");
      return;
    }

    stopTimer();
    gameState.currentPrompt = {
      categoryIndex,
      questionIndex,
      round: gameState.currentRound,
      category: category.category,
      value: prompt.value,
      prompt: prompt.prompt,
      guessAnswer: prompt.guessAnswer,
      image: isSafeRelativeMediaPath(prompt.image) ? prompt.image : "",
      type: prompt.type || "",
      riskTile: prompt.type === "risk"
    };
    gameState.guessRevealed = false;
    gameState.buzzingOpen = false;
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.lockedOutPlayers = [];
    gameState.riskTileState = createEmptyRiskTileState();

    if (prompt.type === "risk") {
      gameState.resultMessage = "";
      gameState.phase = "riskTilePlayerSelect";
    } else {
      gameState.resultMessage = "Read the prompt...";
      gameState.phase = "question";
      startTimer("reading", READING_TIMER_MS);
    }

    sendGameState();
  });

  // TODO: Drop startDoubleJeopardy after legacy client compatibility is no longer needed.
  onGameEvents(socket, ["startPowerRound", "startDoubleJeopardy"], () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start Power Round.");
      return;
    }

    if (gameState.phase !== "grid") {
      socket.emit("actionRejected", "Power Round can only start from the grid.");
      return;
    }

    if (gameState.currentRound !== "round1") {
      socket.emit("actionRejected", "Power Round has already started.");
      return;
    }

    if (!hasRoundGrid("round2")) {
      socket.emit("actionRejected", "This grid does not include Power Round.");
      return;
    }

    gameState.currentRound = "round2";
    gameState.phase = "grid";
    resetCurrentPromptState();
    sendGameState();
  });

  // TODO: Drop startFinalJeopardy after legacy client compatibility is no longer needed.
  onGameEvents(socket, ["startFaceAFace", "startFinalJeopardy"], () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start Face-a-Face.");
      return;
    }

    if (gameState.phase !== "grid" || gameState.currentRound !== "round2") {
      socket.emit("actionRejected", "Face-a-Face can only start from the Power Round grid.");
      return;
    }

    if (!gameState.grid.rounds?.final) {
      socket.emit("actionRejected", "This grid does not include Face-a-Face.");
      return;
    }

    resetCurrentPromptState();
    gameState.faceAFaceState = createFaceAFaceState();
    gameState.phase = "finalBet";
    sendGameState();
  });

  onGameEvent(socket, "submitFinalBet", ({ bet } = {}) => {
    if (gameState.phase !== "finalBet") {
      socket.emit("actionRejected", "Face-a-Face betting is not active.");
      return;
    }

    const player = getEligibleFaceAFacePlayer(socket.id);

    if (!player) {
      socket.emit("actionRejected", "You are not eligible for Face-a-Face.");
      return;
    }

    const parsedBet = Number(bet);

    if (!Number.isFinite(parsedBet) || !Number.isInteger(parsedBet)) {
      socket.emit("actionRejected", "Bet must be a finite integer.");
      return;
    }

    if (parsedBet < 0 || parsedBet > player.score) {
      socket.emit("actionRejected", "Bet must be between 0 and your current score.");
      return;
    }

    gameState.faceAFaceState.bets[player.id] = parsedBet;
    sendGameState();
  });

  onGameEvent(socket, "revealFinalPrompt", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reveal the Face-a-Face prompt.");
      return;
    }

    if (gameState.phase !== "finalBet") {
      socket.emit("actionRejected", "Face-a-Face betting is not active.");
      return;
    }

    if (!allFaceAFaceBetsSubmitted()) {
      socket.emit("actionRejected", "All eligible players must submit bets first.");
      return;
    }

    gameState.phase = "finalGuesses";
    sendGameState();
  });

  onGameEvent(socket, "submitFinalGuess", ({ guess } = {}) => {
    if (gameState.phase !== "finalGuesses") {
      socket.emit("actionRejected", "Face-a-Face guesses are not active.");
      return;
    }

    const player = getEligibleFaceAFacePlayer(socket.id);

    if (!player || gameState.faceAFaceState.bets[player.id] === undefined) {
      socket.emit("actionRejected", "You must be eligible and have a bet submitted.");
      return;
    }

    const trimmedGuess = String(guess || "").trim();

    if (!trimmedGuess) {
      socket.emit("actionRejected", "Face-a-Face guess cannot be empty.");
      return;
    }

    gameState.faceAFaceState.guesses[player.id] = trimmedGuess;
    sendGameState();
  });

  onGameEvent(socket, "startFinalReview", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start Face-a-Face review.");
      return;
    }

    if (gameState.phase !== "finalGuesses") {
      socket.emit("actionRejected", "Face-a-Face guesses are not active.");
      return;
    }

    if (!allFaceAFaceGuessesSubmitted()) {
      socket.emit("actionRejected", "All eligible players must submit guesses first.");
      return;
    }

    gameState.phase = "finalReview";
    sendGameState();
  });

  onGameEvent(socket, "revealFinalGuessForPlayer", ({ playerId } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reveal Face-a-Face guesses.");
      return;
    }

    if (gameState.phase !== "finalReview") {
      socket.emit("actionRejected", "Face-a-Face review is not active.");
      return;
    }

    if (!isEligibleFaceAFacePlayerId(playerId) || !gameState.faceAFaceState.guesses[playerId]) {
      socket.emit("actionRejected", "That player does not have a Face-a-Face guess.");
      return;
    }

    if (!gameState.faceAFaceState.revealedPlayerIds.includes(playerId)) {
      gameState.faceAFaceState.revealedPlayerIds.push(playerId);
    }

    sendGameState();
  });

  onGameEvent(socket, "judgeFinalGuess", ({ playerId, result } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can judge Face-a-Face guesses.");
      return;
    }

    if (gameState.phase !== "finalReview") {
      socket.emit("actionRejected", "Face-a-Face review is not active.");
      return;
    }

    if (!["correct", "incorrect"].includes(result)) {
      socket.emit("actionRejected", "Invalid Face-a-Face judgment.");
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === playerId);
    const bet = gameState.faceAFaceState.bets[playerId];

    if (!player || bet === undefined || !gameState.faceAFaceState.revealedPlayerIds.includes(playerId)) {
      socket.emit("actionRejected", "Reveal this player's guess before judging.");
      return;
    }

    if (gameState.faceAFaceState.judged[playerId]) {
      socket.emit("actionRejected", "That Face-a-Face guess has already been judged.");
      return;
    }

    player.score += result === "correct" ? bet : -bet;
    gameState.faceAFaceState.judged[playerId] = result;
    sendGameState();
  });

  onGameEvent(socket, "showFinalResults", async () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can show Face-a-Face results.");
      return;
    }

    if (gameState.phase !== "finalReview") {
      socket.emit("actionRejected", "Face-a-Face review is not active.");
      return;
    }

    if (!allFaceAFaceGuessesJudged()) {
      socket.emit("actionRejected", "All Face-a-Face guesses must be judged first.");
      return;
    }

    const completionGameContext = activeGameContext;
    const completionGameState = gameState;

    if (!completionGameState.matchSavedId) {
      if (completionGameState.matchSavePending) {
        socket.emit("actionRejected", "Match history is already being saved.");
        return;
      }

      completionGameState.matchSavePending = true;

      try {
        const matchId = await saveCompletedMatch({
          gameState: completionGameState,
          gameContext: completionGameContext
        });

        runInGameContext(completionGameContext, () => {
          completionGameState.matchSavedId = matchId;
          completionGameState.matchSavedAt = new Date().toISOString();
          completionGameState.matchSavePending = false;
        });
      } catch (error) {
        runInGameContext(completionGameContext, () => {
          completionGameState.matchSavePending = false;
        });
        console.error("Failed to save completed match:", {
          message: error.message,
          code: error.code,
          detail: error.detail,
          constraint: error.constraint,
          stack: error.stack
        });
        socket.emit("actionRejected", "Could not save match history. Try again.");
        return;
      }
    }

    runInGameContext(completionGameContext, () => {
      completionGameState.phase = "finalResults";
      sendGameState();
    });
  });

  onGameEvent(socket, "buzz", () => {
    if (socket.data.role !== "player") {
      socket.emit("actionRejected", "Only players can buzz.");
      return;
    }

    if (gameState.phase !== "question") {
      socket.emit("actionRejected", "Buzzing is only available during a question.");
      return;
    }

    if (gameState.guessRevealed) {
      socket.emit("actionRejected", "Buzzing is closed after the guess is revealed.");
      return;
    }

    if (!gameState.buzzingOpen) {
      socket.emit("actionRejected", "Buzzing is not open yet.");
      return;
    }

    if (gameState.lockedOutPlayers.some((player) => player.id === socket.id)) {
      socket.emit("actionRejected", "You are locked out for this prompt.");
      return;
    }

    if (gameState.buzzes.some((buzz) => buzz.id === socket.id)) {
      socket.emit("actionRejected", "You have already buzzed in this round.");
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === socket.id);

    if (!player) {
      socket.emit("actionRejected", "Only active players can buzz.");
      return;
    }

    const timestamp = Date.now();
    const firstBuzzTimestamp = gameState.buzzes[0]?.timestamp ?? timestamp;
    const buzz = {
      id: player.id,
      name: player.name,
      avatarUrl: player.avatarUrl || "",
      discordUserId: player.discordUserId || "",
      databasePlayerId: player.databasePlayerId || "",
      provider: player.provider || "",
      providerUserId: player.providerUserId || "",
      timestamp,
      delayMs: timestamp - firstBuzzTimestamp
    };

    gameState.buzzes.push(buzz);

    if (!gameState.buzzedPlayer) {
      gameState.buzzedPlayer = player;
      startTimer("guess", ANSWER_TIMER_MS);
    }

    sendGameState();
  });

  onGameEvent(socket, "markCorrect", () => {
    if (gameState.phase === "riskTileQuestion") {
      const validationError = validateDailyDoubleJudgment(socket);

      if (validationError) {
        socket.emit("actionRejected", validationError);
        return;
      }

      judgeRiskTile(true);
      sendGameState();
      return;
    }

    const validationError = validateHostJudgment(socket);

    if (validationError) {
      socket.emit("actionRejected", validationError);
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.buzzedPlayer.id);

    if (!player) {
      socket.emit("actionRejected", "The buzzed player is no longer active.");
      return;
    }

    player.score += gameState.currentPrompt.value;
    gameState.currentTurnPlayerId = player.id;
    gameState.guessRevealed = true;
    gameState.buzzingOpen = false;
    gameState.resultMessage = `${player.name} is correct! +${gameState.currentPrompt.value}`;
    stopTimer();
    markCurrentPromptGuessed();
    sendGameState();
  });

  onGameEvent(socket, "markIncorrect", () => {
    if (gameState.phase === "riskTileQuestion") {
      const validationError = validateDailyDoubleJudgment(socket);

      if (validationError) {
        socket.emit("actionRejected", validationError);
        return;
      }

      judgeRiskTile(false);
      sendGameState();
      return;
    }

    const validationError = validateHostJudgment(socket);

    if (validationError) {
      socket.emit("actionRejected", validationError);
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.buzzedPlayer.id);

    if (!player) {
      socket.emit("actionRejected", "The buzzed player is no longer active.");
      return;
    }

    player.score -= gameState.currentPrompt.value;
    gameState.lockedOutPlayers.push({
      id: player.id,
      name: player.name,
      avatarUrl: player.avatarUrl || "",
      discordUserId: player.discordUserId || "",
      databasePlayerId: player.databasePlayerId || "",
      provider: player.provider || "",
      providerUserId: player.providerUserId || ""
    });
    gameState.resultMessage = `${player.name} is incorrect. Buzzer reopened. -${gameState.currentPrompt.value}`;
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.guessRevealed = false;
    gameState.phase = "question";
    gameState.buzzingOpen = true;
    stopTimer();
    sendGameState();
  });

  // TODO: Rename this legacy Risk Tile event alias after older clients have aged out.
  onGameEvent(socket, "selectDailyDoublePlayer", ({ playerId } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can choose the Risk Tile player.");
      return;
    }

    if (gameState.phase !== "riskTilePlayerSelect") {
      socket.emit("actionRejected", "Risk Tile player selection is not active.");
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === playerId);

    if (!player) {
      socket.emit("actionRejected", "That player is not active.");
      return;
    }

    gameState.riskTileState = {
      playerId: player.id,
      playerName: player.name,
      bet: null,
      maxBet: Math.max(player.score, 1000),
      submitted: false,
      judged: false
    };
    gameState.phase = "riskTileBet";
    gameState.resultMessage = "";
    sendGameState();
  });

  // TODO: Rename this legacy Risk Tile event alias after older clients have aged out.
  onGameEvent(socket, "submitDailyDoubleBet", ({ bet } = {}) => {
    if (gameState.phase !== "riskTileBet") {
      socket.emit("actionRejected", "Risk Tile betting is not active.");
      return;
    }

    if (gameState.riskTileState.playerId !== socket.id) {
      socket.emit("actionRejected", "Only the selected Risk Tile player can bet.");
      return;
    }

    const parsedBet = Number(bet);

    if (!Number.isFinite(parsedBet) || !Number.isInteger(parsedBet)) {
      socket.emit("actionRejected", "Bet must be a finite integer.");
      return;
    }

    if (parsedBet < 0) {
      socket.emit("actionRejected", "Bet cannot be negative.");
      return;
    }

    if (parsedBet > gameState.riskTileState.maxBet) {
      socket.emit("actionRejected", "Bet cannot exceed the maximum.");
      return;
    }

    gameState.riskTileState.bet = parsedBet;
    gameState.riskTileState.submitted = true;
    gameState.phase = "riskTileQuestion";
    gameState.resultMessage = "";
    sendGameState();
  });

  onGameEvent(socket, "selectGrid", ({ filename } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can select a grid.");
      return;
    }

    if (gameState.phase !== "waiting" && gameState.phase !== "grid") {
      socket.emit("actionRejected", "Grids can only be changed before a prompt is active.");
      return;
    }

    const gridOption = getGridOption(filename);

    if (!gridOption) {
      socket.emit("actionRejected", "That grid is not available.");
      return;
    }

    const grid = loadGridByFilename(gridOption.filename);

    if (!grid) {
      socket.emit("actionRejected", "That grid could not be loaded.");
      return;
    }

    gameState.grid = grid;
    gameState.selectedGridFilename = gridOption.filename;
    gameState.currentRound = "round1";
    resetCurrentPromptState();

    if (gameState.phase === "grid") {
      gameState.phase = "grid";
    }

    sendGameState();
  });

  onGameEvent(socket, "resetGrid", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reset the grid.");
      return;
    }

    resetGridState();
    sendGameState();
  });

  onGameEvent(socket, "returnToLobby", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can return to the lobby.");
      return;
    }

    stopTimer();
    gameState.phase = "waiting";
    resetCurrentPromptState();
    gameState.gameStartedAt = null;
    gameState.matchSavedId = "";
    gameState.matchSavedAt = null;
    gameState.matchSavePending = false;
    sendGameState();
  });

  onGameEvent(socket, "playAgain", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start another game.");
      return;
    }

    resetFullGameToGrid();
    sendGameState();
  });

  onGameEvent(socket, "importGrid", ({ filename, contents } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("gridImportResult", {
        ok: false,
        error: "Only the host can import grids."
      });
      return;
    }

    const result = importGridFile({ filename, contents });

    socket.emit("gridImportResult", result);

    if (!result.ok) {
      return;
    }

    refreshGridsForAllGames();
    broadcastAllGameStates();
  });

  onGameEvent(socket, "editPlayerScore", ({ playerId, newScore } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can edit scores.");
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === playerId);

    if (!player) {
      socket.emit("actionRejected", "That player is not active.");
      return;
    }

    const parsedScore = Number(newScore);

    if (!Number.isFinite(parsedScore)) {
      socket.emit("actionRejected", "Score must be a finite number.");
      return;
    }

    player.score = Math.round(parsedScore);
    sendGameState();
  });

  onGameEvent(socket, "revealGuess", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reveal the guess.");
      return;
    }

    if (!gameState.currentPrompt) {
      socket.emit("actionRejected", "No prompt is currently selected.");
      return;
    }

    if (gameState.phase !== "question" && gameState.phase !== "riskTileQuestion") {
      socket.emit("actionRejected", "There is no active question.");
      return;
    }

    gameState.guessRevealed = true;
    gameState.buzzingOpen = false;
    stopTimer();
    sendGameState();
  });

  onGameEvent(socket, "pauseTimer", () => {
    if (!canHostControlTimer(socket)) {
      socket.emit("actionRejected", "Only the host can control an active timer.");
      return;
    }

    pauseTimer();
    sendGameState();
  });

  onGameEvent(socket, "resumeTimer", () => {
    if (!canHostControlTimer(socket)) {
      socket.emit("actionRejected", "Only the host can control an active timer.");
      return;
    }

    resumeTimer();
    sendGameState();
  });

  onGameEvent(socket, "addTimerTime", (amountMs = 5000) => {
    if (!canHostControlTimer(socket)) {
      socket.emit("actionRejected", "Only the host can control an active timer.");
      return;
    }

    const parsedAmountMs = Number(amountMs);

    if (!Number.isFinite(parsedAmountMs) || parsedAmountMs <= 0) {
      socket.emit("actionRejected", "Timer time must be a positive number.");
      return;
    }

    addTimerTime(Math.min(parsedAmountMs, 60000));
    sendGameState();
  });

  onGameEvent(socket, "returnToGrid", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can return to the grid.");
      return;
    }

    if (gameState.currentPrompt) {
      markCurrentPromptGuessed();
    }

    gameState.phase = "grid";
    resetCurrentPromptState();
    sendGameState();
  });

  onGameEvent(socket, "disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);

    if (socket.data.discordUserId || socket.data.databasePlayerId || socket.data.clientToken) {
      markUserDisconnected(socket.id);
      sendGameState();
      return;
    }

    removeUserFromAllRoles(socket.id);

    if (gameState.host === null) {
      gameState.phase = "waiting";
      resetCurrentPromptState();
    }

    sendGameState();
  });
});

function addSocketToRole(socket, role) {
  removeUserFromAllRoles(socket.id);

  socket.data.role = role;

  const user = getUser(socket);

  if (role === "host") {
    gameState.host = user;
  }

  if (role === "player") {
    gameState.players.push({
      ...user,
      score: 0
    });
    ensureCurrentTurnPlayer();
  }

  if (role === "spectator") {
    gameState.spectators.push(user);
  }
}

function removeUserFromAllRoles(socketId) {
  let removedUser = null;

  if (gameState.host?.id === socketId) {
    removedUser = gameState.host;
    gameState.host = null;
  }

  const removedPlayerIndex = gameState.players.findIndex((player) => player.id === socketId);
  const removedPlayer = gameState.players[removedPlayerIndex] || null;
  const removedSpectator = gameState.spectators.find((spectator) => spectator.id === socketId) || null;
  removedUser = removedUser || removedPlayer || removedSpectator;

  gameState.players = gameState.players.filter((player) => player.id !== socketId);
  gameState.spectators = gameState.spectators.filter((spectator) => spectator.id !== socketId);

  if (gameState.currentTurnPlayerId === socketId) {
    const nextPlayer = gameState.players[removedPlayerIndex] || gameState.players[0];
    gameState.currentTurnPlayerId = nextPlayer?.id || null;
  }

  cleanupRemovedUserReferences(socketId);
  ensureCurrentTurnPlayer();

  return removedUser;
}

function cleanupRemovedUserReferences(socketId) {
  if (gameState.buzzedPlayer?.id === socketId) {
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.buzzingOpen = gameState.phase === "question" && !gameState.guessRevealed;
  }

  gameState.buzzes = gameState.buzzes.filter((buzz) => buzz.id !== socketId);
  gameState.lockedOutPlayers = gameState.lockedOutPlayers.filter((player) => player.id !== socketId);

  if (gameState.riskTileState.playerId === socketId) {
    gameState.riskTileState = createEmptyRiskTileState();

    if (gameState.phase === "riskTileBet" || gameState.phase === "riskTileQuestion") {
      gameState.phase = "riskTilePlayerSelect";
      gameState.guessRevealed = false;
      gameState.buzzingOpen = false;
      gameState.resultMessage = "Risk Tile player was removed. Choose another player.";
    }
  }

  removeFaceAFacePlayerId(socketId);
}

function markUserDisconnected(socketId) {
  return updateUserConnection(socketId, false);
}

function markUserConnected(socketId) {
  return updateUserConnection(socketId, true);
}

function updateUserConnection(socketId, connected) {
  const disconnectedAt = connected ? null : new Date().toISOString();
  let updated = false;

  const applyConnection = (user) => {
    if (!user || user.id !== socketId) {
      return user;
    }

    updated = true;
    return {
      ...user,
      connected,
      disconnectedAt
    };
  };

  gameState.host = applyConnection(gameState.host);
  gameState.players = gameState.players.map(applyConnection);
  gameState.spectators = gameState.spectators.map(applyConnection);
  gameState.buzzedPlayer = applyConnection(gameState.buzzedPlayer);
  gameState.buzzes = gameState.buzzes.map(applyConnection);
  gameState.lockedOutPlayers = gameState.lockedOutPlayers.map(applyConnection);

  return updated;
}

// Turn order is tracked by player id; the players array remains the source of truth.
function ensureCurrentTurnPlayer() {
  if (gameState.players.some((player) => player.id === gameState.currentTurnPlayerId)) {
    return;
  }

  gameState.currentTurnPlayerId = gameState.players[0]?.id || null;
}

function setCurrentTurnPlayer(playerId) {
  const player = gameState.players.find((currentPlayer) => currentPlayer.id === playerId);

  if (!player) {
    return false;
  }

  gameState.currentTurnPlayerId = player.id;
  return true;
}

function getVisibleGrid(socket) {
  if (socket?.id === gameState.host?.id) {
    return gameState.grid;
  }

  const grid = structuredCloneGrid(gameState.grid);
  removeGridGuessAnswers(grid.rounds?.round1);
  removeGridGuessAnswers(grid.rounds?.round2);

  if (grid.rounds?.final) {
    delete grid.rounds.final.guessAnswer;
  }

  return grid;
}

function removeGridGuessAnswers(round) {
  round?.categories?.forEach((category) => {
    category.prompts?.forEach((prompt) => {
      delete prompt.guessAnswer;
    });
  });
}

function sanitizeIdentity({ name, avatarUrl, discordUserId, databasePlayerId, provider, providerUserId, clientToken }) {
  return {
    name: sanitizeDisplayName(name),
    avatarUrl: sanitizeAvatarUrl(avatarUrl),
    discordUserId: sanitizePlainText(discordUserId, 40),
    databasePlayerId: sanitizePlainText(databasePlayerId, 80),
    provider: sanitizeIdentityProvider(provider),
    providerUserId: sanitizePlainText(providerUserId, 120),
    clientToken: sanitizeClientToken(clientToken)
  };
}

function sanitizeClientToken(value) {
  return sanitizePlainText(value, 80);
}

function sanitizeIdentityProvider(value) {
  const provider = sanitizePlainText(value, 20);
  return ["google", "discord", "browser"].includes(provider) ? provider : "";
}

function sanitizeDisplayName(value) {
  const name = sanitizePlainText(value, 40);
  return name || "";
}

function sanitizeAvatarUrl(value) {
  const url = sanitizePlainText(value, 300);

  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);
    return ["https:", "http:"].includes(parsedUrl.protocol) ? parsedUrl.href : "";
  } catch {
    return "";
  }
}

function sanitizePlainText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);
}

function sanitizeGameId(value) {
  const gameId = sanitizePlainText(value, 120);
  return /^[A-Za-z0-9_-]+$/.test(gameId) ? gameId : "";
}

function sanitizeLobbyCode(value) {
  const lobbyCode = sanitizePlainText(value, 6).toUpperCase();
  return /^[A-Z0-9]{4,6}$/.test(lobbyCode) ? lobbyCode : "";
}

function updateUserIdentity(socketId, identity) {
  const applyIdentity = (user) => {
    if (!user || user.id !== socketId) {
      return user;
    }

    return {
      ...user,
      name: identity.name || user.name,
      avatarUrl: identity.avatarUrl,
      discordUserId: identity.discordUserId,
      databasePlayerId: identity.databasePlayerId || user.databasePlayerId || "",
      provider: identity.provider || user.provider || "",
      providerUserId: identity.providerUserId || user.providerUserId || "",
      clientToken: identity.clientToken
    };
  };

  gameState.host = applyIdentity(gameState.host);
  gameState.players = gameState.players.map(applyIdentity);
  gameState.spectators = gameState.spectators.map(applyIdentity);

  if (gameState.buzzedPlayer?.id === socketId) {
    gameState.buzzedPlayer = applyIdentity(gameState.buzzedPlayer);
  }

  gameState.buzzes = gameState.buzzes.map((buzz) => applyIdentity(buzz));
  gameState.lockedOutPlayers = gameState.lockedOutPlayers.map((player) => applyIdentity(player));

  if (gameState.riskTileState.playerId === socketId && identity.name) {
    gameState.riskTileState.playerName = identity.name;
  }
}

function restoreUserSession(socket, identity) {
  const existingSession = findRestorableSession(identity);

  if (!existingSession || existingSession.user.id === socket.id) {
    return existingSession?.role || null;
  }

  const previousSocketId = existingSession.user.id;
  removeUserFromAllRoles(socket.id);
  replaceUserSocketId(previousSocketId, socket.id, identity);
  socket.data.name = identity.name || existingSession.user.name || socket.data.name;
  socket.data.avatarUrl = identity.avatarUrl || existingSession.user.avatarUrl || "";
  socket.data.discordUserId = identity.discordUserId || existingSession.user.discordUserId || "";
  socket.data.databasePlayerId = identity.databasePlayerId || existingSession.user.databasePlayerId || "";
  socket.data.provider = identity.provider || existingSession.user.provider || "";
  socket.data.providerUserId = identity.providerUserId || existingSession.user.providerUserId || "";
  socket.data.clientToken = identity.clientToken || existingSession.user.clientToken || "";
  return existingSession.role;
}

function findRestorableSession(identity) {
  if (identity.discordUserId) {
    const discordSession = findSessionByDiscordUserId(identity.discordUserId);

    if (discordSession) {
      return discordSession;
    }
  }

  if (identity.databasePlayerId) {
    const databaseSession = findSessionByDatabasePlayerId(identity.databasePlayerId);

    if (databaseSession) {
      return databaseSession;
    }
  }

  if (identity.clientToken) {
    return findSessionByClientToken(identity.clientToken);
  }

  return null;
}

function findSessionByDatabasePlayerId(databasePlayerId) {
  if (!databasePlayerId) {
    return null;
  }

  if (gameState.host?.databasePlayerId === databasePlayerId) {
    return {
      role: "host",
      user: gameState.host
    };
  }

  const player = gameState.players.find((currentPlayer) => currentPlayer.databasePlayerId === databasePlayerId);

  if (player) {
    return {
      role: "player",
      user: player
    };
  }

  const spectator = gameState.spectators.find((currentSpectator) => currentSpectator.databasePlayerId === databasePlayerId);

  if (spectator) {
    return {
      role: "spectator",
      user: spectator
    };
  }

  return null;
}

function findSessionByClientToken(clientToken) {
  if (!clientToken) {
    return null;
  }

  if (gameState.host?.clientToken === clientToken) {
    return {
      role: "host",
      user: gameState.host
    };
  }

  const player = gameState.players.find((currentPlayer) => currentPlayer.clientToken === clientToken);

  if (player) {
    return {
      role: "player",
      user: player
    };
  }

  const spectator = gameState.spectators.find((currentSpectator) => currentSpectator.clientToken === clientToken);

  if (spectator) {
    return {
      role: "spectator",
      user: spectator
    };
  }

  return null;
}

function findSessionByDiscordUserId(discordUserId) {
  if (gameState.host?.discordUserId === discordUserId) {
    return {
      role: "host",
      user: gameState.host
    };
  }

  const player = gameState.players.find((currentPlayer) => currentPlayer.discordUserId === discordUserId);

  if (player) {
    return {
      role: "player",
      user: player
    };
  }

  const spectator = gameState.spectators.find((currentSpectator) => currentSpectator.discordUserId === discordUserId);

  if (spectator) {
    return {
      role: "spectator",
      user: spectator
    };
  }

  return null;
}

function replaceUserSocketId(previousSocketId, nextSocketId, identity) {
  const applyReplacement = (user) => {
    if (!user || user.id !== previousSocketId) {
      return user;
    }

    return {
      ...user,
      id: nextSocketId,
      name: identity.name || user.name,
      avatarUrl: identity.avatarUrl,
      discordUserId: identity.discordUserId,
      databasePlayerId: identity.databasePlayerId || user.databasePlayerId || "",
      provider: identity.provider || user.provider || "",
      providerUserId: identity.providerUserId || user.providerUserId || "",
      clientToken: identity.clientToken,
      connected: true,
      disconnectedAt: null
    };
  };

  gameState.host = applyReplacement(gameState.host);
  gameState.players = gameState.players.map(applyReplacement);
  gameState.spectators = gameState.spectators.map(applyReplacement);
  gameState.buzzedPlayer = applyReplacement(gameState.buzzedPlayer);
  gameState.buzzes = gameState.buzzes.map(applyReplacement);
  gameState.lockedOutPlayers = gameState.lockedOutPlayers.map(applyReplacement);

  if (gameState.riskTileState.playerId === previousSocketId) {
    gameState.riskTileState.playerId = nextSocketId;
    gameState.riskTileState.playerName = identity.name || gameState.riskTileState.playerName;
  }

  if (gameState.currentTurnPlayerId === previousSocketId) {
    gameState.currentTurnPlayerId = nextSocketId;
  }

  replaceFaceAFacePlayerId(previousSocketId, nextSocketId);
  markUserConnected(nextSocketId);
}

function replaceFaceAFacePlayerId(previousSocketId, nextSocketId) {
  const finalState = gameState.faceAFaceState;
  finalState.eligiblePlayerIds = finalState.eligiblePlayerIds.map((playerId) =>
    playerId === previousSocketId ? nextSocketId : playerId
  );
  finalState.revealedPlayerIds = finalState.revealedPlayerIds.map((playerId) =>
    playerId === previousSocketId ? nextSocketId : playerId
  );
  rekeyObject(finalState.bets, previousSocketId, nextSocketId);
  rekeyObject(finalState.guesses, previousSocketId, nextSocketId);
  rekeyObject(finalState.judged, previousSocketId, nextSocketId);
}

function removeFaceAFacePlayerId(playerId) {
  const finalState = gameState.faceAFaceState;
  finalState.eligiblePlayerIds = finalState.eligiblePlayerIds.filter((eligiblePlayerId) => eligiblePlayerId !== playerId);
  finalState.revealedPlayerIds = finalState.revealedPlayerIds.filter((revealedPlayerId) => revealedPlayerId !== playerId);
  delete finalState.bets[playerId];
  delete finalState.guesses[playerId];
  delete finalState.judged[playerId];
}

function rekeyObject(target, previousKey, nextKey) {
  if (target[previousKey] === undefined) {
    return;
  }

  target[nextKey] = target[previousKey];
  delete target[previousKey];
}

function discoverAvailableGrids() {
  let filenames = [];

  try {
    filenames = readdirSync(gridsDirectory)
      .filter((filename) => filename.toLowerCase().endsWith(".json"))
      .sort((first, second) => first.localeCompare(second));
  } catch (error) {
    console.warn(`Could not read grids directory: ${error.message}`);
    return [];
  }

  return filenames.reduce((grids, filename) => {
    const grid = loadGridFile(filename);

    if (!grid) {
      return grids;
    }

    grids.push({
      id: grid.id || filename.replace(/\.json$/i, ""),
      name: grid.name || filename,
      filename
    });
    return grids;
  }, []);
}

function refreshAvailableGrids() {
  availableGrids = discoverAvailableGrids();
  return availableGrids;
}

function refreshGridsForAllGames() {
  const grids = refreshAvailableGrids();

  GameManager.games.forEach((gameContext) => {
    gameContext.state.availableGrids = grids;

    if (!grids.some((grid) => grid.filename === gameContext.state.selectedGridFilename)) {
      const firstGrid = grids[0] ?? createFallbackGridOption();
      setActiveGameContext(gameContext);
      gameContext.state.selectedGridFilename = firstGrid.filename;
      gameContext.state.grid = loadGridByFilename(firstGrid.filename) ?? createEmptyGrid(firstGrid);
      gameContext.state.currentRound = "round1";
      resetCurrentPromptState();
      saveActiveTimerHandles();
    }
  });
}

function importGridFile({ filename, contents }) {
  const originalFilename = typeof filename === "string" ? basename(filename) : "";

  if (!originalFilename.toLowerCase().endsWith(".json")) {
    return { ok: false, error: "Choose a .json grid file." };
  }

  if (typeof contents !== "string" || !contents.trim()) {
    return { ok: false, error: "The selected file is empty." };
  }

  if (Buffer.byteLength(contents, "utf8") > 2 * 1024 * 1024) {
    return { ok: false, error: "Grid file is too large. Keep it under 2 MB." };
  }

  let rawGrid;

  try {
    rawGrid = JSON.parse(contents);
  } catch {
    return { ok: false, error: "Invalid JSON. Check the file syntax and try again." };
  }

  const grid = normalizeGridPack(rawGrid);
  const validationError = validateGridSchema(grid);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (availableGrids.some((currentGrid) => currentGrid.id === grid.id)) {
    return { ok: false, error: `A grid with ID "${grid.id}" already exists.` };
  }

  const safeFilename = getUniqueGridFilename(originalFilename, grid.id);

  try {
    writeFileSync(
      join(gridsDirectory, safeFilename),
      `${JSON.stringify(normalizeGridForStorage(grid), null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    return { ok: false, error: `Could not save grid: ${error.message}` };
  }

  return {
    ok: true,
    grid: {
      id: grid.id,
      name: grid.name,
      filename: safeFilename
    }
  };
}

function validateGridSchema(grid) {
  if (!grid || typeof grid !== "object" || Array.isArray(grid)) {
    return "Grid JSON must be an object.";
  }

  if (!isNonEmptyString(grid.id)) {
    return "Grid must include a non-empty id.";
  }

  if (!isNonEmptyString(grid.name)) {
    return "Grid must include a non-empty name.";
  }

  if (!Array.isArray(grid.rounds?.round1?.categories) || grid.rounds.round1.categories.length === 0) {
    return "Grid must include Trivia Showdown grid with at least one category.";
  }

  for (const round of ["round1", "round2"]) {
    if (!Array.isArray(grid.rounds?.[round]?.categories)) {
      continue;
    }

    const categoryError = validateRoundCategories(grid.rounds[round].categories, round);

    if (categoryError) {
      return categoryError;
    }
  }

  if (grid.rounds?.final !== null && grid.rounds?.final !== undefined && (!isNonEmptyString(grid.rounds.final.category) || !isNonEmptyString(grid.rounds.final.prompt) || !isNonEmptyString(grid.rounds.final.guessAnswer))) {
    return "Face-a-Face must include category, prompt, and guess answer.";
  }

  return "";
}

function validateRoundCategories(categories, round) {
  for (const [categoryIndex, category] of categories.entries()) {
    if (!isNonEmptyString(category.category)) {
      return `${round}.categories[${categoryIndex}] must include a category name.`;
    }

    if (!Array.isArray(category.prompts) || category.prompts.length === 0) {
      return `${round}.categories[${categoryIndex}] must include prompts.`;
    }

    for (const [promptIndex, prompt] of category.prompts.entries()) {
      if (!Number.isFinite(Number(prompt.value))) {
        return `${round}.categories[${categoryIndex}].prompts[${promptIndex}] must include a numeric value.`;
      }

      if (!isNonEmptyString(prompt.prompt) || !isNonEmptyString(prompt.guessAnswer)) {
        return `${round}.categories[${categoryIndex}].prompts[${promptIndex}] must include prompt and guess answer.`;
      }

      if (prompt.image !== undefined && !isSafeRelativeMediaPath(prompt.image)) {
        return `${round}.categories[${categoryIndex}].prompts[${promptIndex}] has an invalid image path.`;
      }
    }
  }

  return "";
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeRelativeMediaPath(value) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value === value.trim() &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").includes("..");
}

function getUniqueGridFilename(originalFilename, gridId) {
  const preferredBase = slugifyGridFilename(originalFilename.replace(/\.json$/i, "") || gridId);
  let filename = `${preferredBase}.json`;
  let index = 2;

  while (availableGrids.some((grid) => grid.filename === filename)) {
    filename = `${preferredBase}-${index}.json`;
    index += 1;
  }

  return filename;
}

function slugifyGridFilename(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "imported-grid";
}

function stripGuessedTracking(grid) {
  return stripAnsweredTracking(grid);
}

function createFallbackGridOption() {
  return {
    id: "fallback-grid",
    name: "Fallback Grid",
    filename: "test-board.json"
  };
}

function createEmptyGrid(gridOption) {
  return {
    id: gridOption.id,
    name: gridOption.name,
    rounds: {
      round1: {
        categories: []
      },
      round2: {
        categories: []
      },
      final: null
    }
  };
}

function getGridOption(filename) {
  if (typeof filename !== "string" || filename !== basename(filename)) {
    return null;
  }

  return gameState.availableGrids.find((grid) => grid.filename === filename) || null;
}

function loadGridByFilename(filename) {
  if (typeof filename !== "string" || filename !== basename(filename)) {
    return null;
  }

  const gridOption = availableGrids.find((grid) => grid.filename === filename);

  if (!gridOption) {
    return null;
  }

  return loadGridFile(gridOption.filename);
}

function loadGridFile(filename) {
  if (filename !== basename(filename)) {
    console.warn(`Skipping grid with unsafe filename: ${filename}`);
    return null;
  }

  try {
    const grid = normalizeGridPack(JSON.parse(readFileSync(join(gridsDirectory, filename), "utf8")));

    if (!Array.isArray(grid?.rounds?.round1?.categories)) {
      console.warn(`Skipping invalid grid JSON: ${filename}`);
      return null;
    }

    addGuessedTracking(grid);
    return grid;
  } catch (error) {
    console.warn(`Skipping invalid grid JSON ${filename}: ${error.message}`);
    return null;
  }
}

function addGuessedTracking(gridPack) {
  ["round1", "round2"].forEach((round) => {
    gridPack.rounds?.[round]?.categories?.forEach((category) => {
      category.prompts?.forEach((prompt) => {
        prompt.answered = Boolean(prompt.answered);
      });
    });
  });
}

function getCurrentRoundCategories() {
  return gameState.grid?.rounds?.[gameState.currentRound]?.categories || [];
}

function hasRoundGrid(round) {
  return Array.isArray(gameState.grid?.rounds?.[round]?.categories) && gameState.grid.rounds[round].categories.length > 0;
}

function getRoundDisplayName(round = gameState.currentRound) {
  switch (round) {
    case "round1":
      return "Warm Up";

    case "round2":
      return "Power Round";

    default:
      return "Trivia Showdown";
  }
}

function resetRoundGuessedTracking(round) {
  gameState.grid?.rounds?.[round]?.categories?.forEach((category) => {
    category.prompts?.forEach((prompt) => {
      prompt.answered = false;
    });
  });
}

function createEmptyTimer() {
  return {
    type: null,
    remainingMs: 0,
    running: false,
    endsAt: null,
    expired: false
  };
}

function createEmptyRiskTileState() {
  return {
    playerId: null,
    playerName: "",
    bet: null,
    maxBet: 0,
    submitted: false,
    judged: false
  };
}

function createEmptyFaceAFaceState() {
  return {
    eligiblePlayerIds: [],
    bets: {},
    guesses: {},
    revealedPlayerIds: [],
    judged: {}
  };
}

function createFaceAFaceState() {
  return {
    ...createEmptyFaceAFaceState(),
    eligiblePlayerIds: gameState.players
      .filter((player) => player.score > 0)
      .map((player) => player.id)
  };
}

function getVisibleFaceAFaceState() {
  const state = gameState.faceAFaceState;
  const guessStatuses = {};
  const revealedGuesses = {};

  state.eligiblePlayerIds.forEach((playerId) => {
    guessStatuses[playerId] = Boolean(state.guesses[playerId]);
  });

  state.revealedPlayerIds.forEach((playerId) => {
    if (state.guesses[playerId]) {
      revealedGuesses[playerId] = state.guesses[playerId];
    }
  });

  return {
    eligiblePlayerIds: state.eligiblePlayerIds,
    betStatuses: getSubmissionStatuses(state.bets),
    guessStatuses,
    revealedPlayerIds: state.revealedPlayerIds,
    revealedGuesses,
    judged: state.judged
  };
}

function getSubmissionStatuses(submissions) {
  return gameState.faceAFaceState.eligiblePlayerIds.reduce((statuses, playerId) => {
    statuses[playerId] = submissions[playerId] !== undefined;
    return statuses;
  }, {});
}

function getEligibleFaceAFacePlayer(playerId) {
  if (!gameState.faceAFaceState.eligiblePlayerIds.includes(playerId)) {
    return null;
  }

  return gameState.players.find((player) => player.id === playerId && player.score > 0) || null;
}

function isEligibleFaceAFacePlayerId(playerId) {
  return gameState.faceAFaceState.eligiblePlayerIds.includes(playerId);
}

function allFaceAFaceBetsSubmitted() {
  return gameState.faceAFaceState.eligiblePlayerIds.every((playerId) =>
    gameState.faceAFaceState.bets[playerId] !== undefined
  );
}

function allFaceAFaceGuessesSubmitted() {
  return gameState.faceAFaceState.eligiblePlayerIds.every((playerId) =>
    Boolean(gameState.faceAFaceState.guesses[playerId])
  );
}

function allFaceAFaceGuessesJudged() {
  return gameState.faceAFaceState.eligiblePlayerIds.every((playerId) =>
    Boolean(gameState.faceAFaceState.judged[playerId])
  );
}

function getVisibleTimer() {
  if (!gameState.timer.type) {
    return createEmptyTimer();
  }

  const remainingMs = gameState.timer.running
    ? Math.max(0, gameState.timer.endsAt - Date.now())
    : gameState.timer.remainingMs;

  return {
    ...gameState.timer,
    remainingMs
  };
}

function startTimer(type, durationMs) {
  clearTimerHandles();
  const now = Date.now();
  const gameContext = activeGameContext;

  gameState.timer = {
    type,
    remainingMs: durationMs,
    running: true,
    endsAt: now + durationMs,
    expired: false
  };

  timerTimeout = setTimeout(() => runInGameContext(gameContext, handleTimerExpired), durationMs);
  timerBroadcastInterval = setInterval(() => runInGameContext(gameContext, sendGameState), TIMER_BROADCAST_MS);
}

function stopTimer() {
  clearTimerHandles();
  gameState.timer = createEmptyTimer();
}

function pauseTimer() {
  if (!gameState.timer.type || !gameState.timer.running) {
    return;
  }

  gameState.timer.remainingMs = Math.max(0, gameState.timer.endsAt - Date.now());
  gameState.timer.running = false;
  gameState.timer.endsAt = null;
  clearTimerHandles();
}

function resumeTimer() {
  if (!gameState.timer.type || gameState.timer.running || gameState.timer.remainingMs <= 0) {
    return;
  }

  const now = Date.now();
  const gameContext = activeGameContext;
  gameState.timer.running = true;
  gameState.timer.endsAt = now + gameState.timer.remainingMs;
  gameState.timer.expired = false;
  timerTimeout = setTimeout(() => runInGameContext(gameContext, handleTimerExpired), gameState.timer.remainingMs);
  timerBroadcastInterval = setInterval(() => runInGameContext(gameContext, sendGameState), TIMER_BROADCAST_MS);
}

function addTimerTime(amountMs) {
  if (!gameState.timer.type) {
    return;
  }

  if (gameState.timer.running) {
    const gameContext = activeGameContext;
    gameState.timer.endsAt += amountMs;
    gameState.timer.remainingMs = Math.max(0, gameState.timer.endsAt - Date.now());
    clearTimeout(timerTimeout);
    timerTimeout = setTimeout(() => runInGameContext(gameContext, handleTimerExpired), gameState.timer.remainingMs);
    return;
  }

  gameState.timer.remainingMs += amountMs;
  gameState.timer.expired = false;
}

function handleTimerExpired() {
  clearTimerHandles();
  const expiredType = gameState.timer.type;

  gameState.timer = {
    type: expiredType,
    remainingMs: 0,
    running: false,
    endsAt: null,
    expired: true
  };

  if (expiredType === "reading") {
    gameState.buzzingOpen = true;
    gameState.timer = createEmptyTimer();
    gameState.resultMessage = "Buzzing open!";
  }

  if (expiredType === "guess") {
    gameState.resultMessage = "Time expired - host decides.";
  }

  sendGameState();
}

function clearTimerHandles() {
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }

  if (timerBroadcastInterval) {
    clearInterval(timerBroadcastInterval);
    timerBroadcastInterval = null;
  }
}

function canHostControlTimer(socket) {
  return gameState.host?.id === socket.id &&
    gameState.phase === "question" &&
    Boolean(gameState.timer.type);
}

function resetCurrentPromptState() {
  stopTimer();
  gameState.currentPrompt = null;
  gameState.guessRevealed = false;
  gameState.buzzingOpen = false;
  gameState.buzzedPlayer = null;
  gameState.buzzes = [];
  gameState.lockedOutPlayers = [];
  gameState.riskTileState = createEmptyRiskTileState();
  gameState.faceAFaceState = createEmptyFaceAFaceState();
  gameState.resultMessage = "";
}

function resetGridState() {
  stopTimer();
  gameState.players = gameState.players.map((player) => ({
    ...player,
    score: 0
  }));
  gameState.currentTurnPlayerId = gameState.players[0]?.id || null;
  gameState.currentPrompt = null;
  gameState.guessRevealed = false;
  gameState.buzzingOpen = false;
  gameState.buzzedPlayer = null;
  gameState.buzzes = [];
  gameState.lockedOutPlayers = [];
  gameState.riskTileState = createEmptyRiskTileState();
  gameState.resultMessage = "";

  resetRoundGuessedTracking(gameState.currentRound);

  if (gameState.phase !== "waiting") {
    gameState.phase = "grid";
  }
}

function resetFullGameToGrid() {
  stopTimer();
  gameState.players = gameState.players.map((player) => ({
    ...player,
    score: 0
  }));
  gameState.currentTurnPlayerId = gameState.players[0]?.id || null;
  gameState.currentRound = "round1";
  gameState.gameStartedAt = new Date().toISOString();
  gameState.matchSavedId = "";
  gameState.matchSavedAt = null;
  gameState.matchSavePending = false;
  resetCurrentPromptState();
  resetRoundGuessedTracking("round1");
  resetRoundGuessedTracking("round2");
  gameState.phase = "grid";
}

function validateHostJudgment(socket) {
  if (gameState.host?.id !== socket.id) {
    return "Only the host can judge guesses.";
  }

  if (gameState.phase !== "question") {
    return "Judging is only available during a question.";
  }

  if (!gameState.currentPrompt) {
    return "No prompt is currently selected.";
  }

  if (!gameState.buzzedPlayer) {
    return "No player is waiting to be judged.";
  }

  if (gameState.guessRevealed) {
    return "This prompt has already been revealed.";
  }

  return null;
}

function validateDailyDoubleJudgment(socket) {
  if (gameState.host?.id !== socket.id) {
    return "Only the host can judge guesses.";
  }

  if (gameState.phase !== "riskTileQuestion") {
    return "Risk Tile judging is only available during the Risk Tile question.";
  }

  if (!gameState.currentPrompt) {
    return "No Risk Tile prompt is currently selected.";
  }

  if (!gameState.riskTileState.submitted || gameState.riskTileState.bet === null) {
    return "No Risk Tile bet has been submitted.";
  }

  if (gameState.riskTileState.judged) {
    return "This Risk Tile has already been judged.";
  }

  const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.riskTileState.playerId);

  if (!player) {
    return "The Risk Tile player is no longer active.";
  }

  return null;
}

function judgeRiskTile(isCorrect) {
  const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.riskTileState.playerId);
  const bet = gameState.riskTileState.bet;

  if (!player || bet === null) {
    return;
  }

  if (isCorrect) {
    player.score += bet;
    gameState.currentTurnPlayerId = player.id;
    gameState.resultMessage = `${player.name} is correct! +${bet}`;
  } else {
    player.score -= bet;
    gameState.resultMessage = `${player.name} is incorrect. -${bet}`;
  }

  gameState.riskTileState.judged = true;
  gameState.guessRevealed = true;
  gameState.buzzingOpen = false;
  stopTimer();
  markCurrentPromptGuessed();
}

function markCurrentPromptGuessed() {
  const round = gameState.currentPrompt.round || gameState.currentRound;
  const category = gameState.grid?.rounds?.[round]?.categories?.[gameState.currentPrompt.categoryIndex];
  const prompt = category?.prompts?.[gameState.currentPrompt.questionIndex];

  if (prompt) {
    prompt.answered = true;
  }
}

// Hosts receive the current guess for judging; other roles only get it after Reveal Guess.
function getVisibleCurrentPrompt(socket) {
  if (!gameState.currentPrompt) {
    return null;
  }

  const currentPrompt = {
    categoryIndex: gameState.currentPrompt.categoryIndex,
    questionIndex: gameState.currentPrompt.questionIndex,
    round: gameState.currentPrompt.round,
    category: gameState.currentPrompt.category,
    value: gameState.currentPrompt.value,
    prompt: gameState.currentPrompt.prompt,
    image: gameState.currentPrompt.image || "",
    type: gameState.currentPrompt.type || "",
    riskTile: Boolean(gameState.currentPrompt.riskTile)
  };

  if (gameState.guessRevealed || socket?.id === gameState.host?.id) {
    currentPrompt.guessAnswer = gameState.currentPrompt.guessAnswer;
  }

  return currentPrompt;
}

server.listen(PORT, () => {
  console.log(`Discord Trivia Showdown Build: ${BUILD_VERSION}`);
  console.log(`Server running on http://localhost:${PORT}`);
});


