const socket = io();

const roleScreen = document.getElementById("role-screen");
const waitingRoom = document.getElementById("waiting-room");
const gameScreen = document.getElementById("game-screen");
const questionScreen = document.getElementById("question-screen");

const hostBtn = document.getElementById("host-btn");
const playerBtn = document.getElementById("player-btn");
const spectatorBtn = document.getElementById("spectator-btn");

const changeRoleBtn = document.getElementById("change-role-btn");
const startGameBtn = document.getElementById("start-game-btn");

const hostControls = document.getElementById("host-controls");
const waitingMessage = document.getElementById("waiting-message");
const jeopardyBoard = document.getElementById("jeopardy-board");
const boardStatus = document.getElementById("board-status");
const scoreList = document.getElementById("score-list");
const questionCategory = document.getElementById("question-category");
const questionValue = document.getElementById("question-value");
const questionClue = document.getElementById("question-clue");
const questionAnswer = document.getElementById("question-answer");
const resultMessage = document.getElementById("result-message");
const buzzMessage = document.getElementById("buzz-message");
const buzzList = document.getElementById("buzz-list");
const lockedOutMessage = document.getElementById("locked-out-message");
const playerBuzzControls = document.getElementById("player-buzz-controls");
const buzzBtn = document.getElementById("buzz-btn");
const questionHostControls = document.getElementById("question-host-controls");
const correctBtn = document.getElementById("correct-btn");
const incorrectBtn = document.getElementById("incorrect-btn");
const revealAnswerBtn = document.getElementById("reveal-answer-btn");
const backToBoardBtn = document.getElementById("back-to-board-btn");

const welcomeText = document.getElementById("welcome-text");
const message = document.getElementById("message");

const hostList = document.getElementById("host-list");
const playerList = document.getElementById("player-list");
const spectatorList = document.getElementById("spectator-list");

let currentUser = null;
let currentState = null;

socket.on("connected", (user) => {
  currentUser = user;
});

socket.on("gameState", (state) => {
  currentState = state;

  updateRoleButtons(state);
  updateWaitingRoom(state);
  updateHostControls();
  renderBoard(state);
  renderScores(state);
  renderQuestion(state);
  updateScreen(state);
});

socket.on("roleConfirmed", (user) => {
  currentUser = user;

  welcomeText.textContent = `Welcome, ${capitalise(user.role)}!`;
  message.textContent = "";

  showScreen("waiting");
  updateHostControls();
});

socket.on("roleRejected", (reason) => {
  message.textContent = reason;
});

socket.on("actionRejected", (reason) => {
  alert(reason);
});

hostBtn.addEventListener("click", () => {
  socket.emit("chooseRole", "host");
});

playerBtn.addEventListener("click", () => {
  socket.emit("chooseRole", "player");
});

spectatorBtn.addEventListener("click", () => {
  socket.emit("chooseRole", "spectator");
});

changeRoleBtn.addEventListener("click", () => {
  showScreen("role");
});

startGameBtn.addEventListener("click", () => {
  socket.emit("startGame");
});

backToBoardBtn.addEventListener("click", () => {
  socket.emit("returnToBoard");
});

revealAnswerBtn.addEventListener("click", () => {
  socket.emit("revealAnswer");
});

buzzBtn.addEventListener("click", () => {
  socket.emit("buzz");
});

correctBtn.addEventListener("click", () => {
  socket.emit("markCorrect");
});

incorrectBtn.addEventListener("click", () => {
  socket.emit("markIncorrect");
});

function updateRoleButtons(state) {
  hostBtn.classList.toggle("hidden", !state.hostAvailable);
}

function updateWaitingRoom(state) {
  renderList(hostList, state.host ? [state.host] : [], "No host yet");
  renderList(playerList, state.players, "No players yet");
  renderList(spectatorList, state.spectators, "No spectators yet");
}

function updateHostControls() {
  const isHost = currentUser?.role === "host";

  hostControls.classList.toggle("hidden", !isHost);
  waitingMessage.classList.toggle("hidden", isHost);
}

function updateScreen(state) {
  if (!currentUser?.role) {
    showScreen("role");
    return;
  }

  if (state.phase === "waiting") {
    showScreen("waiting");
    return;
  }

  if (state.phase === "board") {
    showScreen("game");
    return;
  }

  if (state.phase === "question") {
    showScreen("question");
  }
}

function renderBoard(state) {
  jeopardyBoard.innerHTML = "";

  const categories = state.board?.jeopardy?.board;

  if (!categories?.length) {
    boardStatus.textContent = "No board loaded.";
    return;
  }

  const rows = Math.max(...categories.map((category) => category.questions.length));
  const isHost = currentUser?.role === "host";

  categories.forEach((category) => {
    const heading = document.createElement("div");
    heading.className = "board-category";
    heading.textContent = category.category;
    jeopardyBoard.appendChild(heading);
  });

  for (let questionIndex = 0; questionIndex < rows; questionIndex += 1) {
    categories.forEach((category, categoryIndex) => {
      const question = category.questions[questionIndex];
      const square = document.createElement("button");
      square.className = "clue-square";
      square.type = "button";

      if (!question) {
        square.classList.add("empty-square");
        square.disabled = true;
        square.setAttribute("aria-hidden", "true");
        jeopardyBoard.appendChild(square);
        return;
      }

      if (question.answered) {
        square.classList.add("used");
        square.textContent = "";
        square.disabled = true;
        square.setAttribute("aria-label", `${category.category} for ${question.value}, already used`);
        jeopardyBoard.appendChild(square);
        return;
      }

      square.textContent = `$${question.value}`;
      square.disabled = !isHost;
      square.setAttribute("aria-label", `${category.category} for ${question.value}`);

      if (isHost) {
        square.addEventListener("click", () => {
          socket.emit("selectClue", { categoryIndex, questionIndex });
        });
      }

      jeopardyBoard.appendChild(square);
    });
  }

  boardStatus.textContent = state.board.name || "Jeopardy Board";
}

