const socket = io();

const roleScreen = document.getElementById("role-screen");
const waitingRoom = document.getElementById("waiting-room");
const gameScreen = document.getElementById("game-screen");
const questionScreen = document.getElementById("question-screen");
const riskTileScreen = document.getElementById("daily-double-screen");
const faceAFaceScreen = document.getElementById("final-jeopardy-screen");

const hostBtn = document.getElementById("host-btn");
const playerBtn = document.getElementById("player-btn");
const spectatorBtn = document.getElementById("spectator-btn");
const lobbyPanel = document.getElementById("lobby-panel");
const createLobbyBtn = document.getElementById("create-lobby-btn");
const joinLobbyForm = document.getElementById("join-lobby-form");
const joinLobbyCode = document.getElementById("join-lobby-code");
const lobbyStatus = document.getElementById("lobby-status");
const waitingLobbyPanel = document.getElementById("waiting-lobby-panel");
const currentLobbyCode = document.getElementById("current-lobby-code");
const copyLobbyCodeBtn = document.getElementById("copy-lobby-code-btn");

const changeRoleBtn = document.getElementById("change-role-btn");
const quitGameButtons = document.querySelectorAll(".quit-game-btn");
const startGameBtn = document.getElementById("start-game-btn");
const importGridBtn = document.getElementById("import-board-btn");
const importGridInput = document.getElementById("import-board-input");

const hostControls = document.getElementById("host-controls");
const waitingMessage = document.getElementById("waiting-message");
const gridSelectorPanel = document.getElementById("board-selector-panel");
const gridSelect = document.getElementById("board-select");
const selectedGridName = document.getElementById("selected-board-name");
const round1Grid = document.getElementById("jeopardy-board");
const roundStatus = document.getElementById("round-status");
const gridStatus = document.getElementById("board-status");
const resetGridBtn = document.getElementById("reset-board-btn");
const startPowerRoundBtn = document.getElementById("start-double-jeopardy-btn");
const startFaceAFaceBtn = document.getElementById("start-final-jeopardy-btn");
const scoreList = document.getElementById("score-list");
const currentTurnDisplay = document.getElementById("current-turn-display");
const turnControls = document.getElementById("turn-controls");
const turnPlayerSelect = document.getElementById("turn-player-select");
const setTurnBtn = document.getElementById("set-turn-btn");
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
const questionPrompt = document.getElementById("question-clue");
const promptImageThumbBtn = document.getElementById("clue-image-thumb-btn");
const promptImageThumb = document.getElementById("clue-image-thumb");
const timerPanel = document.getElementById("timer-panel");
const timerLabel = document.getElementById("timer-label");
const timerValue = document.getElementById("timer-value");
const timerStatus = document.getElementById("timer-status");
const buzzingStatus = document.getElementById("buzzing-status");
const hostGuessPanel = document.getElementById("host-answer-panel");
const hostGuessText = document.getElementById("host-answer-text");
const questionGuess = document.getElementById("question-answer");
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
const revealGuessBtn = document.getElementById("reveal-answer-btn");
const backToGridBtn = document.getElementById("back-to-board-btn");
const riskTileDetail = document.getElementById("daily-double-detail");
const riskTilePlayerPanel = document.getElementById(
  "daily-double-player-panel",
);
const riskTilePlayerSelect = document.getElementById(
  "daily-double-player-select",
);
const riskTilePlayerBtn = document.getElementById("daily-double-player-btn");
const riskTileBetForm = document.getElementById("daily-double-wager-form");
const riskTileBetInput = document.getElementById("daily-double-wager-input");
const riskTileBetError = document.getElementById("daily-double-wager-error");
const riskTileBetBtn = document.getElementById("daily-double-wager-btn");
const riskTileWaiting = document.getElementById("daily-double-waiting");
const finalCategory = document.getElementById("final-category");
const finalPrompt = document.getElementById("final-clue");
const finalStatus = document.getElementById("final-status");
const finalBetForm = document.getElementById("final-wager-form");
const finalBetInput = document.getElementById("final-wager-input");
const finalBetError = document.getElementById("final-wager-error");
const finalBetBtn = document.getElementById("final-wager-btn");
const finalGuessForm = document.getElementById("final-answer-form");
const finalGuessInput = document.getElementById("final-answer-input");
const finalGuessError = document.getElementById("final-answer-error");
const finalGuessBtn = document.getElementById("final-answer-btn");
const finalHostPanel = document.getElementById("final-host-panel");
const finalStatusList = document.getElementById("final-status-list");
const revealFinalPromptBtn = document.getElementById("reveal-final-clue-btn");
const startFinalReviewBtn = document.getElementById("start-final-review-btn");
const showFinalResultsBtn = document.getElementById("show-final-results-btn");
const finalReviewPanel = document.getElementById("final-review-panel");
const finalRankings = document.getElementById("final-rankings");
const imageLightbox = document.getElementById("image-lightbox");
const imageLightboxImg = document.getElementById("image-lightbox-img");
const imageLightboxCloseBtn = document.getElementById(
  "image-lightbox-close-btn",
);

const welcomeText = document.getElementById("welcome-text");
const message = document.getElementById("message");

const hostList = document.getElementById("host-list");
const playerList = document.getElementById("player-list");
const spectatorList = document.getElementById("spectator-list");
const browserNameModal = document.getElementById("browser-name-modal");
const browserNameForm = document.getElementById("browser-name-form");
const browserNameInput = document.getElementById("browser-name-input");
const browserNameError = document.getElementById("browser-name-error");
const browserNameCancelBtn = document.getElementById("browser-name-cancel-btn");
const browserChangeNameButtons = document.querySelectorAll(
  ".browser-change-name-btn",
);
const browserNameActionPanels = document.querySelectorAll(
  ".browser-name-actions",
);

let currentUser = null;
let currentState = null;
let activeScoreEditPlayerId = null;
let pendingScoreEdit = null;
let discordIdentityInitialised = false;
let discordIdentityEmitted = false;
let discordSdkClient = null;
let lastRichPresenceKey = "";
let browserIdentityReady = false;
let browserNameModalMode = "initial";
let pendingConfirmAction = null;
let resetGridConfirmTimeout = null;
let currentLobby = "";
const browserDisplayNameStorageKey = "triviaShowdownDisplayName";
const legacyBrowserDisplayNameStorageKey = "jeopardyDisplayName";
const browserPlayerTokenStorageKey = "triviaShowdownPlayerToken";
const browserLobbyCodeStorageKey = "triviaShowdownLobbyCode";
const discordActivityStartTimestamp = Date.now();
const maxRichPresencePlayers = 8;

