import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Image,
  Pressable,
  View,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { auth } from '../services/supabase/auth';
import {
  getProfileById,
  getClubById,
  listProfilesExcept,
  listGroupsForUser,
  sendDirectMessage,
  sendGroupMessage,
  createNotification,
  togglePostLike,
  incrementPostShare,
} from '../services/supabase/data';
import { getFileUrl, resolvePlayableStorageUrl } from '../src/storage/storageProvider';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import ThemedButton from './ThemedButton';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';

const VideoPostPlayer = ({ videoPath, videoThumbnail }) => {
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [resolutionMode, setResolutionMode] = useState('idle');
  const [resolveError, setResolveError] = useState(null);
  const [playerStatus, setPlayerStatus] = useState('idle');
  const [playerError, setPlayerError] = useState(null);

  useEffect(() => {
    let active = true;

    const resolveUrl = async () => {
      if (!videoPath) {
        setResolvedUrl(null);
        setResolutionMode('missing');
        setResolveError(null);
        return;
      }

      setResolvedUrl(null);
      setResolutionMode('loading');
      setResolveError(null);
      setPlayerError(null);
      setPlayerStatus('loading');

      try {
        const result = await resolvePlayableStorageUrl(videoPath);
        if (!active) return;

        console.log('[video] resolved storage url:', result);
        setResolvedUrl(result.url || null);
        setResolutionMode(result.mode || 'unknown');
        if (!result.url) {
          setResolveError(new Error('No playable video URL could be resolved.'));
        }
      } catch (error) {
        if (!active) return;

        console.error('[video] url resolution failed:', { videoPath, error });
        setResolveError(error);
        setResolutionMode('error');
      }
    };

    void resolveUrl();

    return () => {
      active = false;
    };
  }, [videoPath]);

  const player = useVideoPlayer(resolvedUrl ?? null, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    setPlayerStatus(status);

    if (status === 'error' || error) {
      const message = error?.message || 'Unknown playback error';
      setPlayerError(message);
      console.error('[video] playback status error:', {
        videoPath,
        resolvedUrl,
        resolutionMode,
        status,
        error,
      });
      return;
    }

    console.log('[video] playback status change:', {
      videoPath,
      resolvedUrl,
      resolutionMode,
      status,
    });
  });

  if (!videoPath) return null;

  return (
    <View style={styles.videoContainer}>
      {resolvedUrl ? (
        <VideoView
          player={player}
          nativeControls
          contentFit="cover"
          style={styles.videoPlayer}
          onFirstFrameRender={() => {
            console.log('[video] first frame rendered:', {
              videoPath,
              resolvedUrl,
              resolutionMode,
            });
          }}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <ActivityIndicator size="small" color="#fff" />
          <ThemedText style={styles.videoPlaceholderText}>
            {resolveError ? 'Video unavailable' : 'Loading video...'}
          </ThemedText>
          {videoThumbnail ? (
            <Image source={{ uri: getFileUrl(videoThumbnail) }} style={styles.videoFallbackImage} />
          ) : null}
        </View>
      )}

      {(resolveError || playerError || playerStatus === 'error') && (
        <View style={styles.videoErrorOverlay}>
          <Ionicons name="warning-outline" size={20} color="#fff" />
          <ThemedText style={styles.videoErrorText}>
            {playerError || resolveError?.message || 'Playback failed'}
          </ThemedText>
        </View>
      )}
    </View>
  );
};

