import express from "express";
import { readdirSync, readFileSync } from "fs";
import http from "http";
import { basename, dirname, join } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3001;
const READING_TIMER_MS = 5000;
const ANSWER_TIMER_MS = 10000;
const TIMER_BROADCAST_MS = 250;
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
const BUILD_VERSION = process.env.BUILD_VERSION ||
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ||
  `${packageJson.version}-${Date.now()}`;
const boardsDirectory = join(__dirname, "public", "boards");
const availableBoards = discoverAvailableBoards();
const selectedBoard = availableBoards[0] ?? createFallbackBoardOption();
const initialBoard = loadBoardByFilename(selectedBoard.filename) ?? createEmptyBoard(selectedBoard);

app.use(express.json());

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
    if (filePath.endsWith(".html")) {
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

app.post("/api/discord/token", async (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const code = typeof req.body?.code === "string" ? req.body.code : "";

  if (!clientId || !clientSecret || !code) {
    res.status(400).json({ error: "Discord auth is not configured." });
    return;
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code
      })
    });

    if (!tokenResponse.ok) {
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

const gameState = {
  host: null,
  players: [],
  spectators: [],
  phase: "waiting",
  availableBoards,
  selectedBoardFilename: selectedBoard.filename,
  board: initialBoard,
  currentRound: "jeopardy",
  currentClue: null,
  answerRevealed: false,
  buzzingOpen: false,
  buzzedPlayer: null,
  buzzes: [],
  lockedOutPlayers: [],
  dailyDouble: createEmptyDailyDouble(),
  finalJeopardyState: createEmptyFinalJeopardyState(),
  timer: createEmptyTimer(),
  resultMessage: ""
};

let timerTimeout = null;
let timerBroadcastInterval = null;

function getUser(socket) {
  return {
    id: socket.id,
    name: socket.data.name || `Guest ${socket.id.slice(0, 4)}`,
    avatarUrl: socket.data.avatarUrl || "",
    discordUserId: socket.data.discordUserId || "",
    role: socket.data.role || null
  };
}

function renderIndexHtml() {
  return readFileSync(join(__dirname, "public", "index.html"), "utf8")
    .replaceAll("__BUILD_VERSION__", BUILD_VERSION);
}

function sendGameState() {
  io.emit("gameState", {
    host: gameState.host,
    players: gameState.players,
    spectators: gameState.spectators,
    hostAvailable: gameState.host === null,
    phase: gameState.phase,
    availableBoards: gameState.availableBoards,
    selectedBoardFilename: gameState.selectedBoardFilename,
    board: gameState.board,
    currentRound: gameState.currentRound,
    currentClue: getVisibleCurrentClue(),
    answerRevealed: gameState.answerRevealed,
    buzzingOpen: gameState.buzzingOpen,
    buzzedPlayer: gameState.buzzedPlayer,
    buzzes: gameState.buzzes,
    lockedOutPlayers: gameState.lockedOutPlayers,
    dailyDouble: gameState.dailyDouble,
    finalJeopardyState: getVisibleFinalJeopardyState(),
    timer: getVisibleTimer(),
    resultMessage: gameState.resultMessage
  });
}

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.data.name = `Guest ${socket.id.slice(0, 4)}`;
  socket.data.avatarUrl = "";
  socket.data.discordUserId = "";
  socket.data.role = null;

  socket.emit("connected", getUser(socket));
  sendGameState();

  socket.on("setUserIdentity", ({ name, avatarUrl, discordUserId } = {}) => {
    const identity = sanitizeIdentity({
      name,
      avatarUrl,
      discordUserId
    });

    if (identity.name) {
      socket.data.name = identity.name;
    }

    socket.data.avatarUrl = identity.avatarUrl;
    socket.data.discordUserId = identity.discordUserId;
    updateUserIdentity(socket.id, identity);
    socket.emit("identityUpdated", getUser(socket));
    sendGameState();
  });

  socket.on("chooseRole", (role) => {
    if (!["host", "player", "spectator"].includes(role)) {
      socket.emit("roleRejected", "Invalid role.");
      return;
    }

    if (role === "host" && gameState.host !== null) {
      socket.emit("roleRejected", "Host has already been chosen.");
      return;
    }

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
    }

    if (role === "spectator") {
      gameState.spectators.push(user);
    }

    socket.emit("roleConfirmed", user);
    sendGameState();
  });

  socket.on("startGame", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start the game.");
      return;
    }

    gameState.phase = "board";
    gameState.currentRound = "jeopardy";
    resetCurrentClueState();
    sendGameState();
  });

  socket.on("selectClue", ({ categoryIndex, questionIndex } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can select clues.");
      return;
    }

    if (gameState.phase !== "board") {
      socket.emit("actionRejected", "The board is not active.");
      return;
    }

    const category = getCurrentRoundCategories()?.[categoryIndex];
    const question = category?.questions?.[questionIndex];

    if (!category || !question) {
      socket.emit("actionRejected", "That clue is not on the board.");
      return;
    }

    if (question.answered) {
      socket.emit("actionRejected", "That clue has already been answered.");
      return;
    }

    stopTimer();
    gameState.currentClue = {
      categoryIndex,
      questionIndex,
      round: gameState.currentRound,
      category: category.category,
      value: question.value,
      clue: question.clue,
      answer: question.answer,
      dailyDouble: Boolean(question.dailyDouble)
    };
    gameState.answerRevealed = false;
    gameState.buzzingOpen = false;
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.lockedOutPlayers = [];
    gameState.dailyDouble = createEmptyDailyDouble();

    if (question.dailyDouble) {
      gameState.resultMessage = "";
      gameState.phase = "dailyDoublePlayerSelect";
    } else {
      gameState.resultMessage = "Read the clue...";
      gameState.phase = "question";
      startTimer("reading", READING_TIMER_MS);
    }

    sendGameState();
  });

  socket.on("startDoubleJeopardy", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start Double Jeopardy.");
      return;
    }

    if (gameState.phase !== "board") {
      socket.emit("actionRejected", "Double Jeopardy can only start from the board.");
      return;
    }

    if (gameState.currentRound !== "jeopardy") {
      socket.emit("actionRejected", "Double Jeopardy has already started.");
      return;
    }

    if (!hasRoundBoard("doubleJeopardy")) {
      socket.emit("actionRejected", "This board does not include Double Jeopardy.");
      return;
    }

    gameState.currentRound = "doubleJeopardy";
    gameState.phase = "board";
    resetCurrentClueState();
    sendGameState();
  });

  socket.on("startFinalJeopardy", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start Final Jeopardy.");
      return;
    }

    if (gameState.phase !== "board" || gameState.currentRound !== "doubleJeopardy") {
      socket.emit("actionRejected", "Final Jeopardy can only start from the Double Jeopardy board.");
      return;
    }

    if (!gameState.board.finalJeopardy) {
      socket.emit("actionRejected", "This board does not include Final Jeopardy.");
      return;
    }

    resetCurrentClueState();
    gameState.finalJeopardyState = createFinalJeopardyState();
    gameState.phase = "finalWager";
    sendGameState();
  });

  socket.on("submitFinalWager", ({ wager } = {}) => {
    if (gameState.phase !== "finalWager") {
      socket.emit("actionRejected", "Final Jeopardy wagering is not active.");
      return;
    }

    const player = getEligibleFinalPlayer(socket.id);

    if (!player) {
      socket.emit("actionRejected", "You are not eligible for Final Jeopardy.");
      return;
    }

    const parsedWager = Number(wager);

    if (!Number.isFinite(parsedWager) || !Number.isInteger(parsedWager)) {
      socket.emit("actionRejected", "Wager must be a finite integer.");
      return;
    }

    if (parsedWager < 0 || parsedWager > player.score) {
      socket.emit("actionRejected", "Wager must be between $0 and your current score.");
      return;
    }

    gameState.finalJeopardyState.wagers[player.id] = parsedWager;
    sendGameState();
  });

  socket.on("revealFinalClue", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reveal the Final Jeopardy clue.");
      return;
    }

    if (gameState.phase !== "finalWager") {
      socket.emit("actionRejected", "Final Jeopardy wagering is not active.");
      return;
    }

    if (!allFinalWagersSubmitted()) {
      socket.emit("actionRejected", "All eligible players must submit wagers first.");
      return;
    }

    gameState.phase = "finalAnswers";
    sendGameState();
  });

  socket.on("submitFinalAnswer", ({ answer } = {}) => {
    if (gameState.phase !== "finalAnswers") {
      socket.emit("actionRejected", "Final Jeopardy answers are not active.");
      return;
    }

    const player = getEligibleFinalPlayer(socket.id);

    if (!player || gameState.finalJeopardyState.wagers[player.id] === undefined) {
      socket.emit("actionRejected", "You must be eligible and have a wager submitted.");
      return;
    }

    const trimmedAnswer = String(answer || "").trim();

    if (!trimmedAnswer) {
      socket.emit("actionRejected", "Final Jeopardy answer cannot be empty.");
      return;
    }

    gameState.finalJeopardyState.answers[player.id] = trimmedAnswer;
    sendGameState();
  });

  socket.on("startFinalReview", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can start Final Jeopardy review.");
      return;
    }

    if (gameState.phase !== "finalAnswers") {
      socket.emit("actionRejected", "Final Jeopardy answers are not active.");
      return;
    }

    if (!allFinalAnswersSubmitted()) {
      socket.emit("actionRejected", "All eligible players must submit answers first.");
      return;
    }

    gameState.phase = "finalReview";
    sendGameState();
  });

  socket.on("revealFinalAnswerForPlayer", ({ playerId } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reveal Final Jeopardy answers.");
      return;
    }

    if (gameState.phase !== "finalReview") {
      socket.emit("actionRejected", "Final Jeopardy review is not active.");
      return;
    }

    if (!isEligibleFinalPlayerId(playerId) || !gameState.finalJeopardyState.answers[playerId]) {
      socket.emit("actionRejected", "That player does not have a Final Jeopardy answer.");
      return;
    }

    if (!gameState.finalJeopardyState.revealedPlayerIds.includes(playerId)) {
      gameState.finalJeopardyState.revealedPlayerIds.push(playerId);
    }

    sendGameState();
  });

  socket.on("judgeFinalAnswer", ({ playerId, result } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can judge Final Jeopardy answers.");
      return;
    }

    if (gameState.phase !== "finalReview") {
      socket.emit("actionRejected", "Final Jeopardy review is not active.");
      return;
    }

    if (!["correct", "incorrect"].includes(result)) {
      socket.emit("actionRejected", "Invalid Final Jeopardy judgement.");
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === playerId);
    const wager = gameState.finalJeopardyState.wagers[playerId];

    if (!player || wager === undefined || !gameState.finalJeopardyState.revealedPlayerIds.includes(playerId)) {
      socket.emit("actionRejected", "Reveal this player's answer before judging.");
      return;
    }

    if (gameState.finalJeopardyState.judged[playerId]) {
      socket.emit("actionRejected", "That Final Jeopardy answer has already been judged.");
      return;
    }

    player.score += result === "correct" ? wager : -wager;
    gameState.finalJeopardyState.judged[playerId] = result;
    sendGameState();
  });

  socket.on("showFinalResults", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can show Final Jeopardy results.");
      return;
    }

    if (gameState.phase !== "finalReview") {
      socket.emit("actionRejected", "Final Jeopardy review is not active.");
      return;
    }

    if (!allFinalAnswersJudged()) {
      socket.emit("actionRejected", "All Final Jeopardy answers must be judged first.");
      return;
    }

    gameState.phase = "finalResults";
    sendGameState();
  });

  socket.on("buzz", () => {
    if (socket.data.role !== "player") {
      socket.emit("actionRejected", "Only players can buzz.");
      return;
    }

    if (gameState.phase !== "question") {
      socket.emit("actionRejected", "Buzzing is only available during a question.");
      return;
    }

    if (gameState.answerRevealed) {
      socket.emit("actionRejected", "Buzzing is closed after the answer is revealed.");
      return;
    }

    if (!gameState.buzzingOpen) {
      socket.emit("actionRejected", "Buzzing is not open yet.");
      return;
    }

    if (gameState.lockedOutPlayers.some((player) => player.id === socket.id)) {
      socket.emit("actionRejected", "You are locked out for this clue.");
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
      timestamp,
      delayMs: timestamp - firstBuzzTimestamp
    };

    gameState.buzzes.push(buzz);

    if (!gameState.buzzedPlayer) {
      gameState.buzzedPlayer = player;
      startTimer("answer", ANSWER_TIMER_MS);
    }

    sendGameState();
  });

  socket.on("markCorrect", () => {
    if (gameState.phase === "dailyDoubleQuestion") {
      const validationError = validateDailyDoubleJudgement(socket);

      if (validationError) {
        socket.emit("actionRejected", validationError);
        return;
      }

      judgeDailyDouble(true);
      sendGameState();
      return;
    }

    const validationError = validateHostJudgement(socket);

    if (validationError) {
      socket.emit("actionRejected", validationError);
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.buzzedPlayer.id);

    if (!player) {
      socket.emit("actionRejected", "The buzzed player is no longer active.");
      return;
    }

    player.score += gameState.currentClue.value;
    gameState.answerRevealed = true;
    gameState.buzzingOpen = false;
    gameState.resultMessage = `${player.name} is correct! +$${gameState.currentClue.value}`;
    stopTimer();
    markCurrentClueAnswered();
    sendGameState();
  });

  socket.on("markIncorrect", () => {
    if (gameState.phase === "dailyDoubleQuestion") {
      const validationError = validateDailyDoubleJudgement(socket);

      if (validationError) {
        socket.emit("actionRejected", validationError);
        return;
      }

      judgeDailyDouble(false);
      sendGameState();
      return;
    }

    const validationError = validateHostJudgement(socket);

    if (validationError) {
      socket.emit("actionRejected", validationError);
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.buzzedPlayer.id);

    if (!player) {
      socket.emit("actionRejected", "The buzzed player is no longer active.");
      return;
    }

    player.score -= gameState.currentClue.value;
    gameState.lockedOutPlayers.push({
      id: player.id,
      name: player.name
    });
    gameState.resultMessage = `${player.name} is incorrect. Buzzer reopened. -$${gameState.currentClue.value}`;
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.answerRevealed = false;
    gameState.phase = "question";
    gameState.buzzingOpen = true;
    stopTimer();
    sendGameState();
  });

  socket.on("selectDailyDoublePlayer", ({ playerId } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can choose the Daily Double player.");
      return;
    }

    if (gameState.phase !== "dailyDoublePlayerSelect") {
      socket.emit("actionRejected", "Daily Double player selection is not active.");
      return;
    }

    const player = gameState.players.find((currentPlayer) => currentPlayer.id === playerId);

    if (!player) {
      socket.emit("actionRejected", "That player is not active.");
      return;
    }

    gameState.dailyDouble = {
      playerId: player.id,
      playerName: player.name,
      wager: null,
      maxWager: Math.max(player.score, 1000),
      submitted: false,
      judged: false
    };
    gameState.phase = "dailyDoubleWager";
    gameState.resultMessage = "";
    sendGameState();
  });

  socket.on("submitDailyDoubleWager", ({ wager } = {}) => {
    if (gameState.phase !== "dailyDoubleWager") {
      socket.emit("actionRejected", "Daily Double wagering is not active.");
      return;
    }

    if (gameState.dailyDouble.playerId !== socket.id) {
      socket.emit("actionRejected", "Only the selected Daily Double player can wager.");
      return;
    }

    const parsedWager = Number(wager);

    if (!Number.isFinite(parsedWager) || !Number.isInteger(parsedWager)) {
      socket.emit("actionRejected", "Wager must be a finite integer.");
      return;
    }

    if (parsedWager < 0) {
      socket.emit("actionRejected", "Wager cannot be negative.");
      return;
    }

    if (parsedWager > gameState.dailyDouble.maxWager) {
      socket.emit("actionRejected", "Wager cannot exceed the maximum.");
      return;
    }

    gameState.dailyDouble.wager = parsedWager;
    gameState.dailyDouble.submitted = true;
    gameState.phase = "dailyDoubleQuestion";
    gameState.resultMessage = "";
    sendGameState();
  });

  socket.on("selectBoard", ({ filename } = {}) => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can select a board.");
      return;
    }

    if (gameState.phase !== "waiting" && gameState.phase !== "board") {
      socket.emit("actionRejected", "Boards can only be changed before a clue is active.");
      return;
    }

    const boardOption = getBoardOption(filename);

    if (!boardOption) {
      socket.emit("actionRejected", "That board is not available.");
      return;
    }

    const board = loadBoardByFilename(boardOption.filename);

    if (!board) {
      socket.emit("actionRejected", "That board could not be loaded.");
      return;
    }

    gameState.board = board;
    gameState.selectedBoardFilename = boardOption.filename;
    gameState.currentRound = "jeopardy";
    resetCurrentClueState();

    if (gameState.phase === "board") {
      gameState.phase = "board";
    }

    sendGameState();
  });

  socket.on("resetBoard", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reset the board.");
      return;
    }

    resetBoardState();
    sendGameState();
  });

  socket.on("editPlayerScore", ({ playerId, newScore } = {}) => {
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

  socket.on("revealAnswer", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can reveal the answer.");
      return;
    }

    if (!gameState.currentClue) {
      socket.emit("actionRejected", "No clue is currently selected.");
      return;
    }

    if (gameState.phase !== "question" && gameState.phase !== "dailyDoubleQuestion") {
      socket.emit("actionRejected", "There is no active question.");
      return;
    }

    gameState.answerRevealed = true;
    gameState.buzzingOpen = false;
    stopTimer();
    sendGameState();
  });

  socket.on("pauseTimer", () => {
    if (!canHostControlTimer(socket)) {
      socket.emit("actionRejected", "Only the host can control an active timer.");
      return;
    }

    pauseTimer();
    sendGameState();
  });

  socket.on("resumeTimer", () => {
    if (!canHostControlTimer(socket)) {
      socket.emit("actionRejected", "Only the host can control an active timer.");
      return;
    }

    resumeTimer();
    sendGameState();
  });

  socket.on("addTimerTime", (amountMs = 5000) => {
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

  socket.on("returnToBoard", () => {
    if (gameState.host?.id !== socket.id) {
      socket.emit("actionRejected", "Only the host can return to the board.");
      return;
    }

    if (gameState.currentClue) {
      markCurrentClueAnswered();
    }

    gameState.phase = "board";
    resetCurrentClueState();
    sendGameState();
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);

    removeUserFromAllRoles(socket.id);

    if (gameState.host === null) {
      gameState.phase = "waiting";
      resetCurrentClueState();
    }

    sendGameState();
  });
});

