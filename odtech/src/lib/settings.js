export const SYSTEM_PREFERENCES_STORAGE_KEY = "systemPreferences";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  email_alerts: true,
  job_updates: true,
  customer_updates: true,
  system_alerts: true,
};

export const DEFAULT_SYSTEM_PREFERENCES = {
  theme: "dark",
  language: "en",
  timezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      : "UTC",
};

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function normalizeNotificationPreferences(value) {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(isObject(value) ? value : {}),
  };
}

export function readStoredSystemPreferences() {
  if (typeof window === "undefined") {
    return DEFAULT_SYSTEM_PREFERENCES;
  }

  try {
    const rawValue = window.localStorage.getItem(
      SYSTEM_PREFERENCES_STORAGE_KEY,
    );

    if (!rawValue) {
      return DEFAULT_SYSTEM_PREFERENCES;
    }

    return normalizeSystemPreferences(JSON.parse(rawValue));
  } catch (error) {
    console.warn("Failed to read stored system preferences", error);
    return DEFAULT_SYSTEM_PREFERENCES;
  }
}

export function normalizeSystemPreferences(...values) {
  const merged = values.reduce(
    (accumulator, value) => ({
      ...accumulator,
      ...(isObject(value) ? value : {}),
    }),
    { ...DEFAULT_SYSTEM_PREFERENCES },
  );

  const theme = ["dark", "light", "auto"].includes(merged.theme)
    ? merged.theme
    : DEFAULT_SYSTEM_PREFERENCES.theme;
  const language = typeof merged.language === "string" && merged.language
    ? merged.language
    : DEFAULT_SYSTEM_PREFERENCES.language;
  const timezone = typeof merged.timezone === "string" && merged.timezone
    ? merged.timezone
    : DEFAULT_SYSTEM_PREFERENCES.timezone;

  return {
    theme,
    language,
    timezone,
  };
}

function resolveTheme(theme) {
  if (theme !== "auto") {
    return theme;
  }

  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }

  return "dark";
}

export function applySystemPreferences(value) {
  const preferences = normalizeSystemPreferences(value);

  if (typeof document !== "undefined") {
    const resolvedTheme = resolveTheme(preferences.theme);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.lang = preferences.language;
    document.documentElement.dataset.timezone = preferences.timezone;
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        SYSTEM_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences),
      );
    } catch (error) {
      console.warn("Failed to persist system preferences", error);
    }
  }

  return preferences;
}
