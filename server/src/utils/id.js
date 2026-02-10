import crypto from "crypto";

export function createId() {
  return crypto.randomBytes(6).toString("hex"); // 12 chars
}
