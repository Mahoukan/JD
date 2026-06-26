const socket = io();

const roleScreen = document.getElementById("role-screen");
const waitingRoom = document.getElementById("waiting-room");
const gameScreen = document.getElementById("game-screen");
const questionScreen = document.getElementById("question-screen");
const dailyDoubleScreen = document.getElementById("daily-double-screen");
const finalJeopardyScreen = document.getElementById("final-jeopardy-screen");

const hostBtn = document.getElementById("host-btn");
const playerBtn = document.getElementById("player-btn");
const spectatorBtn = document.getElementById("spectator-btn");

const changeRoleBtn = document.getElementById("change-role-btn");
const startGameBtn = document.getElementById("start-game-btn");

const hostControls = document.getElementById("host-controls");
const waitingMessage = document.getElementById("waiting-message");
const boardSelectorPanel = document.getElementById("board-selector-panel");
const boardSelect = document.getElementById("board-select");
const selectedBoardName = document.getElementById("selected-board-name");
const jeopardyBoard = document.getElementById("jeopardy-board");
const roundStatus = document.getElementById("round-status");
const boardStatus = document.getElementById("board-status");
const resetBoardBtn = document.getElementById("reset-board-btn");
const startDoubleJeopardyBtn = document.getElementById(
  "start-double-jeopardy-btn",
);
const startFinalJeopardyBtn = document.getElementById(
  "start-final-jeopardy-btn",
);
const scoreList = document.getElementById("score-list");
const scoreEditModal = document.getElementById("score-edit-modal");
const scoreEditForm = document.getElementById("score-edit-form");
const scoreEditPlayerName = document.getElementById("score-edit-player-name");
const scoreEditInput = document.getElementById("score-edit-input");
const scoreEditError = document.getElementById("score-edit-error");
const scoreEditCancelBtn = document.getElementById("score-edit-cancel-btn");
const scoreEditSaveBtn = document.getElementById("score-edit-save-btn");
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const confirmConfirmBtn = document.getElementById("confirm-confirm-btn");
const toastContainer = document.getElementById("toast-container");
const questionCategory = document.getElementById("question-category");
const questionValue = document.getElementById("question-value");
const questionClue = document.getElementById("question-clue");
const timerPanel = document.getElementById("timer-panel");
const timerLabel = document.getElementById("timer-label");
const timerValue = document.getElementById("timer-value");
const timerStatus = document.getElementById("timer-status");
const buzzingStatus = document.getElementById("buzzing-status");
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
const timerControls = document.getElementById("timer-controls");
const pauseTimerBtn = document.getElementById("pause-timer-btn");
const resumeTimerBtn = document.getElementById("resume-timer-btn");
const addTimeBtn = document.getElementById("add-time-btn");
const revealAnswerBtn = document.getElementById("reveal-answer-btn");
const backToBoardBtn = document.getElementById("back-to-board-btn");
const dailyDoubleDetail = document.getElementById("daily-double-detail");
const dailyDoublePlayerPanel = document.getElementById(
  "daily-double-player-panel",
);
const dailyDoublePlayerSelect = document.getElementById(
  "daily-double-player-select",
);
const dailyDoublePlayerBtn = document.getElementById("daily-double-player-btn");
const dailyDoubleWagerForm = document.getElementById("daily-double-wager-form");
const dailyDoubleWagerInput = document.getElementById(
  "daily-double-wager-input",
);
const dailyDoubleWagerError = document.getElementById(
  "daily-double-wager-error",
);
const dailyDoubleWagerBtn = document.getElementById("daily-double-wager-btn");
const dailyDoubleWaiting = document.getElementById("daily-double-waiting");
const finalCategory = document.getElementById("final-category");
const finalClue = document.getElementById("final-clue");
const finalStatus = document.getElementById("final-status");
const finalWagerForm = document.getElementById("final-wager-form");
const finalWagerInput = document.getElementById("final-wager-input");
const finalWagerError = document.getElementById("final-wager-error");
const finalWagerBtn = document.getElementById("final-wager-btn");
const finalAnswerForm = document.getElementById("final-answer-form");
const finalAnswerInput = document.getElementById("final-answer-input");
const finalAnswerError = document.getElementById("final-answer-error");
const finalAnswerBtn = document.getElementById("final-answer-btn");
const finalHostPanel = document.getElementById("final-host-panel");
const finalStatusList = document.getElementById("final-status-list");
const revealFinalClueBtn = document.getElementById("reveal-final-clue-btn");
const startFinalReviewBtn = document.getElementById("start-final-review-btn");
const showFinalResultsBtn = document.getElementById("show-final-results-btn");
const finalReviewPanel = document.getElementById("final-review-panel");
const finalRankings = document.getElementById("final-rankings");

const welcomeText = document.getElementById("welcome-text");
const message = document.getElementById("message");

const hostList = document.getElementById("host-list");
const playerList = document.getElementById("player-list");
const spectatorList = document.getElementById("spectator-list");

let currentUser = null;
let currentState = null;
let activeScoreEditPlayerId = null;
let pendingScoreEdit = null;
let discordIdentityInitialised = false;
let discordIdentityEmitted = false;
let discordIdentityGameStateLogged = false;
let pendingConfirmAction = null;
let resetBoardConfirmTimeout = null;

