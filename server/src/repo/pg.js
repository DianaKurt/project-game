/**
 * Optional Postgres repository template.
 * You need pg Pool and a players table:
 *
 * CREATE TABLE IF NOT EXISTS players (
 *   name TEXT PRIMARY KEY,
 *   wins INT NOT NULL DEFAULT 0,
 *   losses INT NOT NULL DEFAULT 0,
 *   draws INT NOT NULL DEFAULT 0
 * );
 */
export class PgStatsRepository {
  constructor({ pool }) {
    this.pool = pool;
  }

  async init() {
    // ensure table exists (optional)
  }

  async getOrCreate(name) {
    // upsert then select
    throw new Error("Not implemented");
  }

  async incWin(name) {
    throw new Error("Not implemented");
  }

  async incLoss(name) {
    throw new Error("Not implemented");
  }

  async incDraw(name) {
    throw new Error("Not implemented");
  }
}