function initialiseIdentity() {
  if (isLikelyDiscordActivity()) {
    hideLobbyControls();
    hideBrowserNameControls();
    initialiseDiscordIdentity();
    return;
  }

  showLobbyControls();
  initialiseBrowserIdentity();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const buildVersion = encodeURIComponent(window.BUILD_VERSION || "dev");
    navigator.serviceWorker
      .register(`/service-worker.js?v=${buildVersion}`)
      .catch(() => {
        // PWA support is optional; Discord Activities and browsers keep working.
      });
  } catch {
    // Ignore unsupported or restricted embedded browser environments.
  }
}

function initialiseBrowserIdentity() {
  showBrowserNameControls();
  const storedName = getStoredBrowserDisplayName();

  if (storedName) {
    applyBrowserDisplayName(storedName);
    return;
  }

  browserIdentityReady = false;
  openBrowserNameModal({
    mode: "initial",
    value: "",
  });
}

async function initialiseDiscordIdentity() {
  const isDiscordActivity = isLikelyDiscordActivity();

  if (discordIdentityInitialised) {
    return;
  }

  if (!isDiscordActivity) {
    return;
  }

  discordIdentityInitialised = true;

  try {
    const config = await fetch("/api/discord/config").then((response) =>
      response.json(),
    );

    if (!config.clientId) {
      console.warn(
        "Discord identity: DISCORD_CLIENT_ID missing, using guest identity",
      );
      return;
    }

    const DiscordSDK = await loadDiscordSdk();
    const discordSdk = new DiscordSDK(config.clientId);
    await discordSdk.ready();

    // Rich Presence is initialized once the Discord SDK is ready. To update it
    // later, call updateRichPresence() with the latest authoritative gameState.
    // The "logo" Rich Presence asset must exist in the Discord Developer Portal.
    discordSdkClient = discordSdk;
    const instanceId = discordSdk.instanceId || "";
    socket.emit("setGameInstance", {
      instanceId,
    });
    updateRichPresence(currentState);

    const authCode = await getDiscordAuthCode(discordSdk, config.clientId);

    if (!authCode) {
      console.warn("Discord identity: authorize did not return a code");
      return;
    }

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
    const auth = await discordSdk.commands.authenticate({
      access_token: tokenData.access_token,
    });
    const user = auth?.user;

    if (!user) {
      console.warn(
        "Discord identity: authenticated response did not include a user",
      );
      return;
    }

    if (discordIdentityEmitted) {
      return;
    }

    const identityPayload = {
      name: getDiscordDisplayName(user),
      avatarUrl: getDiscordAvatarUrl(user),
      discordUserId: user.id,
    };
    socket.emit("setUserIdentity", identityPayload);
    discordIdentityEmitted = true;
  } catch (error) {
    console.warn(
      "Discord identity: authentication failure, using guest identity.",
      error,
    );
  }
}

function getStoredBrowserDisplayName() {
  try {
    const storedName = localStorage.getItem(browserDisplayNameStorageKey);

    if (storedName) {
      return sanitiseBrowserDisplayName(storedName);
    }

    const legacyName = sanitiseBrowserDisplayName(
      localStorage.getItem(legacyBrowserDisplayNameStorageKey) || "",
    );

    if (legacyName) {
      localStorage.setItem(browserDisplayNameStorageKey, legacyName);
      localStorage.removeItem(legacyBrowserDisplayNameStorageKey);
    }

    return legacyName;
  } catch {
    return "";
  }
}

function getBrowserPlayerToken() {
  try {
    const storedToken = localStorage.getItem(browserPlayerTokenStorageKey);

    if (storedToken) {
      return storedToken;
    }

    const token = crypto.randomUUID();
    localStorage.setItem(browserPlayerTokenStorageKey, token);
    return token;
  } catch {
    return "";
  }
}

function getStoredBrowserLobbyCode() {
  try {
    return sanitiseLobbyCode(
      localStorage.getItem(browserLobbyCodeStorageKey) || "",
    );
  } catch {
    return "";
  }
}

function storeBrowserLobbyCode(lobbyCode) {
  try {
    if (lobbyCode) {
      localStorage.setItem(browserLobbyCodeStorageKey, lobbyCode);
      return;
    }

    localStorage.removeItem(browserLobbyCodeStorageKey);
  } catch {
    // Storage can be unavailable in some embedded/private browser modes.
  }
}

function storeBrowserDisplayName(name) {
  try {
    localStorage.setItem(browserDisplayNameStorageKey, name);
  } catch {
    // Storage can be unavailable in some embedded/private browser modes.
  }
}

function sanitiseBrowserDisplayName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

function sanitiseLobbyCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function showLobbyControls() {
  lobbyPanel.classList.remove("hidden");
}

function hideLobbyControls() {
  lobbyPanel.classList.add("hidden");
  waitingLobbyPanel.classList.add("hidden");
}

function showBrowserNameControls() {
  browserChangeNameButtons.forEach((button) => {
    button.classList.remove("hidden");
  });
  browserNameActionPanels.forEach((panel) => {
    panel.classList.remove("hidden");
  });
}

function hideBrowserNameControls() {
  browserChangeNameButtons.forEach((button) => {
    button.classList.add("hidden");
  });
  browserNameActionPanels.forEach((panel) => {
    panel.classList.add("hidden");
  });
  closeBrowserNameModal();
}

function openBrowserNameModal({ mode, value }) {
  browserNameModalMode = mode;
  browserNameInput.value = value || "";
  browserNameError.textContent = "";
  browserNameCancelBtn.classList.toggle("hidden", mode === "initial");
  browserNameModal.classList.remove("hidden");
  browserNameInput.focus();
  browserNameInput.select();
}

function closeBrowserNameModal() {
  browserNameModal.classList.add("hidden");
  browserNameError.textContent = "";
}

function closeImageLightbox() {
  imageLightbox.classList.add("hidden");
  imageLightboxImg.removeAttribute("src");
}

function applyBrowserDisplayName(name) {
  browserIdentityReady = true;
  storeBrowserDisplayName(name);
  currentUser = {
    ...currentUser,
    name,
    avatarUrl: "",
    discordUserId: "",
  };
  rejoinStoredBrowserLobby();
  emitBrowserIdentity();
}

