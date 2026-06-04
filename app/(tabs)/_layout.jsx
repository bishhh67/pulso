import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, FlatList, Pressable, Keyboard, useColorScheme, Image } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import { listNotifications, getProfileById, updateProfile, listProfilesExcept, listClubs } from '../../services/supabase/data';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase/client';
import ThemedLogo from '../../components/ThemedLogo';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import ThemedIcon from '../../components/ThemedIcon';
import { Colors } from '../../constants/colors';
import { getFileUrl } from '../../src/storage/storageProvider';

const TabsLayout = () => {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;

  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const badgeChannelRef = useRef(null);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  useEffect(() => {
    if (searchActive && auth.currentUser) {
      loadSearchHistory();
    }
  }, [searchActive]);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const loadUnread = async () => {
      try {
        const notifications = await listNotifications(userId);
        setUnreadCount(notifications.filter((n) => !n.read).length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadUnread();
    if (badgeChannelRef.current) {
      void supabase.removeChannel(badgeChannelRef.current);
      badgeChannelRef.current = null;
    }

    const channelName = `notifications-badge-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => {
        void loadUnread();
      }
    );
    channel.subscribe();
    badgeChannelRef.current = channel;

    return () => {
      if (badgeChannelRef.current) {
        void supabase.removeChannel(badgeChannelRef.current);
      }
      badgeChannelRef.current = null;
    };
  }, [userId]);

  const loadSearchHistory = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getProfileById(auth.currentUser.uid);
      setSearchHistory(userDoc?.searchHistory || []);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveToHistory = async (item) => {
    try {
      if (!auth.currentUser) return;

      const historyItem = {
        id: item.id,
        type: item.type,
        name: item.name,
        image: item.profilePhoto || item.image || null, // ✅ Save actual image
        timestamp: new Date().toISOString(),
      };

      const userDoc = await getProfileById(auth.currentUser.uid);
      let currentHistory = userDoc ? (userDoc.searchHistory || []) : [];

      // Remove duplicate
      currentHistory = currentHistory.filter(h => !(h.id === item.id && h.type === item.type));

      // Add new item at beginning
      currentHistory = [historyItem, ...currentHistory];

      // Keep only last 20
      if (currentHistory.length > 20) {
        currentHistory = currentHistory.slice(0, 20);
      }

      await updateProfile(auth.currentUser.uid, { searchHistory: currentHistory });

      setSearchHistory(currentHistory);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  // ✅ Delete single history item
  const deleteHistoryItem = async (itemToDelete) => {
    try {
      if (!auth.currentUser) return;

      const updatedHistory = searchHistory.filter(
        item => !(item.id === itemToDelete.id && item.type === itemToDelete.type)
      );

      await updateProfile(auth.currentUser.uid, { searchHistory: updatedHistory });

      setSearchHistory(updatedHistory);
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  // Clear all history
  const clearSearchHistory = async () => {
    try {
      if (!auth.currentUser) return;
      
      await updateProfile(auth.currentUser.uid, { searchHistory: [] });
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (!text?.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const searchLower = text.toLowerCase();
      const [users, clubs] = await Promise.all([listProfilesExcept(auth.currentUser?.email), listClubs()]);
      const userResults = users.filter((user) => user.name?.toLowerCase().includes(searchLower)).map((user) => ({ id: user.uid, type: 'user', ...user }));
      const clubResults = clubs.filter((club) => club.name?.toLowerCase().includes(searchLower)).map((club) => ({ id: club.id, type: 'club', ...club }));
      setSearchResults([...userResults, ...clubResults]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleSelectResult = async (item) => {
    if (!item?.id) return;
    
    await saveToHistory(item);
    
    setSearchActive(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
    
    if (item.type === 'user') {
      router.push(`/profile/${item.id}`);
    } else if (item.type === 'club') {
      router.push(`/clubs/${item.id}`);
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <ThemedLogo style={{ width: 50, height: 60, borderRadius: 10 }} />
              <View style={styles.headerButtons}>
                <ThemedButton onPress={() => setSearchActive(!searchActive)} style={styles.iconButton}>
                  <Ionicons name={searchActive ? 'close' : 'search'} size={26} color={theme.iconColor} />
                </ThemedButton>

                <Pressable onPress={() => router.push('/notifications')} style={styles.iconButton}>
                  <Ionicons name="notifications-outline" size={26} color={theme.iconColor} />
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <ThemedText style={styles.badgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>

                <ThemedButton onPress={() => router.push('/profile')} style={styles.iconButton}>
                  <Ionicons name="menu" size={26} color={theme.iconColor} />
                </ThemedButton>

              </View>
            </View>
          ),
          headerStyle: {
            backgroundColor: theme.navBackground,
            height: 120,
            shadowColor: 'transparent',
            elevation: 0,
          },
          tabBarStyle: {
            backgroundColor: theme.navBackground,
            borderTopWidth: 0,
            elevation: 0,
            height: 60,
            paddingBottom: 8,
            display: searchActive ? 'none' : 'flex',
          },
          tabBarActiveTintColor: theme.iconColorFocused,
          tabBarInactiveTintColor: theme.iconColor,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'home' : 'home-outline'}
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: 'Notes',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'book' : 'book-outline'}
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'chatbox' : 'chatbox-outline'}
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="marketplace"
          options={{
            title: 'Marketplace',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'cart' : 'cart-outline'}
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="personalProfile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                size={24}
                name={focused ? 'person' : 'person-outline'}
                color={focused ? theme.iconColorFocused : theme.iconColor}
              />
            ),
          }}
        />
      </Tabs>

      {/* Search Overlay */}
      {searchActive && (
        <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.uiBackground }]}>
            <ThemedIcon name="search" size={20} style={styles.searchIcon} />
            <TextInput
              placeholder="Search users or clubs..."
              placeholderTextColor={theme.iconColor}
              value={searchQuery}
              onChangeText={handleSearch}
              style={[styles.searchInput, { color: theme.text }]}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={20} color={theme.iconColor} />
              </Pressable>
            )}
          </View>

          <FlatList
            keyboardShouldPersistTaps="handled"
            data={searchQuery.trim() ? searchResults : searchHistory}
            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
            ListHeaderComponent={() => (
              searchQuery.trim() === '' && searchHistory.length > 0 ? (
                <View style={styles.historyHeader}>
                  <ThemedText style={styles.historyTitle}>Recent</ThemedText>
                  <Pressable onPress={clearSearchHistory}>
                    <ThemedText style={styles.clearButton}>Clear All</ThemedText>
                  </Pressable>
                </View>
              ) : null
            )}
            renderItem={({ item }) => (
              <View style={styles.resultItemWrapper}>
                <Pressable
                  style={({ pressed }) => [
                    styles.resultItem,
                    pressed && styles.resultItemPressed
                  ]}
                  onPress={() => handleSelectResult(item)}
                >
                  <View style={styles.resultContent}>
                    {/* ✅ Show actual profile photo */}
                    <View style={[styles.resultIcon, { backgroundColor: theme.uiBackground }]}>
                      {(item.image || item.profilePhoto) ? (
                        <Image 
                          source={{ uri: getFileUrl(item.imagePath || item.image || item.profilePhotoPath || item.profilePhoto) }} 
                          style={styles.resultImage}
                        />
                      ) : (
                        <Ionicons 
                          name={item.type === 'user' ? 'person' : 'people'} 
                          size={22} 
                          color={theme.iconColorFocused} 
                        />
                      )}
                    </View>

                    <View style={styles.resultText}>
                      <ThemedText style={styles.resultName}>{item.name || 'Unnamed'}</ThemedText>
                      <ThemedText style={styles.resultType}>
                        {item.type === 'user' ? 'User' : 'Club'}
                      </ThemedText>
                    </View>

                    {searchQuery.trim() === '' ? (
                      <Ionicons name="time-outline" size={18} color={theme.iconColor} style={{ opacity: 0.5 }} />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
                    )}
                  </View>
                </Pressable>

                {/* ✅ Delete button (only for history) */}
                {searchQuery.trim() === '' && (
                  <Pressable 
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item);
                    }}
                  >
                    <Ionicons name="close" size={20} color={theme.iconColor} style={{ opacity: 0.5 }} />
                  </Pressable>
                )}
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={theme.iconColor} style={{ opacity: 0.3 }} />
                <ThemedText style={styles.emptyText}>
                  {searchQuery.length > 0 ? `No results found for "${searchQuery}"` : 'No recent searches'}
                </ThemedText>
              </View>
            )}
          />
        </View>
      )}
    </>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerContainer: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    height: '100%',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
    color: '#007AFF',
  },
  resultItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultItem: { 
    flex: 1,
    paddingVertical: 12, 
    paddingHorizontal: 8, 
    borderRadius: 8,
  },
  resultItemPressed: { opacity: 0.6 },
  resultContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
  },
  resultImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  resultText: { 
    flex: 1 
  },
  resultName: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 2 
  },

  resultType: { 
    fontSize: 13, 
    opacity: 0.6 
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 60 
  },
  emptyText: { 
    marginTop: 12, 
    fontSize: 15, 
    opacity: 0.5, 
    textAlign: 'center' 
  },
  
});
