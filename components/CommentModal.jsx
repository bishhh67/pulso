import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, FlatList, TextInput, Pressable, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/supabase/auth';
import { getProfileById, getPostById, addPostComment } from '../services/supabase/data';
import { getFileUrl } from '../src/storage/storageProvider';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import ThemedButton from './ThemedButton';
import Spacer from './Spacer';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';

export default function CommentModal({ visible, onClose, post }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (visible && post) {
      loadComments();
      loadCurrentUser();
    }
  }, [visible, post]);

  const loadCurrentUser = async () => {
    if (!auth.currentUser) return;
    try {
      setCurrentUser(await getProfileById(auth.currentUser.uid));
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadComments = async () => {
    if (!post?.id) return;
    try {
      const postData = await getPostById(post.id);
      setComments(postData?.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !auth.currentUser) return;

    try {
      setLoading(true);

      const comment = {
        id: Date.now().toString(),
        userId: auth.currentUser.uid,
        userName: currentUser?.name || 'Anonymous',
        userPhoto: currentUser?.profilePhotoPath || currentUser?.profilePhoto || null,
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
      };

      await addPostComment(post.id, comment);

      setComments(prev => [...prev, comment]);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ThemedView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedButton onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.iconColor} />
            </ThemedButton>
            <ThemedText title style={styles.headerTitle}>Comments</ThemedText>
            <View style={{ width: 44 }} />
          </View>

          <Spacer height={10} />

          {/* Comments List */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <View style={[styles.commentAvatar, { backgroundColor: theme.uiBackground }]}>
                  {item.userPhoto ? (
                    <Image source={{ uri: getFileUrl(item.userPhoto) }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={18} color={theme.iconColor} />
                  )}
                </View>

                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <ThemedText style={styles.commentUserName}>{item.userName}</ThemedText>
                    <ThemedText style={styles.commentTime}>{formatTime(item.createdAt)}</ThemedText>
                  </View>
                  <ThemedText style={styles.commentText}>{item.text}</ThemedText>
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
                <Spacer height={12} />
                <ThemedText style={styles.emptyText}>No comments yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>Be the first to comment!</ThemedText>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />

          {/* Comment Input */}
          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.iconColor }]}>
            <View style={[styles.commentAvatar, { backgroundColor: theme.uiBackground }]}>
              {currentUser?.profilePhoto ? (
                <Image source={{ uri: getFileUrl(currentUser.profilePhotoPath || currentUser.profilePhoto) }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={18} color={theme.iconColor} />
              )}
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text }]}
              placeholder="Write a comment..."
              placeholderTextColor={theme.iconColor}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />

            <ThemedButton
              onPress={handleAddComment}
              disabled={!commentText.trim() || loading}
              style={[
                styles.sendButton,
                { backgroundColor: commentText.trim() ? '#007AFF' : theme.uiBackground }
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={commentText.trim() ? '#fff' : theme.iconColor} 
                />
              )}
            </ThemedButton>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
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
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.5,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.4,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