function rejoinStoredBrowserLobby() {
  if (isLikelyDiscordActivity()) {
    return;
  }

  const storedLobbyCode = getStoredBrowserLobbyCode();

  if (!storedLobbyCode) {
    return;
  }

  socket.emit("joinLobby", {
    lobbyCode: storedLobbyCode,
    clientToken: getBrowserPlayerToken(),
  });
}

function emitBrowserIdentity() {
  const name = getStoredBrowserDisplayName() || currentUser?.name || "";

  socket.emit("setUserIdentity", {
    name,
    avatarUrl: "",
    discordUserId: "",
    clientToken: getBrowserPlayerToken(),
  });
}

function ensureBrowserDisplayNameBeforeRole() {
  if (isLikelyDiscordActivity() || browserIdentityReady) {
    return true;
  }

  openBrowserNameModal({
    mode: "initial",
    value: getStoredBrowserDisplayName(),
  });
  return false;
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
  if (!window.DiscordSDK) {
    throw new Error("Discord Embedded App SDK bundle was not loaded.");
  }

  return window.DiscordSDK;
}

async function getDiscordAuthCode(discordSdk, clientId) {
  const authorizePayload = {
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "rpc.activities.write"],
  };
  const response = await discordSdk.commands.authorize(authorizePayload);
  return response?.code || "";
}

async function updateRichPresence(state) {
  const setActivity = discordSdkClient?.commands?.setActivity;

  if (typeof setActivity !== "function") {
    return;
  }

  try {
    const playerCount = getRichPresencePlayerCount(state);
    const maxPlayers = Math.max(
      playerCount,
      Number(state?.maxPlayers) || maxRichPresencePlayers,
    );
    const activityText = getRichPresenceText(state, playerCount, maxPlayers);
    const startTimestamp =
      getRichPresenceStartTimestamp(state) || discordActivityStartTimestamp;
    const activity = {
      type: 0,
      details: activityText.details,
      state: activityText.state,
      timestamps: {
        start: startTimestamp,
      },
      assets: {
        large_image: "logo",
        large_text: "Trivia Showdown",
      },
      party: {
        id: discordSdkClient.instanceId || "trivia-showdown",
        size: [playerCount, maxPlayers],
      },
    };
    const richPresenceKey = JSON.stringify(activity);

    if (richPresenceKey === lastRichPresenceKey) {
      return;
    }

    await setActivity.call(discordSdkClient.commands, { activity });
    lastRichPresenceKey = richPresenceKey;
  } catch {
    // Rich Presence is optional; keep the game playable outside Discord.
  }
}

function getRichPresencePlayerCount(state) {
  if (!state?.players) {
    return 0;
  }

  return state.players.length;
}

function getRichPresenceStartTimestamp(state) {
  const timestamp =
    state?.gameStartTimestamp ||
    state?.gameStartedAt ||
    state?.sessionStartedAt;

  if (!timestamp) {
    return 0;
  }

  if (typeof timestamp === "number") {
    return timestamp > 1000000000000 ? timestamp : timestamp * 1000;
  }

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getRichPresenceText(state, playerCount, maxPlayers) {
  const countLabel = `(${playerCount} of ${maxPlayers})`;

  if (!state || state.phase === "waiting") {
    return {
      details: "Setting up a game",
      state: `In Lobby ${countLabel}`,
    };
  }

  if (state.phase === "finalResults") {
    return {
      details: "Game Complete",
      state: `Winner: ${getRichPresenceWinnerName(state)}`,
    };
  }

  if (state.phase === "finalBet") {
    return {
      details: "Face-a-Face",
      state: "Placing Bets",
    };
  }

  if (state.phase === "finalGuesses") {
    return {
      details: "Face-a-Face",
      state: "Submitting Guesses",
    };
  }

  if (state.phase === "finalReview") {
    return {
      details: "Face-a-Face",
      state: "Host Reviewing",
    };
  }

  if (
    state.phase === "riskTilePlayerSelect" ||
    state.phase === "riskTileBet" ||
    state.phase === "riskTileQuestion"
  ) {
    return {
      details: "Risk Tile",
      state: "Special Bet",
    };
  }

  return {
    details: getRichPresenceRoundDetails(state.currentRound),
    state: `Buzzing in ${countLabel}`,
  };
}

function getRichPresenceRoundDetails(round) {
  return round === "round2" ? "Power Round" : "Warm Up";
}

function getRichPresenceWinnerName(state) {
  const winner = [...(state.players || [])].sort(
    (first, second) => Number(second.score || 0) - Number(first.score || 0),
  )[0];

  return winner?.name || "TBD";
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

function clearResetGridConfirm() {
  if (resetGridConfirmTimeout) {
    clearTimeout(resetGridConfirmTimeout);
    resetGridConfirmTimeout = null;
  }

  resetGridBtn.textContent = "Reset Grid";
  resetGridBtn.classList.remove("warning-button");
}

socket.on("connected", (user) => {
  currentUser = user;
  initialiseIdentity();
});

socket.on("gameState", (state) => {
  currentState = state;
  if (state.lobbyCode) {
    currentLobby = state.lobbyCode;
    storeBrowserLobbyCode(currentLobby);
  }
  updateRichPresence(state);

  updateLobbyPanel(state);
  updateRoleButtons(state);
  updateWaitingRoom(state);
  updateHostControls();
  renderGrid(state);
  renderScores(state);
  renderQuestion(state);
  renderDailyDouble(state);
  renderFaceAFace(state);
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

socket.on("lobbyJoined", ({ lobbyCode } = {}) => {
  currentLobby = sanitiseLobbyCode(lobbyCode);
  storeBrowserLobbyCode(currentLobby);
  lobbyStatus.textContent = currentLobby
    ? `Joined lobby ${currentLobby}. Choose a role to continue.`
    : "Joined lobby.";
  message.textContent = "";

  if (browserIdentityReady && !isLikelyDiscordActivity()) {
    emitBrowserIdentity();
  }
});

socket.on("leftGame", () => {
  currentUser = {
    ...currentUser,
    role: null,
  };
  currentLobby = "";
  storeBrowserLobbyCode("");
  joinLobbyCode.value = "";
  message.textContent = "";
  lobbyStatus.textContent = "Create a lobby as host, or join with a code.";
  showScreen("role");
});

socket.on("lobbyError", (reason) => {
  lobbyStatus.textContent = reason || "Could not join lobby.";
  showToast(lobbyStatus.textContent, "error");
});

socket.on("roleRejected", (reason) => {
  message.textContent = reason;
  showToast(reason, "error");
});

socket.on("actionRejected", (reason) => {
  showToast(reason, "error");
});

createLobbyBtn.addEventListener("click", () => {
  if (!ensureBrowserDisplayNameBeforeRole()) {
    return;
  }

  createLobbyBtn.disabled = true;
  socket.emit("createLobby", {
    clientToken: getBrowserPlayerToken(),
  });
  setTimeout(() => {
    createLobbyBtn.disabled = false;
  }, 1200);
});

joinLobbyCode.addEventListener("input", () => {
  joinLobbyCode.value = sanitiseLobbyCode(joinLobbyCode.value);
});

joinLobbyForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!ensureBrowserDisplayNameBeforeRole()) {
    return;
  }

  const lobbyCode = sanitiseLobbyCode(joinLobbyCode.value);

  if (lobbyCode.length < 4) {
    lobbyStatus.textContent = "Enter a 4-6 character lobby code.";
    joinLobbyCode.focus();
    return;
  }

  socket.emit("joinLobby", {
    lobbyCode,
    clientToken: getBrowserPlayerToken(),
  });
});

copyLobbyCodeBtn.addEventListener("click", async () => {
  if (!currentLobby) {
    return;
  }

  try {
    await navigator.clipboard.writeText(currentLobby);
    showToast("Lobby code copied.", "success");
  } catch {
    showToast(`Lobby code: ${currentLobby}`, "info");
  }
});

hostBtn.addEventListener("click", () => {
  if (!ensureBrowserDisplayNameBeforeRole()) {
    return;
  }

  socket.emit("chooseRole", {
    role: "host",
    clientToken: getBrowserPlayerToken(),
  });
});

playerBtn.addEventListener("click", () => {
  if (!ensureBrowserDisplayNameBeforeRole()) {
    return;
  }

  socket.emit("chooseRole", {
    role: "player",
    clientToken: getBrowserPlayerToken(),
  });
});

spectatorBtn.addEventListener("click", () => {
  if (!ensureBrowserDisplayNameBeforeRole()) {
    return;
  }

  socket.emit("chooseRole", {
    role: "spectator",
    clientToken: getBrowserPlayerToken(),
  });
});

changeRoleBtn.addEventListener("click", () => {
  showScreen("role");
});

quitGameButtons.forEach((button) => {
  button.addEventListener("click", () => {
    socket.emit("leaveGame");
  });
});

startGameBtn.addEventListener("click", () => {
  socket.emit("startGame");
});

importGridBtn.addEventListener("click", () => {
  importGridInput.value = "";
  importGridInput.click();
});

importGridInput.addEventListener("change", () => {
  const file = importGridInput.files?.[0];

  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith(".json")) {
    showToast("Choose a .json grid file.", "error");
    return;
  }

  file
    .text()
    .then((contents) => {
      socket.emit("importGrid", {
        filename: file.name,
        contents,
      });
    })
    .catch(() => {
      showToast("Could not read that file.", "error");
    });
});

