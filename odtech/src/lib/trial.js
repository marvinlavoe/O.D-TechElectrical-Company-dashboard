import { queryDatabase, runDatabase } from "../db/sqlite";

export const TRIAL_ENABLED = true;
export const TRIAL_DURATION_DAYS = 30;

const TRIAL_START_KEY = "trial_started_at";
const TRIAL_LAST_SEEN_KEY = "trial_last_seen_at";

async function readSetting(key) {
  const result = await queryDatabase(
    "SELECT value FROM app_settings WHERE key = ?",
    [key],
  );
  return result.values?.[0]?.value || null;
}

async function writeSetting(key, value) {
  await runDatabase(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()],
  );
}

export async function getTrialStatus() {
  if (!TRIAL_ENABLED) {
    return { enabled: false, expired: false, remainingMs: null };
  }

  const now = Date.now();
  const storedStart = await readSetting(TRIAL_START_KEY);
  const storedLastSeen = await readSetting(TRIAL_LAST_SEEN_KEY);
  const lastSeen = Number(storedLastSeen || 0);

  if (lastSeen > now) {
    return {
      enabled: true,
      expired: true,
      remainingMs: 0,
      clockAdjusted: true,
    };
  }

  const startedAt = storedStart ? Number(storedStart) : now;
  if (!storedStart) {
    await writeSetting(TRIAL_START_KEY, String(startedAt));
  }
  await writeSetting(TRIAL_LAST_SEEN_KEY, String(now));

  const durationMs = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, startedAt + durationMs - now);

  return {
    enabled: true,
    expired: remainingMs === 0,
    remainingMs,
    endsAt: startedAt + durationMs,
  };
}

export function formatTrialRemaining(remainingMs) {
  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) return `${days} day${days === 1 ? "" : "s"} remaining`;
  return `${hours} hour${hours === 1 ? "" : "s"} remaining`;
}