async function initialiseDiscordIdentity() {
  const isDiscordActivity = isLikelyDiscordActivity();
  console.log("Discord identity: activity detection", {
    isDiscordActivity,
    referrer: document.referrer,
    search: window.location.search,
    inIframe: window.parent !== window,
  });

  if (discordIdentityInitialised) {
    console.log("Discord identity: already initialized");
    return;
  }

  if (!isDiscordActivity) {
    console.log(
      "Discord identity: not running inside Discord, using guest identity",
    );
    return;
  }

  discordIdentityInitialised = true;

  try {
    const config = await fetch("/api/discord/config").then((response) =>
      response.json(),
    );
    console.log("Discord identity: config loaded", {
      hasClientId: Boolean(config.clientId),
    });

    if (!config.clientId) {
      console.warn(
        "Discord identity: DISCORD_CLIENT_ID missing, using guest identity",
      );
      return;
    }

    const DiscordSDK = await loadDiscordSdk();
    console.log("Discord identity: SDK initialized");
    const discordSdk = new DiscordSDK(config.clientId);
    console.log("Discord identity: SDK created");
    await discordSdk.ready();
    console.log("Discord identity: SDK ready");
    const instanceId = discordSdk.instanceId || "";
    console.log("Discord activity: instanceId", instanceId || "(missing)");
    socket.emit("setGameInstance", {
      instanceId,
    });

    const authCode = await getDiscordAuthCode(discordSdk, config.clientId);

    if (!authCode) {
      console.warn("Discord identity: authorize did not return a code");
      return;
    }
    console.log("Discord identity: authorize succeeded");
    console.log("Discord identity: authorization code received");

    const tokenResponse = await fetch("/api/discord/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: authCode,
      }),
    });

    if (!tokenResponse.ok) {
      console.warn(
        "Discord identity: token exchange failed",
        tokenResponse.status,
      );
      return;
    }

    const tokenData = await tokenResponse.json();
    console.log("Discord identity: access token received", {
      hasAccessToken: Boolean(tokenData.access_token),
    });
    console.log("Discord identity: token exchange success");
    const auth = await discordSdk.commands.authenticate({
      access_token: tokenData.access_token,
    });
    console.log("Discord identity: authentication success", {
      hasUser: Boolean(auth?.user),
      username: auth?.user?.username || "",
      discordUserId: auth?.user?.id || "",
    });
    const user = auth?.user;

    if (!user) {
      console.warn(
        "Discord identity: authenticated response did not include a user",
      );
      return;
    }

    console.log("Discord identity: retrieved Discord user", {
      id: user.id,
      username: user.username,
      globalName: user.global_name,
      discriminator: user.discriminator,
      hasAvatar: Boolean(user.avatar),
    });
    console.log(
      "Discord identity: authenticated username",
      getDiscordDisplayName(user),
    );
    console.log("Discord identity: authenticated Discord ID", user.id);

    if (discordIdentityEmitted) {
      console.log("Discord identity: setUserIdentity already emitted");
      return;
    }

    const identityPayload = {
      name: getDiscordDisplayName(user),
      avatarUrl: getDiscordAvatarUrl(user),
      discordUserId: user.id,
    };
    socket.emit("setUserIdentity", identityPayload);
    discordIdentityEmitted = true;
    console.log("Discord identity: emitted setUserIdentity", {
      name: identityPayload.name,
      hasAvatarUrl: Boolean(identityPayload.avatarUrl),
      discordUserId: identityPayload.discordUserId,
    });

    try {
      const participants =
        await discordSdk.commands.getInstanceConnectedParticipants();
      console.log("Discord activity: participants retrieved", participants);
      console.log("Discord activity: connected participants", participants);
    } catch (participantsError) {
      console.warn(
        "Discord activity: connected participants unavailable",
        participantsError,
      );
    }
  } catch (error) {
    console.warn(
      "Discord identity: authentication failure, using guest identity.",
      error,
    );
  }
}

function isLikelyDiscordActivity() {
  const params = new URLSearchParams(window.location.search);
  const discordParamNames = [
    "frame_id",
    "instance_id",
    "guild_id",
    "channel_id",
    "platform",
    "activity_id",
  ];
  return (
    document.referrer.includes("discord.com") ||
    discordParamNames.some((paramName) => params.has(paramName)) ||
    window.parent !== window
  );
}

function loadDiscordSdk() {
  console.log("Discord identity: loading bundled SDK");

  if (!window.DiscordSDK) {
    throw new Error("Discord Embedded App SDK bundle was not loaded.");
  }

  return window.DiscordSDK;
}

async function getDiscordAuthCode(discordSdk, clientId) {
  console.log("Discord identity: requesting authorization");
  const authorizePayload = {
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  };
  console.log("Discord identity: authorize payload", authorizePayload);
  const response = await discordSdk.commands.authorize(authorizePayload);
  return response?.code || "";
}

function getDiscordAvatarUrl(user) {
  if (!user?.id) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  if (!user.avatar) {
    return getDiscordDefaultAvatarUrl(user);
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

function getDiscordDisplayName(user) {
  if (user.global_name) {
    return user.global_name;
  }

  if (user.username && user.discriminator && user.discriminator !== "0") {
    return `${user.username}#${user.discriminator}`;
  }

  return user.username || "Discord Player";
}

function getDiscordDefaultAvatarUrl(user) {
  const discriminator = Number(user.discriminator);

  if (Number.isInteger(discriminator) && discriminator > 0) {
    return `https://cdn.discordapp.com/embed/avatars/${discriminator % 5}.png`;
  }

  try {
    return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(user.id) >> 22n) % 6n)}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

function showToast(messageText, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = messageText;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-exiting");
    toast.addEventListener(
      "transitionend",
      () => {
        toast.remove();
      },
      { once: true },
    );
  }, 3500);
}

