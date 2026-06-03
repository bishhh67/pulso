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
import {
  acceptFriendRequest,
  getFriendRelation,
  getProfileById,
  listAuthorPosts,
  listFriendIds,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from '../../services/supabase/data';
import { getFileUrl } from '../../src/storage/storageProvider';

const windowWidth = Dimensions.get('window').width;

export default function UserProfile() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [userData, setUserData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [friendRelation, setFriendRelation] = useState({ status: 'none', request: null, friendship: null });
  const [friendCount, setFriendCount] = useState(0);
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
        const friends = await listFriendIds(userId);
        setFriendCount(friends.length);

        if (auth.currentUser && auth.currentUser.uid !== userId) {
          setFriendRelation(await getFriendRelation(auth.currentUser.uid, userId));
        } else {
          setFriendRelation({ status: 'none', request: null, friendship: null });
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

  const refreshProfileState = async () => {
    const updatedProfile = await getProfileById(userId);
    if (updatedProfile) {
      setUserData(updatedProfile);
      const friends = await listFriendIds(userId);
      setFriendCount(friends.length);
    }
    if (auth.currentUser && auth.currentUser.uid !== userId) {
      setFriendRelation(await getFriendRelation(auth.currentUser.uid, userId));
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert('Login Required', 'Please log in to send friend requests');
        return;
      }

      if (auth.currentUser.uid === userId) {
        Alert.alert('Error', 'You cannot send a friend request to yourself');
        return;
      }

      await sendFriendRequest(auth.currentUser.uid, userId);
      await refreshProfileState();
      Alert.alert('Friend request sent', `Your request was sent to ${userData?.name || 'this user'}`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', error.message || 'Failed to send friend request. Please try again.');
    }
  };

  const handleAcceptRequest = async () => {
    try {
      const requestId = friendRelation.request?.id;
      if (!requestId) return;
      await acceptFriendRequest(requestId);
      await refreshProfileState();
      Alert.alert('Friend request accepted', `${userData?.name || 'This user'} is now your friend.`);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request.');
    }
  };

  const handleRejectRequest = async () => {
    try {
      const requestId = friendRelation.request?.id;
      if (!requestId) return;
      await rejectFriendRequest(requestId);
      await refreshProfileState();
      Alert.alert('Friend request rejected', 'The request was rejected.');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject friend request.');
    }
  };

  const handleRemoveFriend = async () => {
    try {
      if (!auth.currentUser) return;
      Alert.alert('Remove Friend', `Remove ${userData?.name || 'this user'} from your friends?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(auth.currentUser.uid, userId);
              await refreshProfileState();
              Alert.alert('Friend removed', `${userData?.name || 'This user'} was removed from your friends.`);
            } catch (removeError) {
              console.error('Error removing friend:', removeError);
              Alert.alert('Error', 'Failed to remove friend.');
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error preparing remove friend:', error);
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

  const isFriend = friendRelation.status === 'friends';
  const incomingRequest = friendRelation.status === 'incoming_pending';
  const outgoingRequest = friendRelation.status === 'outgoing_pending';
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
            <ThemedText title style={styles.statNumber}>{friendCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Friends</ThemedText>
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

      {/* Friend actions (only if not own profile) */}
      {!isOwnProfile && (
        <>
          {incomingRequest ? (
            <View style={styles.friendActionRow}>
              <ThemedButton
                onPress={handleRejectRequest}
                style={[styles.friendButton, { backgroundColor: theme.uiBackground }]}
              >
                <ThemedText style={[styles.friendButtonText, { color: theme.text }]}>Reject</ThemedText>
              </ThemedButton>
              <ThemedButton
                onPress={handleAcceptRequest}
                style={[styles.friendButton, { backgroundColor: '#007AFF' }]}
              >
                <ThemedText style={[styles.friendButtonText, { color: '#fff' }]}>Accept</ThemedText>
              </ThemedButton>
            </View>
          ) : outgoingRequest ? (
            <ThemedButton
              disabled
              style={[styles.friendButton, { backgroundColor: theme.uiBackground, opacity: 0.85 }]}
            >
              <ThemedText style={[styles.friendButtonText, { color: theme.text }]}>Request Sent</ThemedText>
            </ThemedButton>
          ) : isFriend ? (
            <View style={styles.friendActionRow}>
              <ThemedButton
                onPress={() => router.push({
                  pathname: '/chat/directMessage',
                  params: {
                    otherUserId: userId,
                    otherUserName: userData?.name || 'User',
                    otherUserPhoto: userData?.profilePhotoPath || userData?.profilePhoto || '',
                  },
                })}
                style={[styles.friendButton, { backgroundColor: '#007AFF' }]}
              >
                <ThemedText style={[styles.friendButtonText, { color: '#fff' }]}>Message</ThemedText>
              </ThemedButton>
              <ThemedButton
                onPress={handleRemoveFriend}
                style={[styles.friendButton, { backgroundColor: theme.uiBackground }]}
              >
                <ThemedText style={[styles.friendButtonText, { color: theme.text }]}>Remove Friend</ThemedText>
              </ThemedButton>
            </View>
          ) : (
            <ThemedButton
              onPress={handleSendFriendRequest}
              style={[styles.friendButton, { backgroundColor: '#007AFF' }]}
            >
              <ThemedText style={[styles.friendButtonText, { color: '#fff' }]}>
                Send Friend Request
              </ThemedText>
            </ThemedButton>
          )}
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

  // FRIEND ACTIONS
  friendActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  friendButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 1,
  },
  friendButtonText: {
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
