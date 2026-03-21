import { create } from 'zustand'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter(n => !n.is_read).length }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),

  markRead: (id) =>
    set((state) => {
      const updated = state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
      return { notifications: updated, unreadCount: updated.filter(n => !n.is_read).length }
    }),
}))

export default useNotificationStore