function removeUserFromAllRoles(socketId) {
  if (gameState.host?.id === socketId) {
    gameState.host = null;
  }

  gameState.players = gameState.players.filter((player) => player.id !== socketId);
  gameState.spectators = gameState.spectators.filter((spectator) => spectator.id !== socketId);
}

function sanitizeIdentity({ name, avatarUrl, discordUserId }) {
  return {
    name: sanitizeDisplayName(name),
    avatarUrl: sanitizeAvatarUrl(avatarUrl),
    discordUserId: sanitizePlainText(discordUserId, 40)
  };
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

function updateUserIdentity(socketId, identity) {
  const applyIdentity = (user) => {
    if (!user || user.id !== socketId) {
      return user;
    }

    return {
      ...user,
      name: identity.name || user.name,
      avatarUrl: identity.avatarUrl,
      discordUserId: identity.discordUserId
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

  if (gameState.dailyDouble.playerId === socketId && identity.name) {
    gameState.dailyDouble.playerName = identity.name;
  }
}

function discoverAvailableBoards() {
  let filenames = [];

  try {
    filenames = readdirSync(boardsDirectory)
      .filter((filename) => filename.toLowerCase().endsWith(".json"))
      .sort((first, second) => first.localeCompare(second));
  } catch (error) {
    console.warn(`Could not read boards directory: ${error.message}`);
    return [];
  }

  return filenames.reduce((boards, filename) => {
    const board = loadBoardFile(filename);

    if (!board) {
      return boards;
    }

    boards.push({
      id: board.id || filename.replace(/\.json$/i, ""),
      name: board.name || filename,
      filename
    });
    return boards;
  }, []);
}

function createFallbackBoardOption() {
  return {
    id: "fallback-board",
    name: "Fallback Board",
    filename: "test-board.json"
  };
}

function createEmptyBoard(boardOption) {
  return {
    id: boardOption.id,
    name: boardOption.name,
    jeopardy: {
      board: []
    },
    doubleJeopardy: {
      board: []
    }
  };
}

function getBoardOption(filename) {
  if (typeof filename !== "string" || filename !== basename(filename)) {
    return null;
  }

  return gameState.availableBoards.find((board) => board.filename === filename) || null;
}

function loadBoardByFilename(filename) {
  if (typeof filename !== "string" || filename !== basename(filename)) {
    return null;
  }

  const boardOption = availableBoards.find((board) => board.filename === filename);

  if (!boardOption) {
    return null;
  }

  return loadBoardFile(boardOption.filename);
}

function loadBoardFile(filename) {
  if (filename !== basename(filename)) {
    console.warn(`Skipping board with unsafe filename: ${filename}`);
    return null;
  }

  try {
    const board = JSON.parse(readFileSync(join(boardsDirectory, filename), "utf8"));

    if (!Array.isArray(board.jeopardy?.board)) {
      console.warn(`Skipping invalid board JSON: ${filename}`);
      return null;
    }

    addAnsweredTracking(board);
    return board;
  } catch (error) {
    console.warn(`Skipping invalid board JSON ${filename}: ${error.message}`);
    return null;
  }
}

function addAnsweredTracking(boardPack) {
  ["jeopardy", "doubleJeopardy"].forEach((round) => {
    boardPack[round]?.board?.forEach((category) => {
      category.questions?.forEach((question) => {
        question.answered = Boolean(question.answered);
      });
    });
  });
}

function getCurrentRoundCategories() {
  return gameState.board?.[gameState.currentRound]?.board || [];
}

function hasRoundBoard(round) {
  return Array.isArray(gameState.board?.[round]?.board) && gameState.board[round].board.length > 0;
}

function getRoundDisplayName(round = gameState.currentRound) {
  return round === "doubleJeopardy" ? "Double Jeopardy" : "Jeopardy";
}

function resetRoundAnsweredTracking(round) {
  gameState.board?.[round]?.board?.forEach((category) => {
    category.questions?.forEach((question) => {
      question.answered = false;
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

function createEmptyDailyDouble() {
  return {
    playerId: null,
    playerName: "",
    wager: null,
    maxWager: 0,
    submitted: false,
    judged: false
  };
}

function createEmptyFinalJeopardyState() {
  return {
    eligiblePlayerIds: [],
    wagers: {},
    answers: {},
    revealedPlayerIds: [],
    judged: {}
  };
}

function createFinalJeopardyState() {
  return {
    ...createEmptyFinalJeopardyState(),
    eligiblePlayerIds: gameState.players
      .filter((player) => player.score > 0)
      .map((player) => player.id)
  };
}

function getVisibleFinalJeopardyState() {
  const state = gameState.finalJeopardyState;
  const answerStatuses = {};
  const revealedAnswers = {};

  state.eligiblePlayerIds.forEach((playerId) => {
    answerStatuses[playerId] = Boolean(state.answers[playerId]);
  });

  state.revealedPlayerIds.forEach((playerId) => {
    if (state.answers[playerId]) {
      revealedAnswers[playerId] = state.answers[playerId];
    }
  });

  return {
    eligiblePlayerIds: state.eligiblePlayerIds,
    wagerStatuses: getSubmissionStatuses(state.wagers),
    answerStatuses,
    revealedPlayerIds: state.revealedPlayerIds,
    revealedAnswers,
    judged: state.judged
  };
}

function getSubmissionStatuses(submissions) {
  return gameState.finalJeopardyState.eligiblePlayerIds.reduce((statuses, playerId) => {
    statuses[playerId] = submissions[playerId] !== undefined;
    return statuses;
  }, {});
}

function getEligibleFinalPlayer(playerId) {
  if (!gameState.finalJeopardyState.eligiblePlayerIds.includes(playerId)) {
    return null;
  }

  return gameState.players.find((player) => player.id === playerId && player.score > 0) || null;
}

function isEligibleFinalPlayerId(playerId) {
  return gameState.finalJeopardyState.eligiblePlayerIds.includes(playerId);
}

function allFinalWagersSubmitted() {
  return gameState.finalJeopardyState.eligiblePlayerIds.every((playerId) =>
    gameState.finalJeopardyState.wagers[playerId] !== undefined
  );
}

function allFinalAnswersSubmitted() {
  return gameState.finalJeopardyState.eligiblePlayerIds.every((playerId) =>
    Boolean(gameState.finalJeopardyState.answers[playerId])
  );
}

function allFinalAnswersJudged() {
  return gameState.finalJeopardyState.eligiblePlayerIds.every((playerId) =>
    Boolean(gameState.finalJeopardyState.judged[playerId])
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

  gameState.timer = {
    type,
    remainingMs: durationMs,
    running: true,
    endsAt: now + durationMs,
    expired: false
  };

  timerTimeout = setTimeout(handleTimerExpired, durationMs);
  timerBroadcastInterval = setInterval(sendGameState, TIMER_BROADCAST_MS);
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
  gameState.timer.running = true;
  gameState.timer.endsAt = now + gameState.timer.remainingMs;
  gameState.timer.expired = false;
  timerTimeout = setTimeout(handleTimerExpired, gameState.timer.remainingMs);
  timerBroadcastInterval = setInterval(sendGameState, TIMER_BROADCAST_MS);
}

function addTimerTime(amountMs) {
  if (!gameState.timer.type) {
    return;
  }

  if (gameState.timer.running) {
    gameState.timer.endsAt += amountMs;
    gameState.timer.remainingMs = Math.max(0, gameState.timer.endsAt - Date.now());
    clearTimeout(timerTimeout);
    timerTimeout = setTimeout(handleTimerExpired, gameState.timer.remainingMs);
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

  if (expiredType === "answer") {
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

function resetCurrentClueState() {
  stopTimer();
  gameState.currentClue = null;
  gameState.answerRevealed = false;
  gameState.buzzingOpen = false;
  gameState.buzzedPlayer = null;
  gameState.buzzes = [];
  gameState.lockedOutPlayers = [];
  gameState.dailyDouble = createEmptyDailyDouble();
  gameState.finalJeopardyState = createEmptyFinalJeopardyState();
  gameState.resultMessage = "";
}

function resetBoardState() {
  stopTimer();
  gameState.players = gameState.players.map((player) => ({
    ...player,
    score: 0
  }));
  gameState.currentClue = null;
  gameState.answerRevealed = false;
  gameState.buzzingOpen = false;
  gameState.buzzedPlayer = null;
  gameState.buzzes = [];
  gameState.lockedOutPlayers = [];
  gameState.dailyDouble = createEmptyDailyDouble();
  gameState.resultMessage = "";

  resetRoundAnsweredTracking(gameState.currentRound);

  if (gameState.phase !== "waiting") {
    gameState.phase = "board";
  }
}

function validateHostJudgement(socket) {
  if (gameState.host?.id !== socket.id) {
    return "Only the host can judge answers.";
  }

  if (gameState.phase !== "question") {
    return "Judging is only available during a question.";
  }

  if (!gameState.currentClue) {
    return "No clue is currently selected.";
  }

  if (!gameState.buzzedPlayer) {
    return "No player is waiting to be judged.";
  }

  if (gameState.answerRevealed) {
    return "This clue has already been revealed.";
  }

  return null;
}

function validateDailyDoubleJudgement(socket) {
  if (gameState.host?.id !== socket.id) {
    return "Only the host can judge answers.";
  }

  if (gameState.phase !== "dailyDoubleQuestion") {
    return "Daily Double judging is only available during the Daily Double question.";
  }

  if (!gameState.currentClue) {
    return "No Daily Double clue is currently selected.";
  }

  if (!gameState.dailyDouble.submitted || gameState.dailyDouble.wager === null) {
    return "No Daily Double wager has been submitted.";
  }

  if (gameState.dailyDouble.judged) {
    return "This Daily Double has already been judged.";
  }

  const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.dailyDouble.playerId);

  if (!player) {
    return "The Daily Double player is no longer active.";
  }

  return null;
}

function judgeDailyDouble(isCorrect) {
  const player = gameState.players.find((currentPlayer) => currentPlayer.id === gameState.dailyDouble.playerId);
  const wager = gameState.dailyDouble.wager;

  if (!player || wager === null) {
    return;
  }

  if (isCorrect) {
    player.score += wager;
    gameState.resultMessage = `${player.name} is correct! +$${wager}`;
  } else {
    player.score -= wager;
    gameState.resultMessage = `${player.name} is incorrect. -$${wager}`;
  }

  gameState.dailyDouble.judged = true;
  gameState.answerRevealed = true;
  gameState.buzzingOpen = false;
  stopTimer();
  markCurrentClueAnswered();
}

function markCurrentClueAnswered() {
  const round = gameState.currentClue.round || gameState.currentRound;
  const category = gameState.board?.[round]?.board?.[gameState.currentClue.categoryIndex];
  const question = category?.questions?.[gameState.currentClue.questionIndex];

  if (question) {
    question.answered = true;
  }
}

function getVisibleCurrentClue() {
  if (!gameState.currentClue) {
    return null;
  }

  const currentClue = {
    categoryIndex: gameState.currentClue.categoryIndex,
    questionIndex: gameState.currentClue.questionIndex,
    round: gameState.currentClue.round,
    category: gameState.currentClue.category,
    value: gameState.currentClue.value,
    clue: gameState.currentClue.clue,
    dailyDouble: Boolean(gameState.currentClue.dailyDouble)
  };

  if (gameState.answerRevealed) {
    currentClue.answer = gameState.currentClue.answer;
  }

  return currentClue;
}

server.listen(PORT, () => {
  console.log(`Discord Jeopardy Build: ${BUILD_VERSION}`);
  console.log(`Server running on http://localhost:${PORT}`);
});