function showConfirm({
  title,
  message: modalMessage,
  confirmText = "Confirm",
  onConfirm,
}) {
  pendingConfirmAction = typeof onConfirm === "function" ? onConfirm : null;
  confirmTitle.textContent = title || "Confirm";
  confirmMessage.textContent = modalMessage || "";
  confirmConfirmBtn.textContent = confirmText;
  confirmModal.classList.remove("hidden");
  confirmCancelBtn.focus();
}

function closeConfirm() {
  pendingConfirmAction = null;
  confirmModal.classList.add("hidden");
}

function clearResetBoardConfirm() {
  if (resetBoardConfirmTimeout) {
    clearTimeout(resetBoardConfirmTimeout);
    resetBoardConfirmTimeout = null;
  }

  resetBoardBtn.textContent = "Reset Board";
  resetBoardBtn.classList.remove("warning-button");
}

function logDiscordIdentityGameState(state) {
  if (discordIdentityGameStateLogged || !currentUser?.discordUserId) {
    return;
  }

  const visibleUser = findGameStateUserByDiscordId(
    state,
    currentUser.discordUserId,
  );

  if (!visibleUser) {
    return;
  }

  discordIdentityGameStateLogged = true;
  console.log("Discord identity: gameState contains identity", {
    role: visibleUser.role,
    name: visibleUser.user.name,
    hasAvatarUrl: Boolean(visibleUser.user.avatarUrl),
    discordUserId: visibleUser.user.discordUserId,
  });
}

function findGameStateUserByDiscordId(state, discordUserId) {
  if (state.host?.discordUserId === discordUserId) {
    return {
      role: "host",
      user: state.host,
    };
  }

  const player = state.players.find(
    (currentPlayer) => currentPlayer.discordUserId === discordUserId,
  );

  if (player) {
    return {
      role: "player",
      user: player,
    };
  }

  const spectator = state.spectators.find(
    (currentSpectator) => currentSpectator.discordUserId === discordUserId,
  );

  if (spectator) {
    return {
      role: "spectator",
      user: spectator,
    };
  }

  return null;
}

socket.on("connected", (user) => {
  currentUser = user;
  initialiseDiscordIdentity();
});

socket.on("gameInstanceConfirmed", ({ gameId } = {}) => {
  console.log("Discord activity: game instance confirmed", {
    gameId: gameId || "development",
  });
});

socket.on("gameState", (state) => {
  currentState = state;
  logDiscordIdentityGameState(state);

  updateRoleButtons(state);
  updateWaitingRoom(state);
  updateHostControls();
  renderBoard(state);
  renderScores(state);
  renderQuestion(state);
  renderDailyDouble(state);
  renderFinalJeopardy(state);
  updateScoreEditModal(state);
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
  showToast(reason, "error");
});

socket.on("actionRejected", (reason) => {
  showToast(reason, "error");
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

socket.on("identityUpdated", (user) => {
  currentUser = {
    ...currentUser,
    ...user,
  };
  console.log("Discord identity: identityUpdated received", {
    name: currentUser.name,
    hasAvatarUrl: Boolean(currentUser.avatarUrl),
    discordUserId: currentUser.discordUserId,
    role: currentUser.role,
  });
});

boardSelect.addEventListener("change", () => {
  socket.emit("selectBoard", {
    filename: boardSelect.value,
  });
});

resetBoardBtn.addEventListener("click", () => {
  if (resetBoardConfirmTimeout) {
    socket.emit("resetBoard");
    clearResetBoardConfirm();
    return;
  }

  resetBoardBtn.textContent = "Click Again to Confirm";
  resetBoardBtn.classList.add("warning-button");
  showToast("Click Reset Board again to confirm.", "error");
  resetBoardConfirmTimeout = setTimeout(clearResetBoardConfirm, 4000);
});

startDoubleJeopardyBtn.addEventListener("click", () => {
  socket.emit("startDoubleJeopardy");
});

startFinalJeopardyBtn.addEventListener("click", () => {
  socket.emit("startFinalJeopardy");
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

pauseTimerBtn.addEventListener("click", () => {
  socket.emit("pauseTimer");
});

resumeTimerBtn.addEventListener("click", () => {
  socket.emit("resumeTimer");
});

addTimeBtn.addEventListener("click", () => {
  socket.emit("addTimerTime", 5000);
});

dailyDoublePlayerBtn.addEventListener("click", () => {
  socket.emit("selectDailyDoublePlayer", {
    playerId: dailyDoublePlayerSelect.value,
  });
});

dailyDoubleWagerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitDailyDoubleWager();
});

finalWagerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitFinalWager();
});

finalAnswerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitFinalAnswer();
});

revealFinalClueBtn.addEventListener("click", () => {
  socket.emit("revealFinalClue");
});

startFinalReviewBtn.addEventListener("click", () => {
  socket.emit("startFinalReview");
});

showFinalResultsBtn.addEventListener("click", () => {
  socket.emit("showFinalResults");
});

scoreEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveScoreEdit();
});

