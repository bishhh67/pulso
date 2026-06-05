import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import { supabase } from '../../services/supabase/client';
import {
  areUsersFriends,
  deleteDirectMessage,
  getDirectChatPreference,
  hideDirectChat,
  listDirectMessages,
  muteDirectChat,
  normalizeMessage,
  sendDirectMessage,
  unmuteDirectChat,
} from '../../services/supabase/data';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import { getFileUrl } from '../../src/storage/storageProvider';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import { sendDirectMessagePushNotification } from '../../services/notifications/push';

export default function DirectMessage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const insets = useSafeAreaInsets();

  const otherUserId = String(params.otherUserId || '');
  const otherUserName = params.otherUserName;
  const otherUserPhoto = params.otherUserPhoto;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [messageMenuVisible, setMessageMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [chatPreference, setChatPreference] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);
  const directMessagesChannelRef = useRef(null);

  const currentUserId = String(auth.currentUser?.uid || '');

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  const chatId = [currentUserId, otherUserId].sort().join('_');
  const canDeleteSelectedMessage = selectedMessage?.sendBy === currentUserId;

  const closeMessageMenu = () => {
    setMessageMenuVisible(false);
    setSelectedMessage(null);
  };

  const loadConversation = async () => {
    if (!auth.currentUser || !otherUserId) {
      setLoading(false);
      return;
    }

    try {
      const allowed = await areUsersFriends(auth.currentUser.uid, otherUserId);
      if (!allowed) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const [messagesList, preference] = await Promise.all([
        listDirectMessages(chatId),
        getDirectChatPreference(auth.currentUser.uid, otherUserId),
      ]);

      setMessages(messagesList);
      setChatPreference(preference);
      setAccessDenied(false);
      setLoading(false);
    } catch (error) {
      console.error('Error verifying chat access:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setupRealtime = async () => {
      if (!auth.currentUser || !otherUserId) {
        setLoading(false);
        return;
      }

      await loadConversation();

      if (!isMounted) return;

      if (directMessagesChannelRef.current) {
        void supabase.removeChannel(directMessagesChannelRef.current);
        directMessagesChannelRef.current = null;
      }

      const channelName = `direct-messages-${chatId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const channel = supabase.channel(channelName);

      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages' },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === 'INSERT' && payload.new) {
            if (payload.new.chat_id !== chatId) return;
            const message = normalizeMessage(payload.new);
            if (!message) return;

            setMessages((prev) => [message, ...prev.filter((item) => item.id !== message.id)]);
            return;
          }

          if (payload.eventType === 'DELETE' && payload.old?.id) {
            setMessages((prev) => prev.filter((item) => item.id !== payload.old.id));
            return;
          }

          void loadConversation();
        }
      );

      channel.subscribe();
      directMessagesChannelRef.current = channel;
    };

    void setupRealtime();

    return () => {
      isMounted = false;
      if (directMessagesChannelRef.current) {
        void supabase.removeChannel(directMessagesChannelRef.current);
        directMessagesChannelRef.current = null;
      }
    };
  }, [chatId, otherUserId]);

  const sendMessage = async () => {
    if (!text.trim() || !auth.currentUser) return;
    if (accessDenied) return;

    const messageText = text.trim();
    setText('');

    try {
      const sentMessage = await sendDirectMessage(chatId, {
        text: messageText,
        sendBy: auth.currentUser.uid,
        sendTo: otherUserId,
        type: 'text',
      });

      setMessages((prev) => [sentMessage, ...prev.filter((item) => item.id !== sentMessage.id)]);
      void sendDirectMessagePushNotification({
        recipientId: otherUserId,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.name || auth.currentUser.email?.split('@')?.[0] || 'Someone',
        senderPhoto: auth.currentUser.profilePhotoPath || auth.currentUser.profilePhoto || null,
      }).catch((error) => {
        console.error('Error sending direct message notification:', error);
      });

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setText(messageText);
    }
  };

  const handleDeleteChat = () => {
    if (!currentUserId) return;

    Alert.alert(
      'Delete Chat',
      'This will hide the conversation from your inbox until a new message arrives.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await hideDirectChat(currentUserId, otherUserId);
              setChatMenuVisible(false);
              router.back();
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          },
        },
      ]
    );
  };

  const handleMuteToggle = async () => {
    if (!currentUserId) return;

    try {
      if (chatPreference?.mutedAt) {
        await unmuteDirectChat(currentUserId, otherUserId);
      } else {
        await muteDirectChat(currentUserId, otherUserId);
      }
      setChatMenuVisible(false);
      await loadConversation();
    } catch (error) {
      console.error('Error updating mute state:', error);
      Alert.alert('Error', 'Failed to update mute settings');
    }
  };

  const promptDeleteSelectedMessage = () => {
    const messageToDelete = selectedMessage;
    if (!messageToDelete || messageToDelete.sendBy !== currentUserId) {
      closeMessageMenu();
      return;
    }

    closeMessageMenu();

    Alert.alert('Delete Message', 'This message will be removed for everyone in the chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingMessageId(messageToDelete.id);
          setMessages((prev) => prev.filter((item) => item.id !== messageToDelete.id));

          try {
            await deleteDirectMessage(messageToDelete.id, currentUserId);
          } catch (error) {
            console.error('Error deleting message:', error);
            await loadConversation();
            Alert.alert('Error', 'Failed to delete message');
          } finally {
            setDeletingMessageId(null);
          }
        },
      },
    ]);
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return '';

    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sendBy === currentUserId;
    const isDeleting = deletingMessageId === item.id;

    return (
      <Pressable
        onLongPress={() => {
          setSelectedMessage(item);
          setMessageMenuVisible(true);
        }}
        delayLongPress={250}
        style={({ pressed }) => [
          styles.messagePressable,
          isMe ? styles.myMessageAlign : styles.otherMessageAlign,
          pressed && styles.messagePressed,
          isDeleting && styles.messageDeleting,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <ThemedText style={{ color: isMe ? '#fff' : theme.text }}>
            {item.text}
          </ThemedText>
          {item.createdAt && (
            <ThemedText style={[styles.timeText, { color: isMe ? '#ddd' : theme.iconColor }]}>
              {formatTime(item.createdAt)}
            </ThemedText>
          )}
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <ThemedView safe={true} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.iconColorFocused} />
      </ThemedView>
    );
  }

  if (accessDenied) {
    return (
      <ThemedView safe={true} style={styles.centerContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
        <ThemedText style={styles.emptyText}>Only accepted friends can chat</ThemedText>
        <ThemedButton onPress={() => router.back()} style={{ marginTop: 16 }}>
          <ThemedText style={{ color: '#fff' }}>Go back</ThemedText>
        </ThemedButton>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: theme.uiBackground, borderBottomColor: theme.iconColor }]}>
          <ThemedButton onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.iconColor} />
          </ThemedButton>

          <View style={[styles.avatar, { backgroundColor: theme.background }]}>
            {otherUserPhoto ? (
              <Image source={{ uri: getFileUrl(otherUserPhoto) }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={20} color={theme.iconColor} />
            )}
          </View>

          <View style={styles.headerTitleWrap}>
            <ThemedText title style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {otherUserName || 'User'}
            </ThemedText>
            {chatPreference?.mutedAt && (
              <ThemedText style={styles.mutedLabel}>Muted</ThemedText>
            )}
          </View>

          <Pressable onPress={() => setChatMenuVisible(true)} style={styles.menuButton} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.iconColor} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.chatBody}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
        >
          <FlatList
            ref={flatListRef}
            style={styles.messagesListView}
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: insets.bottom + 12 },
            ]}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.iconColor} style={{ opacity: 0.3 }} />
                <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
                <ThemedText style={styles.emptySubtext}>Send a message to start chatting!</ThemedText>
              </View>
            )}
          />

          <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.iconColor, paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor={theme.iconColor}
              style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text }]}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Pressable
              onPress={sendMessage}
              disabled={!text.trim()}
              style={[
                styles.sendButton,
                { backgroundColor: text.trim() ? '#007AFF' : theme.uiBackground }
              ]}
            >
              <Ionicons
                name="send"
                size={20}
                color={text.trim() ? '#fff' : theme.iconColor}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        <Modal visible={chatMenuVisible} transparent animationType="fade" onRequestClose={() => setChatMenuVisible(false)}>
          <Pressable style={[styles.menuOverlay, { paddingTop: insets.top + 64 }]} onPress={() => setChatMenuVisible(false)}>
            <Pressable style={[styles.menuCard, { backgroundColor: theme.background }]} onPress={() => {}}>
              <Pressable style={styles.menuItem} onPress={handleDeleteChat}>
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <ThemedText style={styles.menuItemTextDanger}>Delete Chat</ThemedText>
              </Pressable>

              <Pressable style={styles.menuItem} onPress={handleMuteToggle}>
                <Ionicons name={chatPreference?.mutedAt ? 'volume-high-outline' : 'notifications-off-outline'} size={18} color={theme.iconColor} />
                <ThemedText style={styles.menuItemText}>
                  {chatPreference?.mutedAt ? 'Unmute User' : 'Mute User'}
                </ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={messageMenuVisible} transparent animationType="fade" onRequestClose={closeMessageMenu}>
          <Pressable style={styles.messageMenuOverlay} onPress={closeMessageMenu}>
            <Pressable style={[styles.messageMenuCard, { backgroundColor: theme.background }]} onPress={() => {}}>
              {canDeleteSelectedMessage && (
                <Pressable style={styles.messageMenuItem} onPress={promptDeleteSelectedMessage}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <ThemedText style={styles.messageMenuDanger}>Delete Message</ThemedText>
                </Pressable>
              )}

              <Pressable style={styles.messageMenuItem} onPress={closeMessageMenu}>
                <Ionicons name="close-outline" size={18} color={theme.iconColor} />
                <ThemedText style={styles.messageMenuText}>Cancel</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  avatar: {
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
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '100%',
  },
  mutedLabel: {
    marginTop: 2,
    fontSize: 12,
    opacity: 0.5,
  },
  chatBody: {
    flex: 1,
  },
  messagesListView: {
    flex: 1,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messagePressable: {
    maxWidth: '100%',
  },
  myMessageAlign: {
    alignSelf: 'flex-end',
  },
  otherMessageAlign: {
    alignSelf: 'flex-start',
  },
  messagePressed: {
    opacity: 0.9,
  },
  messageDeleting: {
    opacity: 0.5,
  },
  messageBubble: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 16,
    maxWidth: '75%',
  },
  myMessage: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.5,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    lineHeight: 18,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  menuButton: {
    padding: 8,
    marginLeft: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  menuCard: {
    minWidth: 180,
    borderRadius: 12,
    paddingVertical: 8,
    overflow: 'hidden',
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemTextDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  messageMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  messageMenuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  messageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageMenuText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageMenuDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
