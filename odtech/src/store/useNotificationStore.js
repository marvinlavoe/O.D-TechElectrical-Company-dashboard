import { create } from "zustand";
import {
  applyNotificationReadState,
  fetchNotificationFeed,
  readNotificationReadIds,
  writeNotificationReadIds,
} from "../lib/notifications";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  panelOpen: false,
  lastFetchedAt: null,
  currentUserId: null,

  setNotifications: (notifications, userId = get().currentUserId) =>
    set({
      notifications,
      currentUserId: userId,
      unreadCount: notifications.filter((notification) => !notification.is_read)
        .length,
    }),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  setPanelOpen: (panelOpen) => set({ panelOpen }),

  fetchNotifications: async (profile, currentUser = null) => {
    const userId = currentUser?.id || profile?.id || null;

    if (!userId) {
      set({
        notifications: [],
        unreadCount: 0,
        currentUserId: null,
        loading: false,
        lastFetchedAt: null,
      });
      return [];
    }

    set({ loading: true, currentUserId: userId });

    try {
      const notifications = await fetchNotificationFeed(profile, currentUser);
      const hydratedNotifications = applyNotificationReadState(
        notifications,
        userId,
      );

      set({
        notifications: hydratedNotifications,
        unreadCount: hydratedNotifications.filter((notification) => !notification.is_read)
          .length,
        currentUserId: userId,
        loading: false,
        lastFetchedAt: new Date().toISOString(),
      });

      return hydratedNotifications;
    } catch (error) {
      console.error("Notification fetch error:", error);
      set({ loading: false });
      throw error;
    }
  },

  markAllRead: () =>
    set((state) => {
      const currentUserId = state.currentUserId;
      const updatedNotifications = state.notifications.map((notification) => ({
        ...notification,
        is_read: true,
      }));

      if (currentUserId) {
        writeNotificationReadIds(
          currentUserId,
          updatedNotifications.map((notification) => notification.id),
        );
      }

      return {
        notifications: updatedNotifications,
        unreadCount: 0,
      };
    }),

  markRead: (id) =>
    set((state) => {
      const updatedNotifications = state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification,
      );

      if (state.currentUserId) {
        const readIds = readNotificationReadIds(state.currentUserId);
        writeNotificationReadIds(state.currentUserId, [...readIds, id]);
      }

      return {
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter((notification) => !notification.is_read)
          .length,
      };
    }),
}));

export default useNotificationStore;
