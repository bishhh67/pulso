import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { createNotification, getDirectChatPreference, getProfileById, updateProfile } from '../supabase/data';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const getExpoProjectId = () =>
  Constants?.expoConfig?.extra?.eas?.projectId ||
  Constants?.easConfig?.projectId ||
  Constants?.expoConfig?.extra?.projectId ||
  null;

const sendExpoPushMessages = async (messages) => {
  if (!messages.length) return [];

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.errors?.[0]?.message || 'Failed to send push notification');
  }

  return result;
};

export async function registerPushTokenForCurrentUser(userId) {
  if (!userId || Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = getExpoProjectId();
  if (!projectId) return null;

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse?.data;
  if (!token) return null;

  const profile = await getProfileById(userId).catch(() => null);
  const nextTokens = Array.from(new Set([...(profile?.pushTokens || []), token]));

  await updateProfile(userId, { pushTokens: nextTokens });
  return token;
}

export async function sendDirectMessagePushNotification({
  recipientId,
  senderId,
  senderName,
  senderPhoto,
}) {
  if (!recipientId || !senderId || recipientId === senderId) return { skipped: true };

  const preference = await getDirectChatPreference(recipientId, senderId).catch(() => null);
  if (preference?.mutedAt) {
    return { skipped: true, reason: 'muted' };
  }

  await createNotification({
    userId: recipientId,
    type: 'direct_message',
    fromUserId: senderId,
    fromUserName: senderName || 'Someone',
    fromUserPhoto: senderPhoto || null,
    read: false,
  }).catch((notificationError) => {
    console.error('Error creating direct message notification:', notificationError);
  });

  const recipientProfile = await getProfileById(recipientId).catch(() => null);
  const tokens = Array.from(new Set(recipientProfile?.pushTokens || [])).filter(Boolean);

  if (!tokens.length) {
    return { skipped: true, reason: 'no_tokens' };
  }

  const title = `${senderName || 'Someone'} sent you a message`;
  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body: 'Tap to open the chat',
    data: {
      screen: '/chat/directMessage',
      otherUserId: senderId,
      otherUserName: senderName || 'User',
      otherUserPhoto: senderPhoto || null,
    },
  }));

  const result = await sendExpoPushMessages(messages);

  return result;
}
