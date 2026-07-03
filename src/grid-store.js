import { query } from "./db.js";
import { normalizeGridPack } from "./grid-normalizer.js";

export async function listSavedGrids() {
  const result = await query(`
    SELECT grid_id, grid_name, updated_at
    FROM saved_grids
    ORDER BY grid_name ASC
  `);

  return result.rows.map((row) => ({
    filename: `db:${row.grid_id}`,
    id: row.grid_id,
    name: row.grid_name,
    source: "database",
    updatedAt: row.updated_at
  }));
}

export async function loadSavedGrid(gridId) {
  const result = await query(
    `
      SELECT grid_id, grid_name, grid_json
      FROM saved_grids
      WHERE grid_id = $1
      LIMIT 1
    `,
    [gridId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const grid = normalizeGridPack(row.grid_json);

  if (!grid) {
    return null;
  }

  grid.id = grid.id || row.grid_id;
  grid.name = grid.name || row.grid_name;
  return grid;
}
