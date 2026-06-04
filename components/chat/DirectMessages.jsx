import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import { listDirectChatSummaries } from '../../services/supabase/data';
import { getFileUrl } from '../../src/storage/storageProvider';
import ThemedView from '../ThemedView';
import ThemedText from '../ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

export default function DirectMessages() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const summaries = await listDirectChatSummaries(auth.currentUser.uid);
      setThreads(summaries);
      setLoading(false);
    } catch (error) {
      console.error('Error loading direct message threads:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();

    const interval = setInterval(() => {
      void loadThreads();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadThreads]);

  const handleUserPress = (user) => {
    router.push({
      pathname: '/chat/directMessage',
      params: {
        otherUserId: String(user.userId),
        otherUserName: user.name,
        otherUserPhoto: user.profilePhoto || '',
      },
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.iconColorFocused} />
      </ThemedView>
    );
  }

  if (!auth.currentUser) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="chatbubbles-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
        <ThemedText style={styles.emptyText}>Please log in to chat</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.userItem,
              { backgroundColor: theme.uiBackground },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => handleUserPress(item)}
          >
            <View style={[styles.avatar, { backgroundColor: theme.background }]}>
              {(item.profilePhoto) ? (
                <Image source={{ uri: getFileUrl(item.profilePhoto) }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color={theme.iconColor} />
              )}
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <ThemedText style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {item.name || 'User'}
                </ThemedText>
                {item.mutedAt && (
                  <Ionicons name="notifications-off-outline" size={14} color={theme.iconColor} />
                )}
              </View>
              <ThemedText
                style={[styles.latestMessage, !item.hasMessages && styles.placeholderText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.latestMessageText || 'Start a conversation'}
              </ThemedText>
            </View>

            <Ionicons name="chatbubble-outline" size={20} color={theme.iconColor} />
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
            <ThemedText style={styles.emptyText}>No friends found</ThemedText>
            <ThemedText style={styles.emptySubText}>Only accepted friends appear here</ThemedText>
          </View>
        )}
      />
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
  },
  listContent: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    minWidth: 0,
  },
  latestMessage: {
    fontSize: 13,
    opacity: 0.7,
  },
  placeholderText: {
    opacity: 0.45,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.5,
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.4,
    textAlign: 'center',
  },
});
