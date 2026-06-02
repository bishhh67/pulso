import React from 'react';
import { Pressable, StyleSheet, Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedText from '../ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

export default function NotificationItem({ notification, onPress }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const getIcon = () => {
    switch (notification.type) {
      case 'like': return 'heart';
      case 'comment': return 'chatbubble';
      case 'follow': return 'person-add';
      case 'share': return 'share';
      case 'message': return 'mail';
      default: return 'notifications';
    }
  };

  const getMessage = () => {
    const name = notification.fromUserName || 'Someone';
    switch (notification.type) {
      case 'like': return `${name} liked your post`;
      case 'comment': return `${name} commented on your post`;
      case 'follow': return `${name} started following you`;
      case 'share': return `${name} shared your post`;
      case 'message': return `${name} sent you a message`;
      default: return 'New notification';
    }
  };

  const handlePress = () => {
    onPress();
    
    if (notification.postId) {
      // Navigate to post
      router.push(`/post/${notification.postId}`);
    } else if (notification.type === 'follow') {
      router.push(`/profile/${notification.fromUserId}`);
    }
  };

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: notification.read ? 'transparent' : theme.uiBackground },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.background }]}>
        <Ionicons name={getIcon()} size={24} color={theme.iconColorFocused} />
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
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
});