export default function PostCard({ post, onCommentPress, onPostPress }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [authorData, setAuthorData] = useState(null);
  const [likes, setLikes] = useState(post.likes || []);
  const [liked, setLiked] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadAuthorData();
    setLiked(likes.includes(auth.currentUser?.uid));
  }, []);

  const loadAuthorData = async () => {
    try {
      if (post.authorType === 'user') {
        setAuthorData(await getProfileById(post.authorId));
      } else if (post.authorType === 'club') {
        setAuthorData(await getClubById(post.authorId));
      }
    } catch (error) {
      console.error('Error loading author:', error);
    }
  };

  const loadShareOptions = async () => {
    try {
      if (!auth.currentUser) return;

      const usersList = await listProfilesExcept(auth.currentUser.email);
      const groupsList = await listGroupsForUser(auth.currentUser.uid);
      setUsers(usersList.map((item) => ({ ...item, id: item.uid, type: 'user' })));
      setGroups(groupsList.map((item) => ({ ...item, type: 'group' })));
    } catch (error) {
      console.error('Error loading share options:', error);
    }
  };

  const handleLike = async () => {
    if (!auth.currentUser) return;

    try {
      const updatedPost = await togglePostLike(post.id, auth.currentUser.uid);
      setLikes(updatedPost.likes || []);
      setLiked(!liked);

      if (!liked && post.authorId !== auth.currentUser.uid) {
        await createNotification({
          userId: post.authorId,
          type: 'like',
          fromUserId: auth.currentUser.uid,
          fromUserName: auth.currentUser.name || auth.currentUser.email?.split('@')?.[0] || 'Someone',
          fromUserPhoto: auth.currentUser.profilePhotoPath || auth.currentUser.profilePhoto || null,
          postId: post.id,
          read: false,
        });
      }
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const handleShare = async () => {
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'Please log in to share posts');
      return;
    }

    await loadShareOptions();
    setShareModalVisible(true);
  };

  const shareToChat = async (target) => {
    setSharing(true);
    try {
      const sharedPostData = {
        content: post.content,
        imagePath: post.imagePath || post.image || null,
        authorName: authorData?.name || 'Unknown',
        authorId: post.authorId,
      };

      if (target.type === 'user') {
        const chatId = [auth.currentUser.uid, target.id].sort().join('_');
        await sendDirectMessage(chatId, {
          sendBy: auth.currentUser.uid,
          sendTo: target.id,
          type: 'shared_post',
          sharedPost: sharedPostData,
          text: '',
        });

        await createNotification({
          userId: target.id,
          type: 'share',
          fromUserId: auth.currentUser.uid,
          fromUserName: auth.currentUser.name || auth.currentUser.email?.split('@')?.[0] || 'Someone',
          fromUserPhoto: auth.currentUser.profilePhotoPath || auth.currentUser.profilePhoto || null,
          postId: post.id,
          read: false,
        });
      } else {
        await sendGroupMessage(target.id, {
          sendBy: auth.currentUser.uid,
          senderName: auth.currentUser.name || 'User',
          type: 'shared_post',
          sharedPost: sharedPostData,
          text: '',
        });
      }

      await incrementPostShare(post.id);

      Alert.alert('Success', 'Post shared successfully!');
      setShareModalVisible(false);
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post');
    } finally {
      setSharing(false);
    }
  };

  const handleAuthorPress = () => {
    if (post.authorType === 'user') {
      router.push(`/profile/${post.authorId}`);
    } else if (post.authorType === 'club') {
      router.push(`/clubs/${post.authorId}`);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';

    const now = new Date();
    const postDate = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(postDate.getTime())) return 'Just now';
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return postDate.toLocaleDateString();
  };

  return (
    <Pressable
      style={[styles.container, { borderBottomColor: theme.iconColor }]}
      onPress={() => onPostPress && onPostPress(post)}
    >
      {/* Author Header */}
      <Pressable style={styles.header} onPress={handleAuthorPress}>
        <View style={[styles.avatar, { backgroundColor: theme.uiBackground }]}>
          {authorData?.profilePhoto || authorData?.image ? (
            <Image
              source={{ uri: getFileUrl(authorData.profilePhotoPath || authorData.profilePhoto || authorData.imagePath || authorData.image) }}
              style={styles.avatarImage}
            />
          ) : (
            <Ionicons
              name={post.authorType === 'user' ? 'person' : 'people'}
              size={20}
              color={theme.iconColor}
            />
          )}
        </View>

        <View style={styles.authorInfo}>
          <ThemedText style={styles.authorName}>
            {authorData?.name || 'Loading...'}
          </ThemedText>
          <ThemedText style={styles.timestamp}>
            {formatTimestamp(post.createdAt)}
          </ThemedText>
        </View>
      </Pressable>

      {/* Post Content */}
      {post.content && (
        <ThemedText style={styles.content} numberOfLines={6}>{post.content}</ThemedText>
      )}

      {/* Post Image or Video */}
      {(post.imagePath || post.image) && (
        <Image source={{ uri: getFileUrl(post.imagePath || post.image) }} style={styles.postImage} />
      )}

      {post.video && (
        <VideoPostPlayer videoPath={post.video} videoThumbnail={post.videoThumbnail} />
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Like */}
        <Pressable onPress={(e) => {
          e.stopPropagation();
          handleLike();
        }} style={styles.actionButton}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? '#FF3B30' : theme.iconColor}
          />
          <ThemedText style={styles.actionText}>{likes.length}</ThemedText>
        </Pressable>

        {/* Comment */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onCommentPress(post);
          }}
          style={styles.actionButton}
        >
          <Ionicons name="chatbubble-outline" size={22} color={theme.iconColor} />
          <ThemedText style={styles.actionText}>
            {post.comments?.length || 0}
          </ThemedText>
        </Pressable>

        {/* Share */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          style={styles.actionButton}
        >
          <Ionicons name="share-outline" size={22} color={theme.iconColor} />
          <ThemedText style={styles.actionText}>{post.shares || 0}</ThemedText>
        </Pressable>
      </View>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShareModalVisible(false)}>
          <Pressable style={[styles.shareModal, { backgroundColor: theme.background }]}>
            <ThemedText title style={styles.modalTitle}>Share Post</ThemedText>

            <FlatList
              data={[...users, ...groups]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ThemedButton
                  style={[styles.shareOption, { backgroundColor: theme.uiBackground }]}
                  onPress={() => shareToChat(item)}
                  disabled={sharing}
                >
                  <View style={[styles.shareAvatar, { backgroundColor: theme.background }]}>
                    {item.profilePhoto || item.image ? (
                      <Image source={{ uri: getFileUrl(item.profilePhotoPath || item.profilePhoto || item.imagePath || item.image) }} style={styles.shareAvatarImage} />
                    ) : (
                      <Ionicons name={item.type === 'user' ? 'person' : 'people'} size={20} color={theme.iconColor} />
                    )}
                  </View>
                  <View style={styles.shareInfo}>
                    <ThemedText style={styles.shareName}>{item.name}</ThemedText>
                    <ThemedText style={styles.shareType}>
                      {item.type === 'user' ? 'Direct Message' : 'Group'}
                    </ThemedText>
                  </View>
                  <Ionicons name="send-outline" size={20} color={theme.iconColor} />
                </ThemedButton>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyShare}>
                  <ThemedText style={styles.emptyText}>No chats available</ThemedText>
                </View>
              )}
            />

            <ThemedButton
              style={[styles.closeButton, { backgroundColor: theme.uiBackground }]}
              onPress={() => setShareModalVisible(false)}
            >
              <ThemedText>Cancel</ThemedText>
            </ThemedButton>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.9,
    textAlign: 'center',
    zIndex: 2,
  },
  videoFallbackImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  videoErrorOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoErrorText: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 8,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  shareAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  shareAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  shareInfo: {
    flex: 1,
  },
  shareName: {
    fontSize: 15,
    fontWeight: '600',
  },
  shareType: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyShare: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
  },
  closeButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
});
