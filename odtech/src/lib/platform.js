import { Capacitor } from "@capacitor/core";

const LIVE_RELOAD_HOSTS = new Set(["10.42.90.156", "192.168.0.192"]);
const capacitorPlatform = Capacitor.getPlatform?.();

export const isMobileApp =
  capacitorPlatform === "android" ||
  capacitorPlatform === "ios" ||
  Capacitor.isNativePlatform() ||
  (typeof window !== "undefined" &&
    LIVE_RELOAD_HOSTS.has(window.location.hostname));