scoreEditCancelBtn.addEventListener("click", () => {
  closeScoreEditModal();
});

scoreEditModal.addEventListener("click", (event) => {
  if (event.target === scoreEditModal) {
    closeScoreEditModal();
  }
});

confirmCancelBtn.addEventListener("click", () => {
  closeConfirm();
});

confirmConfirmBtn.addEventListener("click", () => {
  const action = pendingConfirmAction;
  closeConfirm();

  if (action) {
    action();
  }
});

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirm();
  }
});

function updateRoleButtons(state) {
  hostBtn.classList.toggle("hidden", !state.hostAvailable);
}

function updateWaitingRoom(state) {
  renderList(hostList, state.host ? [state.host] : [], "No host yet");
  renderList(playerList, state.players, "No players yet");
  renderList(spectatorList, state.spectators, "No spectators yet");
  renderBoardSelection(state);
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
    return;
  }

  if (
    state.phase === "dailyDoublePlayerSelect" ||
    state.phase === "dailyDoubleWager"
  ) {
    showScreen("dailyDouble");
    return;
  }

  if (state.phase === "dailyDoubleQuestion") {
    showScreen("question");
    return;
  }

  if (isFinalJeopardyPhase(state.phase)) {
    showScreen("finalJeopardy");
  }
}

function renderBoardSelection(state) {
  const isHost = currentUser?.role === "host";
  const boards = state.availableBoards || [];
  const selectedBoard = getSelectedBoard(state);

  boardSelectorPanel.classList.toggle("hidden", !isHost);
  selectedBoardName.textContent = `Selected board: ${selectedBoard?.name || "None"}`;

  if (!isHost) {
    return;
  }

  boardSelect.innerHTML = "";
  boardSelect.disabled = boards.length === 0;

  if (boards.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No boards available";
    boardSelect.appendChild(option);
    return;
  }

  boards.forEach((board) => {
    const option = document.createElement("option");
    option.value = board.filename;
    option.textContent = board.name;
    option.selected = board.filename === state.selectedBoardFilename;
    boardSelect.appendChild(option);
  });
}

function getSelectedBoard(state) {
  return (
    state.availableBoards?.find(
      (board) => board.filename === state.selectedBoardFilename,
    ) ||
    (state.board
      ? {
          name: state.board.name || "Jeopardy Board",
          filename: state.selectedBoardFilename,
        }
      : null)
  );
}

function renderBoard(state) {
  jeopardyBoard.innerHTML = "";

  const categories = getCurrentRoundCategories(state);
  const isHost = currentUser?.role === "host";
  const canStartDoubleJeopardy =
    isHost &&
    state.phase === "board" &&
    state.currentRound === "jeopardy" &&
    hasDoubleJeopardyBoard(state);
  const canStartFinalJeopardy =
    isHost &&
    state.phase === "board" &&
    state.currentRound === "doubleJeopardy" &&
    Boolean(state.board?.finalJeopardy);

  resetBoardBtn.classList.toggle("hidden", !isHost || state.phase !== "board");
  startDoubleJeopardyBtn.classList.toggle("hidden", !canStartDoubleJeopardy);
  startFinalJeopardyBtn.classList.toggle("hidden", !canStartFinalJeopardy);

  if (!isHost || state.phase !== "board") {
    clearResetBoardConfirm();
  }

  roundStatus.textContent = getRoundName(state.currentRound);

  if (!categories?.length) {
    boardStatus.textContent = `No ${getRoundName(state.currentRound)} board loaded.`;
    return;
  }

  const rows = Math.max(
    ...categories.map((category) => category.questions.length),
  );

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
        square.setAttribute(
          "aria-label",
          `${category.category} for ${question.value}, already used`,
        );
        jeopardyBoard.appendChild(square);
        return;
      }

      square.textContent = `$${question.value}`;
      square.disabled = !isHost;
      square.setAttribute(
        "aria-label",
        `${category.category} for ${question.value}`,
      );

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

function getCurrentRoundCategories(state) {
  return state.board?.[state.currentRound || "jeopardy"]?.board || [];
}

function hasDoubleJeopardyBoard(state) {
  return (
    Array.isArray(state.board?.doubleJeopardy?.board) &&
    state.board.doubleJeopardy.board.length > 0
  );
}

function getRoundName(round) {
  return round === "doubleJeopardy" ? "Double Jeopardy" : "Jeopardy";
}

function renderScores(state) {
  scoreList.innerHTML = "";
  const isHost = currentUser?.role === "host";

  if (!state.players.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "score-row empty-score";
    emptyItem.textContent = "No players yet";
    scoreList.appendChild(emptyItem);
    return;
  }

  state.players.forEach((player) => {
    const item = document.createElement("li");
    item.className = isHost ? "score-row editable-score-row" : "score-row";

    const name = document.createElement("span");
    name.className = "score-name user-identity";
    name.appendChild(createUserAvatar(player));
    name.appendChild(createUserName(player));

    const score = document.createElement("span");
    score.className = "score-value";
    score.textContent = formatScore(player.score);

    item.appendChild(name);
    item.appendChild(score);

    if (isHost) {
      const editButton = document.createElement("button");
      editButton.className = "score-edit-button";
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.setAttribute("aria-label", `Edit ${player.name}'s score`);
      editButton.addEventListener("click", () => {
        openScoreEditModal(player);
      });
      item.appendChild(editButton);
    }

    scoreList.appendChild(item);
  });
}

