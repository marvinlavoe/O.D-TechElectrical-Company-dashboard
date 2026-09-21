export function createLocalId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomBytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let index = 0; index < randomBytes.length; index += 1) {
      randomBytes[index] = Math.floor(Math.random() * 256);
    }
  }

  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

export function toMinorUnits(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromMinorUnits(value) {
  return Number(value || 0) / 100;
}

export function nowIso() {
  return new Date().toISOString();
}