socket.on("identityUpdated", (user) => {
  currentUser = {
    ...currentUser,
    ...user,
  };
});

socket.on("gridImportResult", (result = {}) => {
  if (result.ok) {
    showToast(`Imported ${result.grid?.name || "grid"}.`, "success");
    return;
  }

  showToast(result.error || "Grid import failed.", "error");
});

promptImageThumbBtn.addEventListener("click", () => {
  if (!promptImageThumb.src) {
    return;
  }

  imageLightboxImg.src = promptImageThumb.src;
  imageLightbox.classList.remove("hidden");
  imageLightboxCloseBtn.focus();
});

imageLightboxCloseBtn.addEventListener("click", closeImageLightbox);

imageLightbox.addEventListener("click", (event) => {
  if (event.target === imageLightbox) {
    closeImageLightbox();
  }
});

browserNameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = sanitiseBrowserDisplayName(browserNameInput.value);

  if (!name) {
    browserNameError.textContent = "Name is required.";
    browserNameInput.focus();
    return;
  }

  applyBrowserDisplayName(name);
  closeBrowserNameModal();
  showToast("Name updated.", "success");
});

browserNameCancelBtn.addEventListener("click", () => {
  if (browserNameModalMode === "initial") {
    return;
  }

  closeBrowserNameModal();
});

browserChangeNameButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (isLikelyDiscordActivity()) {
      return;
    }

    openBrowserNameModal({
      mode: "change",
      value: getStoredBrowserDisplayName() || currentUser?.name || "",
    });
  });
});

gridSelect.addEventListener("change", () => {
  socket.emit("selectGrid", {
    filename: gridSelect.value,
  });
});

resetGridBtn.addEventListener("click", () => {
  if (resetGridConfirmTimeout) {
    socket.emit("resetGrid");
    clearResetGridConfirm();
    return;
  }

  resetGridBtn.textContent = "Click Again to Confirm";
  resetGridBtn.classList.add("warning-button");
  showToast("Click Reset Grid again to confirm.", "error");
  resetGridConfirmTimeout = setTimeout(clearResetGridConfirm, 4000);
});

startPowerRoundBtn.addEventListener("click", () => {
  socket.emit("startPowerRound");
});

startFaceAFaceBtn.addEventListener("click", () => {
  socket.emit("startFaceAFace");
});

backToGridBtn.addEventListener("click", () => {
  socket.emit("returnToGrid");
});

revealGuessBtn.addEventListener("click", () => {
  socket.emit("revealGuess");
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

riskTilePlayerBtn.addEventListener("click", () => {
  // TODO: Rename this legacy Risk Tile event alias after older clients have aged out.
  socket.emit("selectDailyDoublePlayer", {
    playerId: riskTilePlayerSelect.value,
  });
});

riskTileBetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitDailyDoubleBet();
});

finalBetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitFinalBet();
});

finalGuessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitFinalGuess();
});

revealFinalPromptBtn.addEventListener("click", () => {
  socket.emit("revealFinalPrompt");
});

startFinalReviewBtn.addEventListener("click", () => {
  socket.emit("startFinalReview");
});

