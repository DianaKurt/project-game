import fs from "fs/promises";
import path from "path";

function createEmpty() {
  return { wins: 0, losses: 0, draws: 0 };
}

export class JsonStatsRepository {
  constructor({ filePath }) {
    this.filePath = filePath;
    this.data = {};
    this._saveTimer = null;
    this._savePending = false;
  }

  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      this.data = JSON.parse(raw || "{}");
    } catch {
      this.data = {};
      await this._saveNow();
    }
  }

  async getOrCreate(name) {
    const key = String(name);
    if (!this.data[key]) {
      this.data[key] = createEmpty();
      this._scheduleSave();
    }
    return { ...this.data[key] };
  }

  async incWin(name) {
    const s = await this._ensure(name);
    s.wins += 1;
    this._scheduleSave();
  }

  async incLoss(name) {
    const s = await this._ensure(name);
    s.losses += 1;
    this._scheduleSave();
  }

  async incDraw(name) {
    const s = await this._ensure(name);
    s.draws += 1;
    this._scheduleSave();
  }

  async _ensure(name) {
    const key = String(name);
    if (!this.data[key]) this.data[key] = createEmpty();
    return this.data[key];
  }

  _scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(async () => {
      this._saveTimer = null;
      if (this._savePending) return;
      this._savePending = true;
      try {
        await this._saveNow();
      } finally {
        this._savePending = false;
      }
    }, 250);
  }

  async _saveNow() {
    const json = JSON.stringify(this.data, null, 2);
    await fs.writeFile(this.filePath, json, "utf-8");
  }
}
