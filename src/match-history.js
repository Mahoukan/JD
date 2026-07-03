import { db } from "./db.js";

export async function saveCompletedMatch({ gameState, gameContext }) {
  if (!db) {
    throw new Error("DATABASE_URL is not set; match history cannot be saved.");
  }

  const rankings = getFinalRankings(gameState.players);
  const winner = rankings[0]?.player || null;
  const finalRound = gameState.grid?.rounds?.final || null;
  const endedAt = new Date().toISOString();
  const matchId = await saveMatchTransaction({
    gameState,
    gameContext,
    rankings,
    winner,
    finalRound,
    endedAt
  });

  return matchId;
}

async function saveMatchTransaction({
  gameState,
  gameContext,
  rankings,
  winner,
  finalRound,
  endedAt
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        nullableText(gameContext.lobbyCode),
        nullableText(gameContext.id),
        nullableText(gameState.grid?.id || gameState.selectedGridFilename),
        nullableText(gameState.grid?.name) || "Trivia Showdown Grid",
        getPlayerDatabaseId(gameState.host),
        getPlayerDatabaseId(winner),
        nullableText(gameState.gameStartedAt),
        endedAt
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

    await updatePlayerStatsForMatch(client, rankings, endedAt);

    await client.query("COMMIT");
    return matchId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function insertMatchPlayer(client, matchId, { player, placement, finalScore, result }) {
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
      finalScore,
      placement,
      result
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

async function updatePlayerStatsForMatch(client, rankings, endedAt) {
  for (const ranking of rankings) {
    const playerId = getPlayerDatabaseId(ranking.player);

    if (!playerId || ranking.player.provider === "guest") {
      continue;
    }

    const isWin = ranking.placement === 1;

    await client.query(
      `
        INSERT INTO player_stats (
          player_id,
          games_played,
          wins,
          losses,
          highest_score,
          total_score,
          total_placement,
          last_played_at,
          updated_at
        )
        VALUES (
          $1,
          1,
          $2,
          $3,
          $4,
          $4,
          $5,
          $6,
          NOW()
        )
        ON CONFLICT (player_id) DO UPDATE
        SET
          games_played = player_stats.games_played + 1,
          wins = player_stats.wins + EXCLUDED.wins,
          losses = player_stats.losses + EXCLUDED.losses,
          highest_score = GREATEST(player_stats.highest_score, EXCLUDED.highest_score),
          total_score = player_stats.total_score + EXCLUDED.total_score,
          total_placement = player_stats.total_placement + EXCLUDED.total_placement,
          last_played_at = EXCLUDED.last_played_at,
          updated_at = NOW()
      `,
      [
        playerId,
        isWin ? 1 : 0,
        isWin ? 0 : 1,
        ranking.finalScore,
        ranking.placement,
        endedAt
      ]
    );
  }
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

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)
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
      placement: index + 1,
      finalScore: Math.round(Number(player.score || 0)),
      result: index === 0 ? "win" : "loss"
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