showFinalResultsBtn.addEventListener("click", () => {
  socket.emit("showFinalResults");
});

setTurnBtn.addEventListener("click", () => {
  socket.emit("setCurrentTurn", {
    playerId: turnPlayerSelect.value,
  });
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
  const needsLobby = !isLikelyDiscordActivity() && !currentLobby;
  hostBtn.classList.toggle("hidden", !state.hostAvailable || needsLobby);
  playerBtn.disabled = needsLobby;
  spectatorBtn.disabled = needsLobby;
}

function updateLobbyPanel(state) {
  if (isLikelyDiscordActivity()) {
    hideLobbyControls();
    return;
  }

  const lobbyCode = state.lobbyCode || currentLobby || "";
  currentLobby = lobbyCode;
  lobbyPanel.classList.toggle("hidden", Boolean(currentUser?.role));
  waitingLobbyPanel.classList.toggle("hidden", !lobbyCode);
  currentLobbyCode.textContent = lobbyCode || "-----";
  lobbyStatus.textContent = lobbyCode
    ? `Current lobby: ${lobbyCode}`
    : "Create a lobby as host, or join with a code.";
}

function updateWaitingRoom(state) {
  renderList(hostList, state.host ? [state.host] : [], "No host yet");
  renderList(playerList, state.players, "No players yet");
  renderList(spectatorList, state.spectators, "No spectators yet");
  renderGridSelection(state);
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

  if (state.phase === "grid") {
    showScreen("game");
    return;
  }

  if (state.phase === "question") {
    showScreen("question");
    return;
  }

  if (state.phase === "riskTilePlayerSelect" || state.phase === "riskTileBet") {
    showScreen("riskTile");
    return;
  }

  if (state.phase === "riskTileQuestion") {
    showScreen("question");
    return;
  }

  if (isFaceAFacePhase(state.phase)) {
    showScreen("faceAFace");
  }
}

function renderGridSelection(state) {
  const isHost = currentUser?.role === "host";
  const grids = state.availableGrids || [];
  const selectedGrid = getSelectedGrid(state);

  gridSelectorPanel.classList.toggle("hidden", !isHost);
  selectedGridName.textContent = `Selected grid: ${selectedGrid?.name || "None"}`;

  if (!isHost) {
    return;
  }

  gridSelect.innerHTML = "";
  gridSelect.disabled = grids.length === 0;

  if (grids.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No grids available";
    gridSelect.appendChild(option);
    return;
  }

  grids.forEach((grid) => {
    const option = document.createElement("option");
    option.value = grid.filename;
    option.textContent = grid.name;
    option.selected = grid.filename === state.selectedGridFilename;
    gridSelect.appendChild(option);
  });
}

function getSelectedGrid(state) {
  return (
    state.availableGrids?.find(
      (grid) => grid.filename === state.selectedGridFilename,
    ) ||
    (state.grid
      ? {
          name: state.grid.name || "Trivia Showdown Grid",
          filename: state.selectedGridFilename,
        }
      : null)
  );
}

function renderGrid(state) {
  round1Grid.innerHTML = "";

  const categories = getCurrentRoundCategories(state);
  const gridColumnCount = Math.max(categories?.length || 1, 1);
  round1Grid.style.setProperty("--grid-columns", String(gridColumnCount));

  const isHost = currentUser?.role === "host";
  const isHost = currentUser?.role === "host";
  const canStartPowerRound =
    isHost &&
    state.phase === "grid" &&
    state.currentRound === "round1" &&
    hasPowerRoundGrid(state);
  const canStartFaceAFace =
    isHost &&
    state.phase === "grid" &&
    state.currentRound === "round2" &&
    Boolean(state.grid?.rounds?.final);

  resetGridBtn.classList.toggle("hidden", !isHost || state.phase !== "grid");
  startPowerRoundBtn.classList.toggle("hidden", !canStartPowerRound);
  startFaceAFaceBtn.classList.toggle("hidden", !canStartFaceAFace);

  if (!isHost || state.phase !== "grid") {
    clearResetGridConfirm();
  }

  roundStatus.textContent = getRoundName(state.currentRound);

  if (!categories?.length) {
    gridStatus.textContent = `No ${getRoundName(state.currentRound)} grid loaded.`;
    return;
  }

  const rows = Math.max(
    ...categories.map((category) => category.prompts.length),
  );

  categories.forEach((category) => {
    const heading = document.createElement("div");
    heading.className = "board-category";
    heading.textContent = category.category;
    round1Grid.appendChild(heading);
  });

  for (let questionIndex = 0; questionIndex < rows; questionIndex += 1) {
    categories.forEach((category, categoryIndex) => {
      const prompt = category.prompts[questionIndex];
      const square = document.createElement("button");
      square.className = "clue-square";
      square.type = "button";

      if (!prompt) {
        square.classList.add("empty-square");
        square.disabled = true;
        square.setAttribute("aria-hidden", "true");
        round1Grid.appendChild(square);
        return;
      }

      if (prompt.answered) {
        square.classList.add("used");
        square.textContent = "";
        square.disabled = true;
        square.setAttribute(
          "aria-label",
          `${category.category} for ${prompt.value}, already used`,
        );
        round1Grid.appendChild(square);
        return;
      }

      square.textContent = String(prompt.value);
      square.disabled = !isHost;
      square.setAttribute(
        "aria-label",
        `${category.category} for ${prompt.value}`,
      );

      if (isHost) {
        square.addEventListener("click", () => {
          socket.emit("selectPrompt", { categoryIndex, questionIndex });
        });
      }

      round1Grid.appendChild(square);
    });
  }

  gridStatus.textContent = state.grid.name || "Trivia Showdown Grid";
}

function getCurrentRoundCategories(state) {
  return state.grid?.rounds?.[state.currentRound || "round1"]?.categories || [];
}

function hasPowerRoundGrid(state) {
  return (
    Array.isArray(state.grid?.rounds?.round2?.categories) &&
    state.grid.rounds.round2.categories.length > 0
  );
}

function getRoundName(round) {
  switch (round) {
    case "round1":
      return "Warm Up";

    case "round2":
      return "Power Round";

    case "faceAFace":
      return "Face-a-Face";

    default:
      return "";
  }
}

function renderScores(state) {
  scoreList.innerHTML = "";
  const isHost = currentUser?.role === "host";
  renderTurnIndicator(state);

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

    if (player.id === state.currentTurnPlayerId) {
      item.classList.add("current-turn-score-row");
    }

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

function renderTurnIndicator(state) {
  const currentTurnPlayer = getCurrentTurnPlayer(state);
  currentTurnDisplay.innerHTML = "";

  const label = document.createElement("span");
  label.className = "current-turn-label";
  label.textContent = "Current Turn:";
  currentTurnDisplay.appendChild(label);

  if (currentTurnPlayer) {
    const identity = createUserIdentity(currentTurnPlayer);
    identity.classList.add("current-turn-identity");
    currentTurnDisplay.appendChild(identity);
  } else {
    const empty = document.createElement("span");
    empty.className = "current-turn-empty";
    empty.textContent = "None";
    currentTurnDisplay.appendChild(empty);
  }

  renderTurnControls(state);
}

function renderTurnControls(state) {
  const isHost = currentUser?.role === "host";
  const canChangeTurn = isHost && state.players.length > 0;

  turnControls.classList.toggle("hidden", !canChangeTurn);
  setTurnBtn.disabled = !canChangeTurn;
  turnPlayerSelect.innerHTML = "";

  if (!canChangeTurn) {
    return;
  }

  state.players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.name;
    option.selected = player.id === state.currentTurnPlayerId;
    turnPlayerSelect.appendChild(option);
  });
}

