import { db } from "./db.js";

export async function saveCompletedMatch({ gameState, gameContext }) {
  if (!db) {
    throw new Error("DATABASE_URL is not set; match history cannot be saved.");
  }

  const rankings = getFinalRankings(gameState.players);
  const winner = rankings[0]?.player || null;
  const finalRound = gameState.grid?.rounds?.final || null;
  const matchId = await saveMatchTransaction({
    gameState,
    gameContext,
    rankings,
    winner,
    finalRound
  });

  return matchId;
}

async function saveMatchTransaction({
  gameState,
  gameContext,
  rankings,
  winner,
  finalRound
}) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const matchResult = await client.query(
      `
        INSERT INTO matches (
          lobby_code,
          game_instance_id,
          grid_id,
          grid_name,
          host_player_id,
          winner_player_id,
          started_at,
          ended_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
      `,
      [
        nullableText(gameContext.lobbyCode),
        nullableText(gameContext.id),
        nullableText(gameState.grid?.id || gameState.selectedGridFilename),
        nullableText(gameState.grid?.name) || "Trivia Showdown Grid",
        getPlayerDatabaseId(gameState.host),
        getPlayerDatabaseId(winner),
        nullableText(gameState.gameStartedAt)
      ]
    );
    const matchId = matchResult.rows[0].id;

    for (const ranking of rankings) {
      await insertMatchPlayer(client, matchId, ranking);
    }

    if (finalRound) {
      await insertFaceAFaceSummary(client, matchId, finalRound);
    }

    for (const ranking of rankings) {
      await insertFaceAFacePlayer(client, matchId, ranking.player, gameState.faceAFaceState);
    }

    await client.query("COMMIT");
    return matchId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertMatchPlayer(client, matchId, { player, placement }) {
  await client.query(
    `
      INSERT INTO match_players (
        match_id,
        player_id,
        display_name,
        avatar_url,
        provider,
        provider_user_id,
        final_score,
        placement,
        result
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      matchId,
      getPlayerDatabaseId(player),
      nullableText(player.name) || "Unknown Player",
      nullableText(player.avatarUrl),
      nullableText(player.provider) || "guest",
      nullableText(player.providerUserId),
      Math.round(Number(player.score || 0)),
      placement,
      placement === 1 ? "win" : "loss"
    ]
  );
}

async function insertFaceAFaceSummary(client, matchId, finalRound) {
  await client.query(
    `
      INSERT INTO match_face_a_face (
        match_id,
        category,
        prompt,
        guess_answer
      )
      VALUES ($1, $2, $3, $4)
    `,
    [
      matchId,
      nullableText(finalRound.category),
      nullableText(finalRound.prompt),
      nullableText(finalRound.guessAnswer)
    ]
  );
}

async function insertFaceAFacePlayer(client, matchId, player, faceAFaceState) {
  const bet = Math.round(Number(faceAFaceState.bets?.[player.id] || 0));
  const result = getFaceAFaceResult(faceAFaceState.judged?.[player.id]);

  await client.query(
    `
      INSERT INTO match_face_a_face_players (
        match_id,
        player_id,
        display_name,
        bet,
        guess,
        result,
        score_change
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      matchId,
      getPlayerDatabaseId(player),
      nullableText(player.name) || "Unknown Player",
      bet,
      nullableText(faceAFaceState.guesses?.[player.id]),
      result,
      getFaceAFaceScoreChange({ bet, result })
    ]
  );
}

function nullableText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text || null;
}

function nullableUuid(value) {
  const text = nullableText(value);

  if (!text) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function getPlayerDatabaseId(player) {
  return nullableUuid(player?.databasePlayerId);
}

function getFinalRankings(players) {
  return [...players]
    .sort((first, second) => Number(second.score || 0) - Number(first.score || 0))
    .map((player, index) => ({
      player,
      placement: index + 1
    }));
}

function getFaceAFaceResult(result) {
  return ["correct", "incorrect"].includes(result) ? result : "unjudged";
}

function getFaceAFaceScoreChange({ bet, result }) {
  if (result === "correct") {
    return bet;
  }

  if (result === "incorrect") {
    return -bet;
  }

  return 0;
}
