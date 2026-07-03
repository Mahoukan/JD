import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { query } from "./db.js";

function getPublicBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
}

function getGoogleCallbackUrl() {
  const baseUrl = getPublicBaseUrl();

  if (!baseUrl) {
    return "/auth/google/callback";
  }

  return `${baseUrl}/auth/google/callback`;
}

async function findOrCreatePlayerFromIdentity({
  provider,
  providerUserId,
  displayName,
  avatarUrl = "",
  email = "",
}) {
  const existingIdentity = await query(
    `
      SELECT
        p.id,
        p.display_name,
        p.avatar_url
      FROM player_identities pi
      JOIN players p ON p.id = pi.player_id
      WHERE pi.provider = $1
        AND pi.provider_user_id = $2
      LIMIT 1
    `,
    [provider, providerUserId],
  );

  if (existingIdentity.rows[0]) {
    const player = existingIdentity.rows[0];

    await query(
      `
        UPDATE players
        SET
          display_name = $2,
          avatar_url = $3,
          last_seen_at = NOW()
        WHERE id = $1
      `,
      [player.id, displayName, avatarUrl],
    );

    await query(
      `
        UPDATE player_identities
        SET
          email = $3,
          last_used_at = NOW()
        WHERE provider = $1
          AND provider_user_id = $2
      `,
      [provider, providerUserId, email],
    );

    return {
      id: player.id,
      displayName,
      avatarUrl,
      provider,
      providerUserId,
      email,
    };
  }

  const newPlayer = await query(
    `
      INSERT INTO players (display_name, avatar_url)
      VALUES ($1, $2)
      RETURNING id, display_name, avatar_url
    `,
    [displayName, avatarUrl],
  );

  const player = newPlayer.rows[0];

  await query(
    `
      INSERT INTO player_identities (
        player_id,
        provider,
        provider_user_id,
        email
      )
      VALUES ($1, $2, $3, $4)
    `,
    [player.id, provider, providerUserId, email],
  );

  await query(
    `
      INSERT INTO player_stats (player_id)
      VALUES ($1)
      ON CONFLICT (player_id) DO NOTHING
    `,
    [player.id],
  );

  return {
    id: player.id,
    displayName: player.display_name,
    avatarUrl: player.avatar_url || "",
    provider,
    providerUserId,
    email,
  };
}

export async function findOrCreateGooglePlayer(profile) {
  const email =
    profile.emails && profile.emails.length > 0
      ? profile.emails[0].value
      : "";

  const avatarUrl =
    profile.photos && profile.photos.length > 0
      ? profile.photos[0].value
      : "";

  return findOrCreatePlayerFromIdentity({
    provider: "google",
    providerUserId: profile.id,
    displayName: profile.displayName || email || "Google Player",
    avatarUrl,
    email,
  });
}

export function setupPassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google login is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getGoogleCallbackUrl(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const player = await findOrCreateGooglePlayer(profile);
          done(null, player);
        } catch (error) {
          done(error);
        }
      },
    ),
  );

  passport.serializeUser((player, done) => {
    done(null, player);
  });

  passport.deserializeUser((player, done) => {
    done(null, player);
  });
}

export { passport };