// Keep all turn display and host override UI driven by the latest gameState.
function getCurrentTurnPlayer(state) {
  return (
    state.players.find((player) => player.id === state.currentTurnPlayerId) ||
    null
  );
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
  const currentPrompt = state.currentPrompt;
  const isHost = currentUser?.role === "host";
  const isPlayer = currentUser?.role === "player";
  const isDailyDoubleQuestion = state.phase === "riskTileQuestion";
  const playerHasBuzzed = state.buzzes?.some(
    (buzz) => buzz.id === currentUser?.id,
  );
  const playerIsLockedOut = state.lockedOutPlayers?.some(
    (player) => player.id === currentUser?.id,
  );
  const hasActiveBuzz = isDailyDoubleQuestion
    ? Boolean(state.riskTileState?.submitted) && !state.riskTileState?.judged
    : Boolean(state.buzzedPlayer) && !state.guessRevealed;
  const buzzingAvailable =
    state.phase === "question" &&
    isPlayer &&
    state.buzzingOpen &&
    !state.guessRevealed &&
    !playerHasBuzzed &&
    !playerIsLockedOut &&
    Boolean(currentPrompt);

  questionHostControls.classList.toggle("hidden", !isHost);
  playerBuzzControls.classList.toggle(
    "hidden",
    !isPlayer || isDailyDoubleQuestion,
  );
  buzzBtn.disabled = !buzzingAvailable;
  correctBtn.disabled = !hasActiveBuzz;
  incorrectBtn.disabled = !hasActiveBuzz;
  renderTimer(state);

  if (!currentPrompt) {
    questionCategory.textContent = "";
    questionValue.textContent = "";
    questionPrompt.textContent = "";
    buzzingStatus.textContent = "";
    hostGuessPanel.classList.add("hidden");
    hostGuessText.textContent = "";
    questionGuess.textContent = "Guess hidden";
    questionGuess.classList.add("answer-hidden");
    resultMessage.textContent = "";
    buzzMessage.textContent = "";
    buzzList.innerHTML = "";
    lockedOutMessage.textContent = "";
    promptImageThumbBtn.classList.add("hidden");
    promptImageThumb.removeAttribute("src");
    revealGuessBtn.disabled = false;
    return;
  }

  questionCategory.textContent = currentPrompt.category;
  questionValue.textContent = String(currentPrompt.value);
  questionPrompt.textContent = currentPrompt.prompt;
  renderPromptImage(currentPrompt.image);
  renderHostGuess(currentPrompt, isHost);

  if (state.guessRevealed) {
    questionGuess.textContent = currentPrompt.guessAnswer || "";
    questionGuess.classList.remove("answer-hidden");
  } else {
    questionGuess.textContent = "Guess hidden";
    questionGuess.classList.add("answer-hidden");
  }

  revealGuessBtn.disabled = Boolean(state.guessRevealed);
  resultMessage.textContent = state.resultMessage || "";
  renderBuzzMessage(state, isDailyDoubleQuestion);
  buzzingStatus.textContent = isDailyDoubleQuestion
    ? "No buzzing for Risk Tile."
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

function renderHostGuess(currentPrompt, isHost) {
  // The server only includes currentPrompt.guessAnswer for hosts before Reveal Guess.
  const canShowHostGuess = isHost && Boolean(currentPrompt?.guessAnswer);

  hostGuessPanel.classList.toggle("hidden", !canShowHostGuess);
  hostGuessText.textContent = canShowHostGuess ? currentPrompt.guessAnswer : "";
}

function renderPromptImage(imagePath) {
  if (!imagePath) {
    promptImageThumbBtn.classList.add("hidden");
    promptImageThumb.removeAttribute("src");
    return;
  }

  promptImageThumb.src = imagePath.startsWith("media/")
    ? imagePath
    : `media/${imagePath}`;
  promptImageThumbBtn.classList.remove("hidden");
}

function renderDailyDouble(state) {
  const riskTile = state.riskTileState || {};
  const isHost = currentUser?.role === "host";
  const isSelectedPlayer = riskTile.playerId === currentUser?.id;

  riskTilePlayerPanel.classList.toggle(
    "hidden",
    !isHost || state.phase !== "riskTilePlayerSelect",
  );
  riskTileBetForm.classList.toggle(
    "hidden",
    !isSelectedPlayer || state.phase !== "riskTileBet",
  );
  riskTileWaiting.textContent = "";

  if (state.phase === "riskTilePlayerSelect") {
    riskTileDetail.textContent = "Choose the player who found the Risk Tile.";
    renderDailyDoublePlayerOptions(
      state.players || [],
      state.currentTurnPlayerId,
    );

    if (!isHost) {
      riskTileWaiting.textContent = "Waiting for the host to choose a player.";
    }
    return;
  }

  if (state.phase === "riskTileBet") {
    riskTileDetail.textContent = `${riskTile.playerName} will bet up to ${formatScore(riskTile.maxBet)}.`;
    riskTileBetInput.max = String(riskTile.maxBet || 0);
    riskTileBetError.textContent = "";
    riskTileBetBtn.disabled = false;

    if (isSelectedPlayer) {
      riskTileBetInput.value = "";
      riskTileBetInput.focus();
    } else {
      riskTileWaiting.textContent = `Waiting for ${riskTile.playerName || "the selected player"} to submit a bet.`;
    }
  }
}

function renderDailyDoublePlayerOptions(players, currentTurnPlayerId) {
  riskTilePlayerSelect.innerHTML = "";
  riskTilePlayerBtn.disabled = players.length === 0;

  if (players.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No players available";
    riskTilePlayerSelect.appendChild(option);
    return;
  }

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `${player.name} (${formatScore(player.score)})`;
    option.selected = player.id === currentTurnPlayerId;
    riskTilePlayerSelect.appendChild(option);
  });
}

