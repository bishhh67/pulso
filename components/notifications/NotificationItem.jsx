import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedText from '../ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import { getFileUrl } from '../../src/storage/storageProvider';

export default function NotificationItem({ notification, onPress, onAcceptFriendRequest, onRejectFriendRequest }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const getIcon = () => {
    switch (notification.type) {
      case 'like': return 'heart';
      case 'comment': return 'chatbubble';
      case 'follow': return 'person-add';
      case 'friend_request': return 'person-add';
      case 'friend_request_accepted': return 'people';
      case 'friend_request_rejected': return 'close-circle';
      case 'friend_removed': return 'person-remove';
      case 'share': return 'share';
      case 'message':
      case 'direct_message':
        return 'mail';
      default: return 'notifications';
    }
  };

  const getMessage = () => {
    const name = notification.fromUserName || 'Someone';
    switch (notification.type) {
      case 'like': return `${name} liked your post`;
      case 'comment': return `${name} commented on your post`;
      case 'follow': return `${name} started following you`;
      case 'friend_request': return `${name} sent you a friend request`;
      case 'friend_request_accepted': return `${name} accepted your friend request. You are now friends.`;
      case 'friend_request_rejected': return `${name} rejected your friend request`;
      case 'friend_removed': return `${name} removed you from friends`;
      case 'share': return `${name} shared your post`;
      case 'message':
      case 'direct_message':
        return `${name} sent you a message`;
      default: return 'New notification';
    }
  };

  const handlePress = () => {
    onPress?.();

    if (notification.postId) {
      // Navigate to post
      router.push(`/post/${notification.postId}`);
    } else if (notification.type === 'direct_message' || notification.type === 'message') {
      router.push({
        pathname: '/chat/directMessage',
        params: {
          otherUserId: notification.fromUserId,
          otherUserName: notification.fromUserName || 'User',
          otherUserPhoto: notification.fromUserPhoto || '',
        },
      });
    } else if (notification.type === 'follow') {
      router.push(`/profile/${notification.fromUserId}`);
    } else if (notification.type === 'friend_removed' || notification.type === 'friend_request_accepted' || notification.type === 'friend_request_rejected') {
      router.push(`/profile/${notification.fromUserId}`);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: notification.read ? 'transparent' : theme.uiBackground },
      ]}
    >
      <Pressable style={styles.rowContent} onPress={handlePress}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.background }]}>
          {notification.fromUserPhoto ? (
            <Image source={{ uri: getFileUrl(notification.fromUserPhoto) }} style={styles.avatar} />
          ) : (
            <Ionicons name={getIcon()} size={24} color={theme.iconColorFocused} />
          )}
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.message}>{getMessage()}</ThemedText>
          <ThemedText style={styles.time}>
            {formatTime(notification.createdAt)}
          </ThemedText>
        </View>

        {!notification.read && (
          <View style={styles.unreadDot} />
        )}
      </Pressable>

      {notification.type === 'friend_request' && notification.friendRequestStatus === 'pending' && (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => onRejectFriendRequest?.(notification)}
          >
            <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => onAcceptFriendRequest?.(notification)}
          >
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>Accept</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    opacity: 0.6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  acceptButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(127,127,127,0.25)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
