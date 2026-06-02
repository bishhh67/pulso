import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, Image, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../services/supabase/auth';
import { getUserFollowing, listAllPosts, listFeedPosts } from '../../services/supabase/data';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import PostCard from '../../components/PostCard_WITH_SHARE';
import CommentModal from '../../components/CommentModal';
import CreatePostButton from '../../components/CreatePostButton';

const clubs = [
  { id: 'robotics', name: 'Robotics', image: 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b' },
  { id: 'music', name: 'Music', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d' },
  { id: 'sports', name: 'Sports', image: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d' },
  { id: 'ai', name: 'AI Society', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995' },
  { id: 'photography', name: 'Photography', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee' },
  { id: 'drama', name: 'Drama', image: 'https://images.unsplash.com/photo-1515165562835-c3b8c97dcbdb' },
  { id: 'literature', name: 'Literature', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794' },
  { id: 'entrepreneurship', name: 'Startup', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd' },
  { id: 'environment', name: 'Environment', image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6' },
  { id: 'it', name: 'IT Club', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
];

export default function Home() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);

  useEffect(() => {
    loadFeedPosts();
  }, []);

  const loadFeedPosts = async () => {
    try {
      if (!auth.currentUser) {
        setPosts(await listAllPosts(50));
        return;
      }

      const following = await getUserFollowing(auth.currentUser.uid);
      const authorsToShow = [...following, auth.currentUser.uid];
      const loadedPosts = authorsToShow.length > 0
        ? await listFeedPosts(auth.currentUser.uid, 50)
        : await listAllPosts(50);
      setPosts(loadedPosts);
    } catch (error) {
      console.error('Error loading feed:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeedPosts();
    setRefreshing(false);
  };

  const handleCommentPress = (post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={posts}
        ListHeaderComponent={() => (
          <>
            {/* Hero box */}
            <Pressable style={styles.heroBox} onPress={() => router.push('/')} />
            <Spacer height={20} />

            {/* Clubs horizontal scroll */}
            <FlatList
              horizontal
              data={clubs}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.clubsRow}
              renderItem={({ item }) => (
                <Pressable style={styles.clubItem} onPress={() => router.push(`/clubs/${item.id}`)}>
                  <ThemedView style={styles.ring}>
                    <Image source={{ uri: item.image }} style={styles.image} />
                  </ThemedView>
                  <ThemedText style={styles.clubName} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                </Pressable>
              )}
            />
            <Spacer height={32} />
          </>
        )}
        renderItem={({ item }) => (
          <PostCard post={item} onCommentPress={handleCommentPress} />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={() => (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No posts yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Follow users or clubs to see their posts</ThemedText>
          </ThemedView>
        )}
      />

      {/* Floating Action Button */}
      <CreatePostButton />

      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => {
          setCommentModalVisible(false);
          loadFeedPosts(); // Refresh to show new comment count
        }}
        post={selectedPost}
      />
    </ThemedView>
  );
}

const SIZE = 70;
const RING = 78;

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroBox: { height: 280, margin: 16, borderRadius: 22, backgroundColor: '#6a00ff' },
  clubsRow: { paddingHorizontal: 16 },
  clubItem: { width: 82, alignItems: 'center', marginRight: 14 },
  ring: { width: RING, height: RING, borderRadius: RING / 2, justifyContent: 'center', alignItems: 'center' },
  image: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  clubName: { marginTop: 6, fontSize: 12, textAlign: 'center' },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.5,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.4,
    textAlign: 'center',
  },
});
