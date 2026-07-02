import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db } from "./db.js";

const PgSession = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  console.warn("SESSION_SECRET is not set. Login sessions will not be secure.");
}

export const sessionMiddleware = session({
  name: "trivia.sid",

  store: db
    ? new PgSession({
        pool: db,
        tableName: "session",
        createTableIfMissing: false,
      })
    : undefined,

  secret: process.env.SESSION_SECRET || "temporary-dev-secret-change-me",

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  },
});