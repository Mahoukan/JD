import express from "express";
import { readFileSync } from "fs";
import http from "http";
import { dirname, join } from "path";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const testBoard = JSON.parse(
  readFileSync(join(__dirname, "public", "boards", "test-board.json"), "utf8")
);
addAnsweredTracking(testBoard);

app.use(express.static("public"));

const gameState = {
  host: null,
  players: [],
  spectators: [],
  phase: "waiting",
  board: testBoard,
  currentClue: null,
  answerRevealed: false,
  buzzedPlayer: null,
  buzzes: [],
  lockedOutPlayers: [],
  resultMessage: ""
};

function getUser(socket) {
  return {
    id: socket.id,
    name: socket.data.name || `Guest ${socket.id.slice(0, 4)}`,
    role: socket.data.role || null
  };
}

function sendGameState() {
  io.emit("gameState", {
    host: gameState.host,
    players: gameState.players,
    spectators: gameState.spectators,
    hostAvailable: gameState.host === null,
    phase: gameState.phase,
    board: gameState.board,
    currentClue: getVisibleCurrentClue(),
    answerRevealed: gameState.answerRevealed,
    buzzedPlayer: gameState.buzzedPlayer,
    buzzes: gameState.buzzes,
    lockedOutPlayers: gameState.lockedOutPlayers,
    resultMessage: gameState.resultMessage
  });
}

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.data.name = `Guest ${socket.id.slice(0, 4)}`;
  socket.data.role = null;

  socket.emit("connected", getUser(socket));
  sendGameState();

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
    gameState.currentClue = null;
    gameState.answerRevealed = false;
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.lockedOutPlayers = [];
    gameState.resultMessage = "";
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

    const category = gameState.board.jeopardy?.board?.[categoryIndex];
    const question = category?.questions?.[questionIndex];

    if (!category || !question) {
      socket.emit("actionRejected", "That clue is not on the board.");
      return;
    }

    if (question.answered) {
      socket.emit("actionRejected", "That clue has already been answered.");
      return;
    }

    gameState.currentClue = {
      categoryIndex,
      questionIndex,
      category: category.category,
      value: question.value,
      clue: question.clue,
      answer: question.answer
    };
    gameState.answerRevealed = false;
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.lockedOutPlayers = [];
    gameState.resultMessage = "";
    gameState.phase = "question";
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

    if (gameState.lockedOutPlayers.some((player) => player.id === socket.id)) {
      socket.emit("actionRejected", "You are locked out for this clue.");
      return;
    }

    if (gameState.buzzes.some((buzz) => buzz.id === socket.id)) {
      socket.emit("actionRejected", "You have already buzzed for this clue.");
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
    }

    sendGameState();
  });

  socket.on("markCorrect", () => {
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
    gameState.resultMessage = `${player.name} is correct! +$${gameState.currentClue.value}`;
    markCurrentClueAnswered();
    sendGameState();
  });

  socket.on("markIncorrect", () => {
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
    gameState.resultMessage = `${player.name} is incorrect. -$${gameState.currentClue.value}`;
    gameState.buzzedPlayer = null;
    gameState.answerRevealed = false;
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

    if (gameState.phase !== "question") {
      socket.emit("actionRejected", "There is no active question.");
      return;
    }

    gameState.answerRevealed = true;
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
    gameState.currentClue = null;
    gameState.answerRevealed = false;
    gameState.buzzedPlayer = null;
    gameState.buzzes = [];
    gameState.lockedOutPlayers = [];
    gameState.resultMessage = "";
    sendGameState();
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);

    removeUserFromAllRoles(socket.id);

    if (gameState.host === null) {
      gameState.phase = "waiting";
      gameState.currentClue = null;
      gameState.answerRevealed = false;
      gameState.buzzedPlayer = null;
      gameState.buzzes = [];
      gameState.lockedOutPlayers = [];
      gameState.resultMessage = "";
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

function addAnsweredTracking(boardPack) {
  boardPack.jeopardy?.board?.forEach((category) => {
    category.questions?.forEach((question) => {
      question.answered = Boolean(question.answered);
    });
  });
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

function markCurrentClueAnswered() {
  const category = gameState.board.jeopardy?.board?.[gameState.currentClue.categoryIndex];
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
    category: gameState.currentClue.category,
    value: gameState.currentClue.value,
    clue: gameState.currentClue.clue
  };

  if (gameState.answerRevealed) {
    currentClue.answer = gameState.currentClue.answer;
  }

  return currentClue;
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
