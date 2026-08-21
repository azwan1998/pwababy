/**
 * Web Push & Local Browser Notification Manager (Crash-Proof)
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch (err) {
    console.warn('Request notification error:', err);
  }

  return false;
}

export function sendLocalNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;

  try {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          const notificationOpts: NotificationOptions & { vibrate?: number[] } = {
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200, 100, 300],
            ...options,
          };
          registration.showNotification(title, notificationOpts as NotificationOptions);
        });
      } else {
        new Notification(title, {
          icon: '/icons/icon-192.png',
          ...options,
        });
      }
    }
  } catch (err) {
    console.warn('Send notification warning:', err);
  }
}