function submitDailyDoubleBet() {
  const maxBet = Number(currentState?.riskTileState?.maxBet || 0);
  const trimmedInput = riskTileBetInput.value.trim();
  const parsedBet = Number(trimmedInput);

  if (
    trimmedInput === "" ||
    !Number.isFinite(parsedBet) ||
    !Number.isInteger(parsedBet)
  ) {
    riskTileBetError.textContent = "Enter a whole number.";
    return;
  }

  if (parsedBet < 0) {
    riskTileBetError.textContent = "Bet cannot be negative.";
    return;
  }

  if (parsedBet > maxBet) {
    riskTileBetError.textContent = `Maximum bet is ${formatScore(maxBet)}.`;
    return;
  }

  riskTileBetError.textContent = "";
  riskTileBetBtn.disabled = true;
  // TODO: Rename this legacy Risk Tile event alias after older clients have aged out.
  socket.emit("submitDailyDoubleBet", {
    bet: parsedBet,
  });
}

function getDailyDoubleQuestionMessage(state) {
  const riskTile = state.riskTileState || {};

  if (!riskTile.playerName) {
    return "";
  }

  return `${riskTile.playerName} bet ${formatScore(riskTile.bet)}.`;
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

  buzzMessage.appendChild(document.createTextNode("Current guessing: "));
  buzzMessage.appendChild(createUserIdentity(state.buzzedPlayer));
}

function renderFaceAFace(state) {
  const finalState = state.faceAFaceState || {};
  const finalPromptData = state.grid?.rounds?.final || {};
  const eligiblePlayerIds = finalState.eligiblePlayerIds || [];
  const currentPlayer = state.players.find(
    (player) => player.id === currentUser?.id,
  );
  const isHost = currentUser?.role === "host";
  const isEligible = eligiblePlayerIds.includes(currentUser?.id);

  finalCategory.textContent = finalPromptData.category
    ? `Category: ${finalPromptData.category}`
    : "Category unavailable";
  finalPrompt.textContent = finalPromptData.prompt || "";
  finalPrompt.classList.toggle(
    "hidden",
    !["finalGuesses", "finalReview", "finalResults"].includes(state.phase),
  );
  finalHostPanel.classList.toggle(
    "hidden",
    !isHost || !isFaceAFacePhase(state.phase),
  );
  finalReviewPanel.classList.toggle("hidden", state.phase !== "finalReview");
  finalRankings.classList.toggle("hidden", state.phase !== "finalResults");

  finalBetForm.classList.toggle(
    "hidden",
    !(state.phase === "finalBet" && isEligible),
  );
  finalGuessForm.classList.toggle(
    "hidden",
    !(state.phase === "finalGuesses" && isEligible),
  );
  revealFinalPromptBtn.classList.toggle(
    "hidden",
    !(isHost && state.phase === "finalBet"),
  );
  startFinalReviewBtn.classList.toggle(
    "hidden",
    !(isHost && state.phase === "finalGuesses"),
  );
  showFinalResultsBtn.classList.toggle(
    "hidden",
    !(isHost && state.phase === "finalReview" && allFinalJudged(state)),
  );

  if (state.phase === "finalBet" && isEligible && currentPlayer) {
    finalBetInput.max = String(currentPlayer.score);
  }

  if (state.phase === "finalBet" && isEligible) {
    finalStatus.textContent = finalState.betStatuses?.[currentUser?.id]
      ? "Bet submitted. You can still change it until the host reveals the prompt."
      : "Submit your bet.";
  } else if (
    state.phase === "finalBet" &&
    !isEligible &&
    currentUser?.role === "player"
  ) {
    finalStatus.textContent = "You are not eligible for Face-a-Face.";
  } else if (state.phase === "finalBet") {
    finalStatus.textContent = "Eligible players are submitting bets.";
  } else if (state.phase === "finalGuesses") {
    finalStatus.textContent = isEligible
      ? finalState.guessStatuses?.[currentUser?.id]
        ? "Guess submitted. You can still change it until the host starts review."
        : "Submit your guess."
      : "Eligible players are submitting guesses.";
  } else if (state.phase === "finalReview") {
    finalStatus.textContent = "Host is reviewing Face-a-Face guesses.";
  } else if (state.phase === "finalResults") {
    finalStatus.textContent = "Final rankings";
  } else {
    finalStatus.textContent = "";
  }

  renderFinalStatusList(state);
  renderFinalReview(state);
  renderFinalRankings(state);
}

function submitFinalBet() {
  const currentPlayer = currentState?.players.find(
    (player) => player.id === currentUser?.id,
  );
  const trimmedInput = finalBetInput.value.trim();
  const parsedBet = Number(trimmedInput);

  if (
    !currentPlayer ||
    trimmedInput === "" ||
    !Number.isFinite(parsedBet) ||
    !Number.isInteger(parsedBet)
  ) {
    finalBetError.textContent = "Enter a whole number.";
    return;
  }

  if (parsedBet < 0 || parsedBet > currentPlayer.score) {
    finalBetError.textContent = `Bet must be between 0 and ${formatScore(currentPlayer.score)}.`;
    return;
  }

  finalBetError.textContent = "";
  socket.emit("submitFinalBet", {
    bet: parsedBet,
  });
}

function submitFinalGuess() {
  const trimmedGuess = finalGuessInput.value.trim();

  if (!trimmedGuess) {
    finalGuessError.textContent = "Enter a guess.";
    return;
  }

  finalGuessError.textContent = "";
  socket.emit("submitFinalGuess", {
    guess: trimmedGuess,
  });
}