function openScoreEditModal(player) {
  activeScoreEditPlayerId = player.id;
  pendingScoreEdit = null;
  scoreEditPlayerName.textContent = player.name;
  scoreEditInput.value = String(Math.round(Number(player.score || 0)));
  scoreEditError.textContent = "";
  scoreEditSaveBtn.disabled = false;
  scoreEditModal.classList.remove("hidden");
  scoreEditInput.focus();
  scoreEditInput.select();
}

function closeScoreEditModal() {
  activeScoreEditPlayerId = null;
  pendingScoreEdit = null;
  scoreEditError.textContent = "";
  scoreEditSaveBtn.disabled = false;
  scoreEditModal.classList.add("hidden");
}

function saveScoreEdit() {
  if (!activeScoreEditPlayerId) {
    return;
  }

  const trimmedInput = scoreEditInput.value.trim();
  const parsedScore = Number(trimmedInput);

  if (trimmedInput === "" || !Number.isFinite(parsedScore)) {
    scoreEditError.textContent = "Enter a valid number.";
    return;
  }

  const roundedScore = Math.round(parsedScore);
  pendingScoreEdit = {
    playerId: activeScoreEditPlayerId,
    score: roundedScore,
  };
  scoreEditError.textContent = "";
  scoreEditSaveBtn.disabled = true;
  socket.emit("editPlayerScore", {
    playerId: activeScoreEditPlayerId,
    newScore: roundedScore,
  });
}

function updateScoreEditModal(state) {
  if (!activeScoreEditPlayerId) {
    return;
  }

  const player = state.players.find(
    (currentPlayer) => currentPlayer.id === activeScoreEditPlayerId,
  );

  if (!player || currentUser?.role !== "host") {
    closeScoreEditModal();
    return;
  }

  scoreEditPlayerName.textContent = player.name;

  if (
    pendingScoreEdit &&
    player.id === pendingScoreEdit.playerId &&
    player.score === pendingScoreEdit.score
  ) {
    closeScoreEditModal();
  }
}

function renderQuestion(state) {
  const currentClue = state.currentClue;
  const isHost = currentUser?.role === "host";
  const isPlayer = currentUser?.role === "player";
  const isDailyDoubleQuestion = state.phase === "dailyDoubleQuestion";
  const playerHasBuzzed = state.buzzes?.some(
    (buzz) => buzz.id === currentUser?.id,
  );
  const playerIsLockedOut = state.lockedOutPlayers?.some(
    (player) => player.id === currentUser?.id,
  );
  const hasActiveBuzz = isDailyDoubleQuestion
    ? Boolean(state.dailyDouble?.submitted) && !state.dailyDouble?.judged
    : Boolean(state.buzzedPlayer) && !state.answerRevealed;
  const buzzingAvailable =
    state.phase === "question" &&
    isPlayer &&
    state.buzzingOpen &&
    !state.answerRevealed &&
    !playerHasBuzzed &&
    !playerIsLockedOut &&
    Boolean(currentClue);

  questionHostControls.classList.toggle("hidden", !isHost);
  playerBuzzControls.classList.toggle(
    "hidden",
    !isPlayer || isDailyDoubleQuestion,
  );
  buzzBtn.disabled = !buzzingAvailable;
  correctBtn.disabled = !hasActiveBuzz;
  incorrectBtn.disabled = !hasActiveBuzz;
  renderTimer(state);

  if (!currentClue) {
    questionCategory.textContent = "";
    questionValue.textContent = "";
    questionClue.textContent = "";
    buzzingStatus.textContent = "";
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
  renderBuzzMessage(state, isDailyDoubleQuestion);
  buzzingStatus.textContent = isDailyDoubleQuestion
    ? "No buzzing for Daily Double."
    : getBuzzingStatus(state);
  lockedOutMessage.textContent = state.lockedOutPlayers?.length
    ? `Locked out: ${state.lockedOutPlayers.map((player) => player.name).join(", ")}`
    : "";
  renderBuzzes(
    state.buzzes || [],
    state.buzzedPlayer,
    state.lockedOutPlayers || [],
  );
}

function renderDailyDouble(state) {
  const dailyDouble = state.dailyDouble || {};
  const isHost = currentUser?.role === "host";
  const isSelectedPlayer = dailyDouble.playerId === currentUser?.id;

  dailyDoublePlayerPanel.classList.toggle(
    "hidden",
    !isHost || state.phase !== "dailyDoublePlayerSelect",
  );
  dailyDoubleWagerForm.classList.toggle(
    "hidden",
    !isSelectedPlayer || state.phase !== "dailyDoubleWager",
  );
  dailyDoubleWaiting.textContent = "";

  if (state.phase === "dailyDoublePlayerSelect") {
    dailyDoubleDetail.textContent =
      "Choose the player who found the Daily Double.";
    renderDailyDoublePlayerOptions(state.players || []);

    if (!isHost) {
      dailyDoubleWaiting.textContent =
        "Waiting for the host to choose a player.";
    }
    return;
  }

  if (state.phase === "dailyDoubleWager") {
    dailyDoubleDetail.textContent = `${dailyDouble.playerName} will wager up to ${formatScore(dailyDouble.maxWager)}.`;
    dailyDoubleWagerInput.max = String(dailyDouble.maxWager || 0);
    dailyDoubleWagerError.textContent = "";
    dailyDoubleWagerBtn.disabled = false;

    if (isSelectedPlayer) {
      dailyDoubleWagerInput.value = "";
      dailyDoubleWagerInput.focus();
    } else {
      dailyDoubleWaiting.textContent = `Waiting for ${dailyDouble.playerName || "the selected player"} to submit a wager.`;
    }
  }
}

function renderDailyDoublePlayerOptions(players) {
  dailyDoublePlayerSelect.innerHTML = "";
  dailyDoublePlayerBtn.disabled = players.length === 0;

  if (players.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No players available";
    dailyDoublePlayerSelect.appendChild(option);
    return;
  }

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `${player.name} (${formatScore(player.score)})`;
    dailyDoublePlayerSelect.appendChild(option);
  });
}

