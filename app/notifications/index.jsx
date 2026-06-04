import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NotificationItem from '../../components/notifications/NotificationItem';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/client';
import {
  acceptFriendRequest,
  rejectFriendRequest,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/supabase/data';

export default function Notifications() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = user?.uid;
  const notificationsChannelRef = useRef(null);

  const loadNotifications = async (markViewed = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const notifs = await listNotifications(userId);
      setNotifications(notifs);

      if (markViewed && notifs.length > 0) {
        await markAllNotificationsRead(userId);
        setNotifications(notifs.map((notification) => ({ ...notification, read: true })));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadNotifications(true);

    if (notificationsChannelRef.current) {
      void supabase.removeChannel(notificationsChannelRef.current);
      notificationsChannelRef.current = null;
    }

    const channelName = `notifications-screen-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => {
        void loadNotifications(false);
      }
    );
    channel.subscribe();
    notificationsChannelRef.current = channel;

    return () => {
      if (notificationsChannelRef.current) {
        void supabase.removeChannel(notificationsChannelRef.current);
      }
      notificationsChannelRef.current = null;
    };
  }, [userId]);

  const markAsRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!userId) return;
      await markAllNotificationsRead(userId);
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleFriendRequestAction = async (notification, action) => {
    try {
      if (!notification.friendRequestId) return;

      if (action === 'accept') {
        await acceptFriendRequest(notification.friendRequestId);
      } else if (action === 'reject') {
        await rejectFriendRequest(notification.friendRequestId);
      }

      await loadNotifications(true);
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
    }
  };

  if (!userId) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="notifications-off-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
        <ThemedText style={styles.emptyText}>Please log in to view notifications</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} safe={true}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText title style={styles.title}>Notifications</ThemedText>
          {notifications.some((n) => !n.read) && (
            <View style={styles.unreadDot} />
          )}
        </View>

        {notifications.some((n) => !n.read) && (
          <ThemedButton
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <ThemedText style={styles.markAllText}>Mark all read</ThemedText>
          </ThemedButton>
        )}
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.iconColorFocused} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => markAsRead(item.id)}
              onAcceptFriendRequest={(notification) => handleFriendRequestAction(notification, 'accept')}
              onRejectFriendRequest={(notification) => handleFriendRequestAction(notification, 'reject')}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="notifications-outline" 
                size={64} 
                color={theme.iconColor} 
                style={{ opacity: 0.3 }} 
              />
              <ThemedText style={styles.emptyText}>
                You're all caught up ✨
              </ThemedText>
              <ThemedText style={styles.emptySubText}>
                No new notifications
              </ThemedText>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.7,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 4,
  },
});
