import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

initializeApp();

const firestore = getFirestore();

export const onPostApproved = onDocumentUpdated('posts/{postId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) {
    logger.info('Missing before/after snapshots for post update.', event.params.postId);
    return;
  }

  if (before.status === after.status || after.status !== 'approved') {
    return;
  }

  const userId = after.userId as string | undefined;
  const postType = after.type as string | undefined;
  const postTitle = after.title as string | undefined;

  if (!userId || !postType || !postTitle) {
    logger.warn('Approved post is missing userId, type, or title.', event.params.postId);
    return;
  }

  const userSnapshot = await firestore.collection('users').doc(userId).get();
  const fcmToken = userSnapshot.data()?.fcmToken as string | undefined;

  if (!fcmToken) {
    logger.info('No FCM token found for approved post owner.', userId);
  } else {
    await getMessaging().send({
      token: fcmToken,
      notification: {
        title: 'Your post was approved',
        body: `Your ${postType} item "${postTitle}" is now live.`,
      },
      android: {
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    });
  }

  await firestore.collection('notifications').add({
    userId,
    message: `Your ${postType} post "${postTitle}" was approved.`,
    postId: event.params.postId,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
});