function submitDailyDoubleWager() {
  const maxWager = Number(currentState?.dailyDouble?.maxWager || 0);
  const trimmedInput = dailyDoubleWagerInput.value.trim();
  const parsedWager = Number(trimmedInput);

  if (
    trimmedInput === "" ||
    !Number.isFinite(parsedWager) ||
    !Number.isInteger(parsedWager)
  ) {
    dailyDoubleWagerError.textContent = "Enter a whole number.";
    return;
  }

  if (parsedWager < 0) {
    dailyDoubleWagerError.textContent = "Wager cannot be negative.";
    return;
  }

  if (parsedWager > maxWager) {
    dailyDoubleWagerError.textContent = `Maximum wager is ${formatScore(maxWager)}.`;
    return;
  }

  dailyDoubleWagerError.textContent = "";
  dailyDoubleWagerBtn.disabled = true;
  socket.emit("submitDailyDoubleWager", {
    wager: parsedWager,
  });
}

function getDailyDoubleQuestionMessage(state) {
  const dailyDouble = state.dailyDouble || {};

  if (!dailyDouble.playerName) {
    return "";
  }

  return `${dailyDouble.playerName} wagered ${formatScore(dailyDouble.wager)}.`;
}

function renderBuzzMessage(state, isDailyDoubleQuestion) {
  buzzMessage.innerHTML = "";

  if (isDailyDoubleQuestion) {
    buzzMessage.textContent = getDailyDoubleQuestionMessage(state);
    return;
  }

  if (!state.buzzedPlayer) {
    return;
  }

  buzzMessage.appendChild(document.createTextNode("Current answering: "));
  buzzMessage.appendChild(createUserIdentity(state.buzzedPlayer));
}

function renderFinalJeopardy(state) {
  const finalState = state.finalJeopardyState || {};
  const finalClueData = state.board?.finalJeopardy || {};
  const eligiblePlayerIds = finalState.eligiblePlayerIds || [];
  const currentPlayer = state.players.find(
    (player) => player.id === currentUser?.id,
  );
  const isHost = currentUser?.role === "host";
  const isEligible = eligiblePlayerIds.includes(currentUser?.id);

  finalCategory.textContent = finalClueData.category
    ? `Category: ${finalClueData.category}`
    : "Category unavailable";
  finalClue.textContent = finalClueData.clue || "";
  finalClue.classList.toggle(
    "hidden",
    !["finalAnswers", "finalReview", "finalResults"].includes(state.phase),
  );
  finalHostPanel.classList.toggle(
    "hidden",
    !isHost || !isFinalJeopardyPhase(state.phase),
  );
  finalReviewPanel.classList.toggle("hidden", state.phase !== "finalReview");
  finalRankings.classList.toggle("hidden", state.phase !== "finalResults");

  finalWagerForm.classList.toggle(
    "hidden",
    !(state.phase === "finalWager" && isEligible),
  );
  finalAnswerForm.classList.toggle(
    "hidden",
    !(state.phase === "finalAnswers" && isEligible),
  );
  revealFinalClueBtn.classList.toggle(
    "hidden",
    !(isHost && state.phase === "finalWager"),
  );
  startFinalReviewBtn.classList.toggle(
    "hidden",
    !(isHost && state.phase === "finalAnswers"),
  );
  showFinalResultsBtn.classList.toggle(
    "hidden",
    !(isHost && state.phase === "finalReview" && allFinalJudged(state)),
  );

  if (state.phase === "finalWager" && isEligible && currentPlayer) {
    finalWagerInput.max = String(currentPlayer.score);
  }

  if (
    state.phase === "finalWager" &&
    !isEligible &&
    currentUser?.role === "player"
  ) {
    finalStatus.textContent = "You are not eligible for Final Jeopardy.";
  } else if (state.phase === "finalWager") {
    finalStatus.textContent = "Eligible players are submitting wagers.";
  } else if (state.phase === "finalAnswers") {
    finalStatus.textContent = isEligible
      ? "Submit your answer."
      : "Eligible players are submitting answers.";
  } else if (state.phase === "finalReview") {
    finalStatus.textContent = "Host is reviewing Final Jeopardy answers.";
  } else if (state.phase === "finalResults") {
    finalStatus.textContent = "Final rankings";
  } else {
    finalStatus.textContent = "";
  }

  renderFinalStatusList(state);
  renderFinalReview(state);
  renderFinalRankings(state);
}

