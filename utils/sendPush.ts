import { doc, getDoc } from 'firebase/firestore';

import { db } from '../services/firebase';

export async function sendPushToUser(
  targetUserId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!db) {
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, 'users', targetUserId));
    const fcmToken = userSnap.data()?.fcmToken as string | null | undefined;

    if (!fcmToken) {
      return;
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: fcmToken,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        priority: 'high',
        channelId: 'foxfindz',
        badge: 1,
      }),
    });

    if (!response.ok) {
      console.warn('Push notification failed:', await response.text());
    }
  } catch (error) {
    console.warn('sendPushToUser error:', error);
  }
}
