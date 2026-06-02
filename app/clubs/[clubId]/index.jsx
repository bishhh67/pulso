import React, { useState, useEffect } from 'react';
import { StyleSheet, Image, View, FlatList, Dimensions, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ThemedView from '../../../components/ThemedView';
import ThemedText from '../../../components/ThemedText';
import ThemedButton from '../../../components/ThemedButton';
import Spacer from '../../../components/Spacer';
import PostDetailModal from '../../../components/PostDetailModal';
import CommentModal from '../../../components/CommentModal';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/colors';
import { auth } from '../../../services/supabase/auth';
import { getClubById, getProfileById, listAuthorPosts, updateClub, updateProfile } from '../../../services/supabase/data';
import { getFileUrl } from '../../../src/storage/storageProvider';

const windowWidth = Dimensions.get('window').width;

export default function ClubProfile() {
  const { clubId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [clubData, setClubData] = useState(null);
  const [clubPosts, setClubPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postDetailModalVisible, setPostDetailModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    loadClubData();
    loadClubPosts();
  }, [clubId]);

  const loadClubData = async () => {
    try {
      const data = await getClubById(clubId);
      if (data) {
        setClubData(data);

        if (auth.currentUser) {
          const userDoc = await getProfileById(auth.currentUser.uid);
          const following = userDoc?.following || [];
          setIsFollowing(following.includes(clubId));
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading club:', error);
      setLoading(false);
    }
  };

  const loadClubPosts = async () => {
    try {
      setClubPosts(await listAuthorPosts(clubId, 50, 'club'));
    } catch (error) {
      console.error('Error loading club posts:', error);
    }
  };

  const handlePostPress = (postId) => {
    setSelectedPostId(postId);
    setPostDetailModalVisible(true);
  };

  const handleCommentPress = (post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  const handleFollowToggle = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Login Required', 'Please log in to follow clubs');
        return;
      }

      if (isFollowing) {
        const userDoc = await getProfileById(auth.currentUser.uid);
        const club = await getClubById(clubId);
        await updateProfile(auth.currentUser.uid, {
          following: (userDoc?.following || []).filter((id) => id !== clubId),
        });
        await updateClub(clubId, {
          followers: (club?.followers || []).filter((id) => id !== auth.currentUser.uid),
        });
        setIsFollowing(false);
        
        setClubData(prev => ({
          ...prev,
          followers: prev.followers?.filter(id => id !== auth.currentUser.uid) || []
        }));

        Alert.alert('Unfollowed', `You unfollowed ${clubData.name}`);
      } else {
        const userDoc = await getProfileById(auth.currentUser.uid);
        const club = await getClubById(clubId);
        await updateProfile(auth.currentUser.uid, {
          following: Array.from(new Set([...(userDoc?.following || []), clubId])),
        });
        await updateClub(clubId, {
          followers: Array.from(new Set([...(club?.followers || []), auth.currentUser.uid])),
        });
        setIsFollowing(true);
        
        setClubData(prev => ({
          ...prev,
          followers: [...(prev.followers || []), auth.currentUser.uid]
        }));

        Alert.alert('Following', `You are now following ${clubData.name}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center} safe={true}>
        <ThemedText>Loading club...</ThemedText>
      </ThemedView>
    );
  }

  if (!clubData) {
    return (
      <ThemedView style={styles.center} safe={true}>
        <ThemedText>Club not found</ThemedText>
      </ThemedView>
    );
  }

  const followerCount = clubData.followers?.length || 0;

  return (
    <ThemedView style={styles.container} >
     
      <Spacer height={10} />

      {/* Profile Section - Similar to PersonalProfile */}
      <View style={styles.topRow}>
        <View style={styles.profileImageContainer}>
          {clubData.image ? (
            <Image source={{ uri: getFileUrl(clubData.imagePath || clubData.image) }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, { backgroundColor: theme.uiBackground }]}>
              <Ionicons name="people" size={40} color={theme.iconColor} />
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <ThemedText title style={styles.statNumber}>{clubPosts.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Posts</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText title style={styles.statNumber}>{followerCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Followers</ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={16} />

      {/* Club Name & Bio */}
      <View style={styles.bioContainer}>
        <ThemedText title style={styles.username}>{clubData.name}</ThemedText>
        {clubData.bio && <ThemedText style={styles.bio}>{clubData.bio}</ThemedText>}
      </View>

      <Spacer height={16} />

      {/* Follow Button */}
      <ThemedButton
        onPress={handleFollowToggle}
        style={[
          styles.followButton,
          { backgroundColor: isFollowing ? theme.uiBackground : '#007AFF' }
        ]}
      >
        <ThemedText style={[
          styles.followButtonText,
          { color: isFollowing ? theme.text : '#fff' }
        ]}>
          {isFollowing ? 'Following' : 'Follow'}
        </ThemedText>
      </ThemedButton>

      <Spacer height={16} />

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.iconColor, opacity: 0.2 }]} />

      {/* Posts Grid */}
      {clubPosts.length > 0 ? (
        <FlatList
          data={clubPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <Pressable 
              style={styles.postImageContainer}
              onPress={() => handlePostPress(item.id)}
            >
              {(item.imagePath || item.image) ? (
                <Image source={{ uri: getFileUrl(item.imagePath || item.image) }} style={styles.postImage} />
              ) : (
                <View style={[styles.postImage, { backgroundColor: theme.uiBackground }]}>
                  <ThemedText style={styles.postContent} numberOfLines={3}>
                    {item.content}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          initialNumToRender={9}
          maxToRenderPerBatch={9}
        />
      ) : (
        <View style={styles.emptyPosts}>
          <Ionicons name="images-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
          <ThemedText style={styles.emptyText}>No posts yet</ThemedText>
        </View>
      )}

      {/* Post Detail Modal */}
      <PostDetailModal
        visible={postDetailModalVisible}
        onClose={() => {
          setPostDetailModalVisible(false);
          loadClubPosts(); // Refresh posts
        }}
        postId={selectedPostId}
        onCommentPress={(post) => {
          setPostDetailModalVisible(false);
          handleCommentPress(post);
        }}
      />

      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => {
          setCommentModalVisible(false);
          loadClubPosts(); // Refresh to show new comment count
        }}
        post={selectedPost}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  headerRow: {
    paddingTop: 10,
  },

  backButton: {
    padding: 8,
    width: 44,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileImageContainer: {
    marginRight: 20,
  },

  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },

  stat: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },

  statLabel: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },

  bioContainer: {
    paddingHorizontal: 4,
  },

  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  bio: {
    fontSize: 14,
    opacity: 0.8,
  },

  followButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },

  followButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },

  divider: {
    height: 1,
    marginVertical: 10,
  },

  postImageContainer: {
    margin: 1,
  },

  postImage: {
    width: (windowWidth - 36) / 3,
    height: (windowWidth - 36) / 3,
    justifyContent: 'center',
    alignItems: 'center',
  },

  postContent: {
    fontSize: 10,
    padding: 4,
    textAlign: 'center',
  },

  emptyPosts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.5,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
});
