import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Image, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../services/supabase/auth';
import { getPostById, getProfileById, getClubById, togglePostLike } from '../services/supabase/data';
import { getFileUrl } from '../src/storage/storageProvider';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import ThemedButton from './ThemedButton';
import Spacer from './Spacer';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';

export default function PostDetailModal({ visible, onClose, postId, onCommentPress }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (visible && postId) {
      loadPostDetails();
    }
  }, [visible, postId]);

  const loadPostDetails = async () => {
    try {
      setLoading(true);

      const postData = await getPostById(postId);
      if (!postData) {
        Alert.alert('Error', 'Post not found');
        onClose();
        return;
      }

      setPost(postData);

      // Check if current user liked the post
      if (auth.currentUser) {
        setIsLiked(postData.likes?.includes(auth.currentUser.uid) || false);
      }

      // Load author info
      if (postData.authorType === 'user') {
        const authorProfile = await getProfileById(postData.authorId).catch(() => null);
        if (authorProfile) setAuthor({ id: authorProfile.uid, ...authorProfile, type: 'user' });
      } else if (postData.authorType === 'club') {
        const club = await getClubById(postData.authorId).catch(() => null);
        if (club) setAuthor({ id: club.id, ...club, type: 'club' });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading post details:', error);
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'Please log in to like posts');
      return;
    }

    try {
      const updatedPost = await togglePostLike(postId, auth.currentUser.uid);
      setPost(updatedPost);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleAuthorPress = () => {
    if (!author) return;
    onClose();
    if (author.type === 'user') {
      router.push(`/profile/${author.id}`);
    } else {
      router.push(`/clubs/${author.id}`);
    }
  };

  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress(post);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedButton onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.iconColor} />
          </ThemedButton>
          <ThemedText title style={styles.headerTitle}>Post</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading...</ThemedText>
          </View>
        ) : !post ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Post not found</ThemedText>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Author Info */}
            <Pressable style={styles.authorSection} onPress={handleAuthorPress}>
              <View style={[styles.authorAvatar, { backgroundColor: theme.uiBackground }]}>
                {author?.profilePhoto || author?.image ? (
                  <Image 
                    source={{ uri: getFileUrl(author.profilePhotoPath || author.profilePhoto || author.imagePath || author.image) }} 
                    style={styles.avatarImage} 
                  />
                ) : (
                  <Ionicons 
                    name={author?.type === 'club' ? 'people' : 'person'} 
                    size={24} 
                    color={theme.iconColor} 
                  />
                )}
              </View>

              <View style={styles.authorInfo}>
                <ThemedText style={styles.authorName}>
                  {author?.name || 'Unknown'}
                </ThemedText>
                <ThemedText style={styles.postTime}>
                  {formatTime(post.createdAt)}
                </ThemedText>
              </View>
            </Pressable>

            <Spacer height={16} />

            {/* Post Content */}
            {post.content && (
              <>
                <ThemedText style={styles.postContent}>{post.content}</ThemedText>
                <Spacer height={16} />
              </>
            )}

            {/* Post Image */}
            {(post.imagePath || post.image) && (
              <>
                <Image source={{ uri: getFileUrl(post.imagePath || post.image) }} style={styles.postImage} />
                <Spacer height={16} />
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <View style={styles.actionButtons}>
                <ThemedButton onPress={handleLike} style={styles.actionButton}>
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={28}
                    color={isLiked ? '#FF3B30' : theme.iconColor}
                  />
                  <ThemedText style={styles.actionText}>
                    {post.likes?.length || 0}
                  </ThemedText>
                </ThemedButton>

                <ThemedButton onPress={handleCommentPress} style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={26} color={theme.iconColor} />
                  <ThemedText style={styles.actionText}>
                    {post.comments?.length || 0}
                  </ThemedText>
                </ThemedButton>

                <ThemedButton style={styles.actionButton}>
                  <Ionicons name="share-outline" size={26} color={theme.iconColor} />
                  <ThemedText style={styles.actionText}>
                    {post.shares || 0}
                  </ThemedText>
                </ThemedButton>
              </View>
            </View>

            <Spacer height={20} />

            {/* Comments Section */}
            {post.comments && post.comments.length > 0 && (
              <View style={styles.commentsSection}>
                <ThemedText style={styles.commentsTitle}>
                  Comments ({post.comments.length})
                </ThemedText>
                <Spacer height={12} />
                {post.comments.slice(0, 3).map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={[styles.commentAvatar, { backgroundColor: theme.uiBackground }]}>
                      {comment.userPhoto ? (
                        <Image source={{ uri: comment.userPhoto }} style={styles.commentAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={16} color={theme.iconColor} />
                      )}
                    </View>
                    <View style={styles.commentContent}>
                      <ThemedText style={styles.commentUserName}>{comment.userName}</ThemedText>
                      <ThemedText style={styles.commentText}>{comment.text}</ThemedText>
                    </View>
                  </View>
                ))}
                {post.comments.length > 3 && (
                  <ThemedButton onPress={handleCommentPress} style={styles.viewAllButton}>
                    <ThemedText style={styles.viewAllText}>
                      View all {post.comments.length} comments
                    </ThemedText>
                  </ThemedButton>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Bottom Action Bar */}
        {post && (
          <View style={[styles.bottomBar, { backgroundColor: theme.background, borderTopColor: theme.iconColor }]}>
            <ThemedButton onPress={handleCommentPress} style={styles.addCommentButton}>
              <ThemedText style={styles.addCommentText}>Add a comment...</ThemedText>
            </ThemedButton>
          </View>
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  commentsSection: {
    marginBottom: 20,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 10,
  },
  commentAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  viewAllButton: {
    padding: 8,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addCommentButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  addCommentText: {
    fontSize: 15,
    opacity: 0.6,
  },
});