function submitFinalWager() {
  const currentPlayer = currentState?.players.find(
    (player) => player.id === currentUser?.id,
  );
  const trimmedInput = finalWagerInput.value.trim();
  const parsedWager = Number(trimmedInput);

  if (
    !currentPlayer ||
    trimmedInput === "" ||
    !Number.isFinite(parsedWager) ||
    !Number.isInteger(parsedWager)
  ) {
    finalWagerError.textContent = "Enter a whole number.";
    return;
  }

  if (parsedWager < 0 || parsedWager > currentPlayer.score) {
    finalWagerError.textContent = `Wager must be between $0 and ${formatScore(currentPlayer.score)}.`;
    return;
  }

  finalWagerError.textContent = "";
  finalWagerBtn.disabled = true;
  socket.emit("submitFinalWager", {
    wager: parsedWager,
  });
  setTimeout(() => {
    finalWagerBtn.disabled = false;
  }, 250);
}

function submitFinalAnswer() {
  const trimmedAnswer = finalAnswerInput.value.trim();

  if (!trimmedAnswer) {
    finalAnswerError.textContent = "Enter an answer.";
    return;
  }

  finalAnswerError.textContent = "";
  finalAnswerBtn.disabled = true;
  socket.emit("submitFinalAnswer", {
    answer: trimmedAnswer,
  });
  setTimeout(() => {
    finalAnswerBtn.disabled = false;
  }, 250);
}

function renderFinalStatusList(state) {
  finalStatusList.innerHTML = "";

  if (currentUser?.role !== "host" || !isFinalJeopardyPhase(state.phase)) {
    return;
  }

  const finalState = state.finalJeopardyState || {};
  const eligiblePlayerIds = finalState.eligiblePlayerIds || [];

  state.players.forEach((player) => {
    const item = document.createElement("li");
    const isEligible = eligiblePlayerIds.includes(player.id);
    const wagerSubmitted = Boolean(finalState.wagerStatuses?.[player.id]);
    const answerSubmitted = Boolean(finalState.answerStatuses?.[player.id]);
    const judgement = finalState.judged?.[player.id];

    if (!isEligible) {
      item.textContent = `${player.name}: ineligible`;
    } else if (state.phase === "finalWager") {
      item.textContent = `${player.name}: ${wagerSubmitted ? "wager submitted" : "waiting"}`;
    } else if (state.phase === "finalAnswers") {
      item.textContent = `${player.name}: ${answerSubmitted ? "answer submitted" : "waiting"}`;
    } else {
      item.textContent = `${player.name}: ${judgement || "unjudged"}`;
    }

    finalStatusList.appendChild(item);
  });
}

function renderFinalReview(state) {
  finalReviewPanel.innerHTML = "";

  if (state.phase !== "finalReview") {
    return;
  }

  const finalState = state.finalJeopardyState || {};
  const eligiblePlayerIds = finalState.eligiblePlayerIds || [];
  const isHost = currentUser?.role === "host";

  eligiblePlayerIds.forEach((playerId) => {
    const player = state.players.find(
      (currentPlayer) => currentPlayer.id === playerId,
    );

    if (!player) {
      return;
    }

    const row = document.createElement("div");
    row.className = "final-review-row";

    const name = document.createElement("h3");
    name.appendChild(createUserIdentity(player));
    row.appendChild(name);

    const revealed = finalState.revealedPlayerIds?.includes(playerId);
    const answer = document.createElement("p");
    answer.className = "final-revealed-answer";
    answer.textContent = revealed
      ? finalState.revealedAnswers?.[playerId] || ""
      : "Answer hidden";
    row.appendChild(answer);

    const judgement = finalState.judged?.[playerId];
    const status = document.createElement("p");
    status.className = "final-review-status";
    status.textContent = judgement ? `Judged ${judgement}` : "Not judged";
    row.appendChild(status);

    if (isHost && !revealed) {
      const revealButton = document.createElement("button");
      revealButton.className = "secondary-button";
      revealButton.type = "button";
      revealButton.textContent = "Reveal Answer";
      revealButton.addEventListener("click", () => {
        socket.emit("revealFinalAnswerForPlayer", { playerId });
      });
      row.appendChild(revealButton);
    }

    if (isHost && revealed && !judgement) {
      const controls = document.createElement("div");
      controls.className = "judge-controls";

      const correctButton = document.createElement("button");
      correctButton.className = "judge-button correct-button";
      correctButton.type = "button";
      correctButton.textContent = "Correct";
      correctButton.addEventListener("click", () => {
        socket.emit("judgeFinalAnswer", { playerId, result: "correct" });
      });

      const incorrectButton = document.createElement("button");
      incorrectButton.className = "judge-button incorrect-button";
      incorrectButton.type = "button";
      incorrectButton.textContent = "Incorrect";
      incorrectButton.addEventListener("click", () => {
        socket.emit("judgeFinalAnswer", { playerId, result: "incorrect" });
      });

      controls.appendChild(correctButton);
      controls.appendChild(incorrectButton);
      row.appendChild(controls);
    }

    finalReviewPanel.appendChild(row);
  });
}

