import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

initializeApp();

const firestore = getFirestore();

type PostStatusNotification = {
  body: string;
  message: string;
  title: string;
  type: 'post_approved' | 'post_rejected';
};

function getPostStatusNotification(
  status: unknown,
  postTitle: string,
): PostStatusNotification | null {
  if (status === 'approved') {
    return {
      title: 'Post Approved',
      body: `Your "${postTitle}" post is now live in the feed.`,
      message: `Your post "${postTitle}" has been approved and is now live!`,
      type: 'post_approved',
    };
  }

  if (status === 'rejected') {
    return {
      title: 'Post Not Approved',
      body: `Your "${postTitle}" post needs revision.`,
      message: `Your post "${postTitle}" was not approved. Please review our community guidelines and try again.`,
      type: 'post_rejected',
    };
  }

  return null;
}

async function sendExpoPush(
  expoPushToken: string,
  notification: PostStatusNotification,
  postId: string,
) {
  if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
    logger.warn('Stored push token is not an Expo push token.', postId);
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
      to: expoPushToken,
      title: notification.title,
      body: notification.body,
      data: {
        postId,
        type: notification.type,
      },
      sound: 'default',
      priority: 'high',
      channelId: 'foxfindz',
      badge: 1,
    }),
  });

  if (!response.ok) {
    logger.warn('Expo push send failed.', {
      postId,
      status: response.status,
      body: await response.text(),
    });
  }
}

export const onPostApproved = onDocumentUpdated('posts/{postId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) {
    logger.info('Missing before/after snapshots for post update.', event.params.postId);
    return;
  }

  if (before.status === after.status) {
    return;
  }

  const userId = after.userId as string | undefined;
  const postType = after.type as string | undefined;
  const postTitle = after.title as string | undefined;

  if (!userId || !postType || !postTitle) {
    logger.warn('Post status notification is missing userId, type, or title.', event.params.postId);
    return;
  }

  const notification = getPostStatusNotification(after.status, postTitle);

  if (!notification) {
    return;
  }

  const userSnapshot = await firestore.collection('users').doc(userId).get();
  const expoPushToken = userSnapshot.data()?.fcmToken as string | undefined;

  if (!expoPushToken) {
    logger.info('No Expo push token found for post owner.', userId);
  } else {
    await sendExpoPush(expoPushToken, notification, event.params.postId);
  }

  await firestore.collection('notifications').add({
    userId,
    message: notification.message,
    postId: event.params.postId,
    read: false,
    type: notification.type,
    createdAt: FieldValue.serverTimestamp(),
  });
});