function renderScores(state) {
  scoreList.innerHTML = "";

  if (!state.players.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "score-row empty-score";
    emptyItem.textContent = "No players yet";
    scoreList.appendChild(emptyItem);
    return;
  }

  state.players.forEach((player) => {
    const item = document.createElement("li");
    item.className = "score-row";

    const name = document.createElement("span");
    name.className = "score-name";
    name.textContent = player.name;

    const score = document.createElement("span");
    score.className = "score-value";
    score.textContent = formatScore(player.score);

    item.appendChild(name);
    item.appendChild(score);
    scoreList.appendChild(item);
  });
}

function renderQuestion(state) {
  const currentClue = state.currentClue;
  const isHost = currentUser?.role === "host";
  const isPlayer = currentUser?.role === "player";
  const playerHasBuzzed = state.buzzes?.some((buzz) => buzz.id === currentUser?.id);
  const playerIsLockedOut = state.lockedOutPlayers?.some((player) => player.id === currentUser?.id);
  const hasActiveBuzz = Boolean(state.buzzedPlayer) && !state.answerRevealed;
  const buzzingAvailable =
    state.phase === "question" &&
    !state.answerRevealed &&
    !playerHasBuzzed &&
    !playerIsLockedOut &&
    Boolean(currentClue);

  questionHostControls.classList.toggle("hidden", !isHost);
  playerBuzzControls.classList.toggle("hidden", !isPlayer);
  buzzBtn.disabled = !buzzingAvailable;
  correctBtn.disabled = !hasActiveBuzz;
  incorrectBtn.disabled = !hasActiveBuzz;

  if (!currentClue) {
    questionCategory.textContent = "";
    questionValue.textContent = "";
    questionClue.textContent = "";
    questionAnswer.textContent = "Answer hidden";
    questionAnswer.classList.add("answer-hidden");
    resultMessage.textContent = "";
    buzzMessage.textContent = "";
    buzzList.innerHTML = "";
    lockedOutMessage.textContent = "";
    revealAnswerBtn.disabled = false;
    return;
  }

  questionCategory.textContent = currentClue.category;
  questionValue.textContent = `$${currentClue.value}`;
  questionClue.textContent = currentClue.clue;

  if (state.answerRevealed) {
    questionAnswer.textContent = currentClue.answer || "";
    questionAnswer.classList.remove("answer-hidden");
  } else {
    questionAnswer.textContent = "Answer hidden";
    questionAnswer.classList.add("answer-hidden");
  }

  revealAnswerBtn.disabled = Boolean(state.answerRevealed);
  resultMessage.textContent = state.resultMessage || "";
  buzzMessage.textContent = state.buzzedPlayer
    ? `${state.buzzedPlayer.name} buzzed in!`
    : "";
  lockedOutMessage.textContent = state.lockedOutPlayers?.length
    ? `Locked out: ${state.lockedOutPlayers.map((player) => player.name).join(", ")}`
    : "";
  renderBuzzes(state.buzzes || []);
}

function renderBuzzes(buzzes) {
  buzzList.innerHTML = "";

  buzzes.forEach((buzz, index) => {
    const item = document.createElement("li");
    item.className = "buzz-result";
    item.textContent = index === 0
      ? `${buzz.name} buzzed first!`
      : `${buzz.name} was ${formatDelay(buzz.delayMs)} late`;
    buzzList.appendChild(item);
  });
}

function showScreen(screen) {
  roleScreen.classList.add("hidden");
  waitingRoom.classList.add("hidden");
  gameScreen.classList.add("hidden");
  questionScreen.classList.add("hidden");

  if (screen === "role") {
    roleScreen.classList.remove("hidden");
  }

  if (screen === "waiting") {
    waitingRoom.classList.remove("hidden");
  }

  if (screen === "game") {
    gameScreen.classList.remove("hidden");
  }

  if (screen === "question") {
    questionScreen.classList.remove("hidden");
  }
}

function renderList(element, users, emptyText) {
  element.innerHTML = "";

  if (users.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = emptyText;
    emptyItem.classList.add("empty");
    element.appendChild(emptyItem);
    return;
  }

  users.forEach((user) => {
    const item = document.createElement("li");
    item.textContent = user.name;
    element.appendChild(item);
  });
}

function capitalise(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatScore(score) {
  return `$${Number(score || 0).toLocaleString()}`;
}

function formatDelay(delayMs) {
  return `${(delayMs / 1000).toFixed(2)}s`;
}