function renderFinalRankings(state) {
  finalRankings.innerHTML = "";

  if (state.phase !== "finalResults") {
    return;
  }

  const rankings = [...state.players].sort(
    (first, second) => second.score - first.score,
  );
  const winningScore = rankings[0]?.score;

  rankings.forEach((player, index) => {
    const item = document.createElement("li");
    item.className = "final-ranking-row";
    item.classList.toggle("winner", player.score === winningScore);
    const place = document.createElement("span");
    place.className = "final-ranking-place";
    place.textContent = `${index + 1}.`;

    const score = document.createElement("span");
    score.className = "final-ranking-score";
    score.textContent = formatScore(player.score);

    item.appendChild(place);
    item.appendChild(createUserIdentity(player));
    item.appendChild(score);
    finalRankings.appendChild(item);
  });
}

function isFinalJeopardyPhase(phase) {
  return [
    "finalCategory",
    "finalWager",
    "finalClue",
    "finalAnswers",
    "finalReview",
    "finalResults",
  ].includes(phase);
}

function allFinalJudged(state) {
  const finalState = state.finalJeopardyState || {};
  return (finalState.eligiblePlayerIds || []).every((playerId) =>
    Boolean(finalState.judged?.[playerId]),
  );
}

function renderTimer(state) {
  const timer = state.timer;
  const hasTimer = Boolean(timer?.type);
  const isHost = currentUser?.role === "host";

  timerPanel.classList.toggle("hidden", !hasTimer);
  timerControls.classList.toggle("hidden", !isHost || !hasTimer);

  if (!hasTimer) {
    timerLabel.textContent = "";
    timerValue.textContent = "";
    timerStatus.textContent = "";
    pauseTimerBtn.disabled = true;
    resumeTimerBtn.disabled = true;
    addTimeBtn.disabled = true;
    return;
  }

  timerLabel.textContent = timer.expired
    ? "Time expired"
    : timer.type === "reading"
      ? "Reading time"
      : "Answer time";
  timerValue.textContent = formatTimer(timer.remainingMs);
  timerStatus.textContent = timer.expired
    ? "Host decides"
    : timer.running
      ? "Running"
      : "Paused";

  pauseTimerBtn.disabled = !timer.running || timer.expired;
  resumeTimerBtn.disabled =
    timer.running || timer.expired || timer.remainingMs <= 0;
  addTimeBtn.disabled = false;
}

function getBuzzingStatus(state) {
  if (state.answerRevealed) {
    return "Buzzing closed.";
  }

  if (state.timer?.expired && state.timer.type === "answer") {
    return "Time expired - host decides.";
  }

  if (state.buzzedPlayer) {
    return `${state.buzzedPlayer.name} answering...`;
  }

  if (state.buzzingOpen) {
    return "Buzzing open!";
  }

  return "Read the clue...";
}

function renderBuzzes(buzzes, buzzedPlayer, lockedOutPlayers) {
  buzzList.innerHTML = "";

  const lockedOutPlayerIds = new Set(
    lockedOutPlayers.map((player) => player.id),
  );

  buzzes.forEach((buzz, index) => {
    const item = document.createElement("li");
    item.className = "buzz-result";
    item.classList.toggle("active-buzz", buzz.id === buzzedPlayer?.id);
    item.classList.toggle("locked-out-buzz", lockedOutPlayerIds.has(buzz.id));

    const status = getBuzzStatus(buzz, buzzedPlayer, lockedOutPlayerIds);
    item.appendChild(createUserIdentity(buzz));
    const detail = document.createElement("span");
    detail.className = "buzz-detail";
    detail.textContent =
      index === 0
        ? `buzzed first${status ? ` (${status})` : ""}`
        : `was ${formatDelay(buzz.delayMs)} late${status ? ` (${status})` : ""}`;
    item.appendChild(detail);
    buzzList.appendChild(item);
  });
}

function getBuzzStatus(buzz, buzzedPlayer, lockedOutPlayerIds) {
  if (buzz.id === buzzedPlayer?.id) {
    return "answering now";
  }

  if (lockedOutPlayerIds.has(buzz.id)) {
    return "locked out";
  }

  return "";
}

function showScreen(screen) {
  roleScreen.classList.add("hidden");
  waitingRoom.classList.add("hidden");
  gameScreen.classList.add("hidden");
  questionScreen.classList.add("hidden");
  dailyDoubleScreen.classList.add("hidden");
  finalJeopardyScreen.classList.add("hidden");

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

  if (screen === "dailyDouble") {
    dailyDoubleScreen.classList.remove("hidden");
  }

  if (screen === "finalJeopardy") {
    finalJeopardyScreen.classList.remove("hidden");
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
    item.appendChild(createUserIdentity(user));
    element.appendChild(item);
  });
}

function createUserIdentity(user) {
  const identity = document.createElement("span");
  identity.className = "user-identity";
  identity.appendChild(createUserAvatar(user));
  identity.appendChild(createUserName(user));
  return identity;
}

function createUserAvatar(user) {
  if (user.avatarUrl) {
    const avatar = document.createElement("img");
    avatar.className = "user-avatar";
    avatar.src = user.avatarUrl;
    avatar.alt = "";
    avatar.loading = "lazy";
    avatar.referrerPolicy = "no-referrer";
    return avatar;
  }

  const placeholder = document.createElement("span");
  placeholder.className = "user-avatar user-avatar-placeholder";
  placeholder.textContent = getInitials(user.name);
  return placeholder;
}

function createUserName(user) {
  const name = document.createElement("span");
  name.className = "user-name";
  name.textContent = user.name;
  return name;
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return initials || "?";
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

function formatTimer(remainingMs) {
  return (Math.max(0, remainingMs) / 1000).toFixed(1);
}
