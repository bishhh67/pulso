import React, { useEffect, useState } from 'react';
import { StyleSheet, Image, View, FlatList, Dimensions, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import PostDetailModal from '../../components/PostDetailModal';
import CommentModal from '../../components/CommentModal';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import { auth } from '../../services/supabase/auth';
import { getProfileById, listAuthorPosts, updateProfile } from '../../services/supabase/data';
import { getFileUrl } from '../../src/storage/storageProvider';

const windowWidth = Dimensions.get('window').width;

export default function UserProfile() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [userData, setUserData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postDetailModalVisible, setPostDetailModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'No user ID provided');
      setLoading(false);
      return;
    }
    loadUserData();
    loadUserPosts();
  }, [userId]);

  // Load user data
  const loadUserData = async () => {
    try {
      const data = await getProfileById(userId);
      if (data) {
        setUserData(data);

        // Check if current user is following this user
        if (auth.currentUser && auth.currentUser.uid !== userId) {
          const currentUserDoc = await getProfileById(auth.currentUser.uid);
          const following = currentUserDoc?.following || [];
          setIsFollowing(following.includes(userId));
        }
      } else {
        Alert.alert('Error', 'User not found');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user profile');
      setLoading(false);
    }
  };

  // Load user's posts
  const loadUserPosts = async () => {
    try {
      setUserPosts(await listAuthorPosts(userId, 50, 'user'));
    } catch (error) {
      console.error('Error loading posts:', error);
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

  // Follow/Unfollow user
  const handleFollowToggle = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Login Required', 'Please log in to follow users');
        return;
      }

      if (auth.currentUser.uid === userId) {
        Alert.alert('Error', 'You cannot follow yourself');
        return;
      }

      if (isFollowing) {
        const currentUserDoc = await getProfileById(auth.currentUser.uid);
        const targetUserDoc = await getProfileById(userId);
        await updateProfile(auth.currentUser.uid, {
          following: (currentUserDoc?.following || []).filter((id) => id !== userId),
        });
        await updateProfile(userId, {
          followers: (targetUserDoc?.followers || []).filter((id) => id !== auth.currentUser.uid),
        });
        
        setIsFollowing(false);
        
        // Update local userData to reflect new follower count
        setUserData(prev => ({
          ...prev,
          followers: prev.followers?.filter(id => id !== auth.currentUser.uid) || []
        }));
        
      } else {
        const currentUserDoc = await getProfileById(auth.currentUser.uid);
        const targetUserDoc = await getProfileById(userId);
        await updateProfile(auth.currentUser.uid, {
          following: Array.from(new Set([...(currentUserDoc?.following || []), userId])),
        });
        await updateProfile(userId, {
          followers: Array.from(new Set([...(targetUserDoc?.followers || []), auth.currentUser.uid])),
        });
        
        setIsFollowing(true);
        
        // Update local userData to reflect new follower count
        setUserData(prev => ({
          ...prev,
          followers: [...(prev.followers || []), auth.currentUser.uid]
        }));
      }

    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  if (!userData) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>User not found</ThemedText>
      </ThemedView>
    );
  }

  const followers = userData.followers?.length || 0;
  const following = userData.following?.length || 0;
  const isOwnProfile = auth.currentUser?.uid === userId;

  return (
    <ThemedView style={styles.container}>
      {/* Back Button */}
      <Spacer height = {20} />
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.iconColor} />
        </Pressable>
        <ThemedText title style={styles.headerTitle}>{userData.name || 'User Profile'}</ThemedText>
      </View>

      <Spacer height={20} />

      {/* Profile Info Row */}
      <View style={styles.topRow}>
        <View style={styles.profileImageContainer}>
          {userData.profilePhoto ? (
            <Image source={{ uri: getFileUrl(userData.profilePhotoPath || userData.profilePhoto) }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, { backgroundColor: theme.uiBackground }]}>
              <Ionicons name="person" size={40} color={theme.iconColor} />
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <ThemedText title style={styles.statNumber}>{userPosts.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Posts</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText title style={styles.statNumber}>{followers}</ThemedText>
            <ThemedText style={styles.statLabel}>Followers</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText title style={styles.statNumber}>{following}</ThemedText>
            <ThemedText style={styles.statLabel}>Following</ThemedText>
          </View>
        </View>
      </View>

      <Spacer height={16} />

      {/* Username & Bio */}
      <View style={styles.bioContainer}>
        <ThemedText title style={styles.username}>{userData.name || 'Anonymous'}</ThemedText>
        {userData.bio && <ThemedText style={styles.bio}>{userData.bio}</ThemedText>}
      </View>

      <Spacer height={16} />

      {/* Follow/Following Button (only if not own profile) */}
      {!isOwnProfile && (
        <>
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
        </>
      )}

      {/* Divider Line */}
      <View style={[styles.divider, { backgroundColor: theme.iconColor, opacity: 0.2 }]} />

      {/* Posts Section */}
      {userPosts.length > 0 ? (
        <FlatList
          data={userPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <Pressable 
              style={styles.postImageContainer}
              onPress={() => handlePostPress(item.id)}
            >
              {(item.imagePath || item.image) && (
                <Image source={{ uri: getFileUrl(item.imagePath || item.image) }} style={styles.postImage} />
              )}
              {!(item.imagePath || item.image) && (
                <View style={[styles.postImage, { backgroundColor: theme.uiBackground }]}>
                  <ThemedText style={styles.postContent} numberOfLines={3}>
                    {item.content}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
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
          loadUserPosts(); // Refresh posts
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
          loadUserPosts(); // Refresh to show new comment count
        }}
        post={selectedPost}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  
  // MAIN CONTAINER
  container: { 
    flex: 1,
    paddingHorizontal: 16,
  },

  // HEADER
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  // PROFILE TOP SECTION
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

  // USER STATS
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

  // BIO
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

  // FOLLOW BUTTON
  followButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  followButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },

  // DIVIDER
  divider: {
    height: 1,
    marginVertical: 10,
  },

  // POSTS GRID
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

  // EMPTY STATE
  emptyPosts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.5,
  },

  // CENTER UTILITY
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

});
