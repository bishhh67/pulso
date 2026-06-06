import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import Spacer from '../../components/Spacer';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getFileUrl } from '../../src/storage/storageProvider';
import {
  getMarketplaceListingById,
  deleteMarketplaceListing,
  updateMarketplaceListing,
  addMarketplaceComment,
  deleteMarketplaceComment,
} from '../../services/supabase/marketplace';

const { width } = Dimensions.get('window');

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
};

export default function ListingDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const { user } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Replying state: stores the comment object we are replying to
  const [replyToComment, setReplyToComment] = useState(null);

  useEffect(() => {
    loadListing();
  }, [id]);

  const loadListing = async () => {
    try {
      setLoading(true);
      const data = await getMarketplaceListingById(id);
      setListing(data);
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Error', 'Failed to load listing.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSold = async () => {
    if (!listing) return;
    const nextStatus = listing.status === 'active' ? 'sold' : 'active';
    try {
      const updated = await updateMarketplaceListing(listing.id, { status: nextStatus });
      setListing((prev) => ({ ...prev, status: updated.status }));
      Alert.alert('Success', `Listing marked as ${nextStatus === 'sold' ? 'Sold' : 'Available'}.`);
    } catch (error) {
      console.error('Error updating listing status:', error);
      Alert.alert('Error', 'Failed to update listing status.');
    }
  };

  const handleDeleteListing = () => {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMarketplaceListing(listing.id);
            Alert.alert('Deleted', 'Your listing has been removed.');
            router.back();
          } catch (error) {
            console.error('Error deleting listing:', error);
            Alert.alert('Error', 'Failed to delete listing.');
          }
        },
      },
    ]);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const newComment = await addMarketplaceComment({
        listingId: listing.id,
        userId: user?.uid,
        text: commentText.trim(),
        parentId: replyToComment?.id || null,
      });

      // Insert new comment locally to avoid full fetch, or refresh
      setListing((prev) => {
        const comments = [...prev.comments, newComment];
        return { ...prev, comments };
      });

      setCommentText('');
      setReplyToComment(null);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to send comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert('Delete Comment', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMarketplaceComment(commentId);
            setListing((prev) => {
              // Delete parent and all child replies of this comment
              const comments = prev.comments.filter(
                (c) => c.id !== commentId && c.parentId !== commentId
              );
              return { ...prev, comments };
            });
          } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Failed to delete comment.');
          }
        },
      },
    ]);
  };

  const handleMessageSeller = () => {
    if (!listing?.seller) return;
    router.push({
      pathname: '/chat/directMessage',
      params: {
        otherUserId: listing.seller.id,
        otherUserName: listing.seller.name,
        otherUserPhoto: listing.seller.profilePhoto || '',
      },
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.center} safe={true}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ThemedView>
    );
  }

  if (!listing) {
    return (
      <ThemedView style={styles.center} safe={true}>
        <ThemedText title={true}>Listing not found</ThemedText>
        <Spacer height={12} />
        <ThemedButton onPress={() => router.back()}>
          <ThemedText style={{ color: '#fff' }}>Go Back</ThemedText>
        </ThemedButton>
      </ThemedView>
    );
  }

  const isOwner = listing.sellerId === user?.uid;

  // Filter main comments and replies
  const mainComments = listing.comments.filter((c) => !c.parentId);
  const getReplies = (parentId) => listing.comments.filter((c) => c.parentId === parentId);

  return (
    <ThemedView style={styles.container} safe={true}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.title} />
          </Pressable>
          <ThemedText style={styles.headerTitle} numberOfLines={1} title={true}>
            {listing.name}
          </ThemedText>
          {isOwner ? (
            <Pressable onPress={handleDeleteListing} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={22} color="#ff3b30" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Images Pager/Carousel */}
          <View style={styles.carouselContainer}>
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={listing.images}
              keyExtractor={(item, index) => `${item}-${index}`}
              onScroll={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / width);
                setActiveImageIndex(index);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: getFileUrl(item) }} style={styles.carouselImage} />
              )}
            />
            {listing.images.length > 1 && (
              <View style={styles.dotContainer}>
                {listing.images.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      activeImageIndex === idx
                        ? { backgroundColor: '#fff' }
                        : { backgroundColor: 'rgba(255,255,255,0.4)' },
                    ]}
                  />
                ))}
              </View>
            )}
            {listing.status === 'sold' && (
              <View style={styles.soldBanner}>
                <ThemedText style={styles.soldBannerText}>SOLD</ThemedText>
              </View>
            )}
          </View>

          {/* Core Info */}
          <View style={styles.padding}>
            <View style={styles.titleRow}>
              <ThemedText style={styles.price} title={true}>
                Rs. {listing.price.toLocaleString()}
              </ThemedText>
              {listing.status === 'sold' && (
                <View style={styles.soldBadgeSmall}>
                  <ThemedText style={styles.soldBadgeSmallText}>SOLD</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.title} title={true}>
              {listing.name}
            </ThemedText>
            <ThemedText style={styles.timeAgo}>
              Listed {formatTimeAgo(listing.createdAt)}
            </ThemedText>

            <Spacer height={16} />
            <View style={styles.divider} />
            <Spacer height={16} />

            {/* Description */}
            <ThemedText style={styles.sectionTitle} title={true}>
              Description
            </ThemedText>
            <Spacer height={8} />
            <ThemedText style={styles.description}>{listing.description}</ThemedText>

            <Spacer height={16} />
            <View style={styles.divider} />
            <Spacer height={16} />

            {/* Seller Section */}
            <ThemedText style={styles.sectionTitle} title={true}>
              Seller Information
            </ThemedText>
            <Spacer height={12} />
            <View style={styles.sellerRow}>
              {listing.seller?.profilePhoto ? (
                <Image
                  source={{ uri: getFileUrl(listing.seller.profilePhoto) }}
                  style={styles.sellerAvatar}
                />
              ) : (
                <View style={[styles.sellerAvatarPlaceholder, { backgroundColor: theme.uiBackground }]}>
                  <Ionicons name="person" size={24} color={theme.iconColor} />
                </View>
              )}
              <View style={styles.sellerInfo}>
                <ThemedText style={styles.sellerName} title={true}>
                  {listing.seller?.name || 'Anonymous User'}
                </ThemedText>
                <ThemedText style={styles.sellerSub}>{listing.seller?.email}</ThemedText>
              </View>
            </View>

            <Spacer height={20} />

            {/* Action Buttons */}
            {isOwner ? (
              <View style={styles.ownerActions}>
                <ThemedButton
                  style={[styles.actionBtn, { flex: 1, backgroundColor: theme.uiBackground }]}
                  onPress={() =>
                    router.push({
                      pathname: '/marketplace/create',
                      params: { listingId: listing.id },
                    })
                  }
                >
                  <Ionicons name="create-outline" size={20} color={theme.title} />
                  <Spacer width={6} />
                  <ThemedText style={{ color: theme.title, fontWeight: '700' }}>Edit</ThemedText>
                </ThemedButton>

                <ThemedButton
                  style={[
                    styles.actionBtn,
                    { flex: 1.5, backgroundColor: listing.status === 'sold' ? '#4caf50' : '#ff9500' },
                  ]}
                  onPress={handleToggleSold}
                >
                  <Ionicons
                    name={listing.status === 'sold' ? 'checkmark-circle-outline' : 'cash-outline'}
                    size={20}
                    color="#fff"
                  />
                  <Spacer width={6} />
                  <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
                    {listing.status === 'sold' ? 'Mark Available' : 'Mark as Sold'}
                  </ThemedText>
                </ThemedButton>
              </View>
            ) : (
              <ThemedButton
                style={[styles.messageButton, { backgroundColor: Colors.primary }]}
                onPress={handleMessageSeller}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
                <Spacer width={8} />
                <ThemedText style={styles.messageButtonText}>Message Seller</ThemedText>
              </ThemedButton>
            )}

            <Spacer height={20} />
            <View style={styles.divider} />
            <Spacer height={20} />

            {/* Comments Section */}
            <ThemedText style={styles.sectionTitle} title={true}>
              Comments ({listing.comments.length})
            </ThemedText>
            <Spacer height={16} />

            {mainComments.length === 0 ? (
              <ThemedText style={styles.noComments}>No comments yet. Ask a question below!</ThemedText>
            ) : (
              <View>
                {mainComments.map((comment) => {
                  const replies = getReplies(comment.id);
                  return (
                    <View key={comment.id} style={styles.commentBlock}>
                      {/* Main Comment */}
                      <View style={styles.commentItem}>
                        {comment.user?.profilePhoto ? (
                          <Image
                            source={{ uri: getFileUrl(comment.user.profilePhoto) }}
                            style={styles.commentAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.commentAvatarPlaceholder,
                              { backgroundColor: theme.uiBackground },
                            ]}
                          >
                            <Ionicons name="person" size={14} color={theme.iconColor} />
                          </View>
                        )}
                        <View style={styles.commentDetails}>
                          <View style={styles.commentHeader}>
                            <ThemedText style={styles.commentUser} title={true}>
                              {comment.user?.name || 'User'}
                            </ThemedText>
                            <ThemedText style={styles.commentTime}>
                              {formatTimeAgo(comment.createdAt)}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.commentText}>{comment.text}</ThemedText>

                          {/* Comment Actions */}
                          <View style={styles.commentActions}>
                            <Pressable onPress={() => setReplyToComment(comment)}>
                              <ThemedText style={styles.commentActionText}>Reply</ThemedText>
                            </Pressable>
                            {(comment.userId === user?.uid || isOwner) && (
                              <Pressable onPress={() => handleDeleteComment(comment.id)}>
                                <ThemedText style={[styles.commentActionText, { color: '#ff3b30' }]}>
                                  Delete
                                </ThemedText>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Replies */}
                      {replies.map((reply) => (
                        <View key={reply.id} style={[styles.commentItem, styles.replyItem]}>
                          {reply.user?.profilePhoto ? (
                            <Image
                              source={{ uri: getFileUrl(reply.user.profilePhoto) }}
                              style={styles.replyAvatar}
                            />
                          ) : (
                            <View
                              style={[
                                styles.commentAvatarPlaceholder,
                                { backgroundColor: theme.uiBackground },
                              ]}
                            >
                              <Ionicons name="person" size={12} color={theme.iconColor} />
                            </View>
                          )}
                          <View style={styles.commentDetails}>
                            <View style={styles.commentHeader}>
                              <View style={styles.replyUserRow}>
                                <ThemedText style={styles.commentUser} title={true}>
                                  {reply.user?.name || 'User'}
                                </ThemedText>
                                {reply.userId === listing.sellerId && (
                                  <View style={styles.sellerPill}>
                                    <ThemedText style={styles.sellerPillText}>Seller</ThemedText>
                                  </View>
                                )}
                              </View>
                              <ThemedText style={styles.commentTime}>
                                {formatTimeAgo(reply.createdAt)}
                              </ThemedText>
                            </View>
                            <ThemedText style={styles.commentText}>{reply.text}</ThemedText>

                            <View style={styles.commentActions}>
                              {(reply.userId === user?.uid || isOwner) && (
                                <Pressable onPress={() => handleDeleteComment(reply.id)}>
                                  <ThemedText style={[styles.commentActionText, { color: '#ff3b30' }]}>
                                    Delete
                                  </ThemedText>
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
            <Spacer height={40} />
          </View>
        </ScrollView>

        {/* Reply/Comment Input Dock */}
        <View style={[styles.inputDock, { backgroundColor: theme.navBackground }]}>
          {replyToComment && (
            <View style={styles.replyBanner}>
              <ThemedText style={styles.replyBannerText} numberOfLines={1}>
                Replying to <ThemedText style={{ fontWeight: 'bold' }}>{replyToComment.user?.name}</ThemedText>
              </ThemedText>
              <Pressable onPress={() => setReplyToComment(null)}>
                <Ionicons name="close-circle" size={18} color={theme.iconColor} />
              </Pressable>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              placeholder={replyToComment ? 'Write a reply...' : 'Ask a question or comment...'}
              placeholderTextColor={theme.iconColor}
              value={commentText}
              onChangeText={setCommentText}
              style={[styles.input, { color: theme.text, backgroundColor: theme.uiBackground }]}
            />
            <Pressable
              onPress={handleAddComment}
              disabled={submittingComment || !commentText.trim()}
              style={[
                styles.sendBtn,
                { backgroundColor: commentText.trim() ? Colors.primary : theme.uiBackground },
              ]}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color={commentText.trim() ? '#fff' : theme.iconColor} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  backButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: width - 120,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  carouselContainer: {
    width: width,
    height: width * 0.85,
    position: 'relative',
    backgroundColor: '#000',
  },
  carouselImage: {
    width: width,
    height: '100%',
    resizeMode: 'cover',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  soldBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldBannerText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    borderWidth: 4,
    borderColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  padding: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4caf50',
  },
  soldBadgeSmall: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  soldBadgeSmallText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  timeAgo: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  sellerSub: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    padding: 0,
  },
  messageButton: {
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 8,
    padding: 0,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  noComments: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 14,
    marginVertical: 20,
  },
  commentBlock: {
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  replyItem: {
    marginLeft: 44,
    marginTop: 4,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentDetails: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 11,
    opacity: 0.4,
  },
  commentText: {
    fontSize: 14,
    marginTop: 3,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  commentActionText: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.6,
  },
  replyUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerPill: {
    backgroundColor: '#007aff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sellerPillText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  inputDock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 4,
  },
  replyBannerText: {
    fontSize: 13,
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