function renderFinalStatusList(state) {
  finalStatusList.innerHTML = "";

  if (currentUser?.role !== "host" || !isFaceAFacePhase(state.phase)) {
    return;
  }

  const finalState = state.faceAFaceState || {};
  const eligiblePlayerIds = finalState.eligiblePlayerIds || [];

  state.players.forEach((player) => {
    const item = document.createElement("li");
    const isEligible = eligiblePlayerIds.includes(player.id);
    const betSubmitted = Boolean(finalState.betStatuses?.[player.id]);
    const guessSubmitted = Boolean(finalState.guessStatuses?.[player.id]);
    const judgement = finalState.judged?.[player.id];

    if (!isEligible) {
      item.textContent = `${player.name}: ineligible`;
    } else if (state.phase === "finalBet") {
      item.textContent = `${player.name}: ${betSubmitted ? "bet submitted" : "waiting"}`;
    } else if (state.phase === "finalGuesses") {
      item.textContent = `${player.name}: ${guessSubmitted ? "guess submitted" : "waiting"}`;
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

  const finalState = state.faceAFaceState || {};
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
    const guess = document.createElement("p");
    guess.className = "final-revealed-answer";
    guess.textContent = revealed
      ? finalState.revealedGuesses?.[playerId] || ""
      : "Guess hidden";
    row.appendChild(guess);

    const judgement = finalState.judged?.[playerId];
    const status = document.createElement("p");
    status.className = "final-review-status";
    status.textContent = judgement ? `Judged ${judgement}` : "Not judged";
    row.appendChild(status);

    if (isHost && !revealed) {
      const revealButton = document.createElement("button");
      revealButton.className = "secondary-button";
      revealButton.type = "button";
      revealButton.textContent = "Reveal Guess";
      revealButton.addEventListener("click", () => {
        socket.emit("revealFinalGuessForPlayer", { playerId });
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
        socket.emit("judgeFinalGuess", { playerId, result: "correct" });
      });

      const incorrectButton = document.createElement("button");
      incorrectButton.className = "judge-button incorrect-button";
      incorrectButton.type = "button";
      incorrectButton.textContent = "Incorrect";
      incorrectButton.addEventListener("click", () => {
        socket.emit("judgeFinalGuess", { playerId, result: "incorrect" });
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
  const winner = rankings[0];

  const complete = document.createElement("p");
  complete.className = "final-complete-kicker";
  complete.textContent = "🏆 GAME COMPLETE";
  finalRankings.appendChild(complete);

  if (winner) {
    const winnerPanel = document.createElement("div");
    winnerPanel.className = "winner-panel";

    const winnerLabel = document.createElement("p");
    winnerLabel.className = "winner-label";
    winnerLabel.textContent = "Winner";

    const winnerIdentity = createUserIdentity(winner);
    winnerIdentity.classList.add("winner-identity");

    const winnerScore = document.createElement("p");
    winnerScore.className = "winner-score";
    winnerScore.textContent = `Final Score ${formatScore(winner.score)}`;

    winnerPanel.appendChild(winnerLabel);
    winnerPanel.appendChild(winnerIdentity);
    winnerPanel.appendChild(winnerScore);
    finalRankings.appendChild(winnerPanel);
  }

  const title = document.createElement("h2");
  title.className = "final-rankings-title";
  title.textContent = "Final Rankings";
  finalRankings.appendChild(title);

  const list = document.createElement("ol");
  list.className = "final-rankings-list";

  rankings.forEach((player, index) => {
    const item = document.createElement("li");
    item.className = "final-ranking-row";
    const place = document.createElement("span");
    place.className = "final-ranking-place";
    place.textContent = getRankingLabel(index);

    const score = document.createElement("span");
    score.className = "final-ranking-score";
    score.textContent = formatScore(player.score);

    item.appendChild(place);
    item.appendChild(createUserIdentity(player));
    item.appendChild(score);
    list.appendChild(item);
  });

  finalRankings.appendChild(list);

  const actions = document.createElement("div");
  actions.className = "final-results-actions";

  const playAgainButton = document.createElement("button");
  playAgainButton.className = "primary-button";
  playAgainButton.type = "button";
  playAgainButton.textContent = "Play Again";
  playAgainButton.disabled = currentUser?.role !== "host";
  playAgainButton.addEventListener("click", () => {
    socket.emit("playAgain");
  });

  const lobbyButton = document.createElement("button");
  lobbyButton.className = "secondary-button";
  lobbyButton.type = "button";
  lobbyButton.textContent = "Return to Lobby";
  lobbyButton.disabled = currentUser?.role !== "host";
  lobbyButton.addEventListener("click", () => {
    socket.emit("returnToLobby");
  });

  actions.appendChild(playAgainButton);
  actions.appendChild(lobbyButton);
  finalRankings.appendChild(actions);
}

function getRankingLabel(index) {
  if (index === 0) {
    return "🥇 First Place";
  }

  if (index === 1) {
    return "🥈 Second Place";
  }

  if (index === 2) {
    return "🥉 Third Place";
  }

  return `${index + 1}th Place`;
}

function isFaceAFacePhase(phase) {
  return [
    "finalCategory",
    "finalBet",
    "finalPrompt",
    "finalGuesses",
    "finalReview",
    "finalResults",
  ].includes(phase);
}

function allFinalJudged(state) {
  const finalState = state.faceAFaceState || {};
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
      : "Guess time";
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
  if (state.guessRevealed) {
    return "Buzzing closed.";
  }

  if (state.timer?.expired && state.timer.type === "guess") {
    return "Time expired - host decides.";
  }

  if (state.buzzedPlayer) {
    return `${state.buzzedPlayer.name} guessing...`;
  }

  if (state.buzzingOpen) {
    return "Buzzing open!";
  }

  return "Read the prompt...";
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
    return "guessing now";
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
  riskTileScreen.classList.add("hidden");
  faceAFaceScreen.classList.add("hidden");

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

  if (screen === "riskTile") {
    riskTileScreen.classList.remove("hidden");
  }

  if (screen === "faceAFace") {
    faceAFaceScreen.classList.remove("hidden");
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
  return Number(score || 0).toLocaleString();
}

function formatDelay(delayMs) {
  return `${(delayMs / 1000).toFixed(2)}s`;
}

function formatTimer(remainingMs) {
  return (Math.max(0, remainingMs) / 1000).toFixed(1);
}

registerServiceWorker();
