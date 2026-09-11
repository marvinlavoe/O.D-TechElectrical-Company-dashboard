import { Capacitor } from '@capacitor/core'

const LIVE_RELOAD_HOSTS = new Set(['10.42.90.156', '192.168.0.192'])

export const isMobileApp =
  Capacitor.isNativePlatform() ||
  (typeof window !== 'undefined' && LIVE_RELOAD_HOSTS.has(window.location.hostname))
