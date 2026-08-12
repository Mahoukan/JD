import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const databaseSsl =
  process.env.DATABASE_SSL === "true" ||
  (
    process.env.DATABASE_SSL === undefined &&
    process.env.NODE_ENV === "production"
  );

export const db = connectionString
  ? new Pool({
      connectionString,
      ssl: databaseSsl
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
