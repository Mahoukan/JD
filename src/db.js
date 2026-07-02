import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const db = connectionString
  ? new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    })
  : null;

export async function query(text, params = []) {
  if (!db) {
    throw new Error("DATABASE_URL is not set.");
  }

  return db.query(text, params);
}

export async function testDatabaseConnection() {
  const result = await query("SELECT NOW() AS now");
  return result.rows[0];
}