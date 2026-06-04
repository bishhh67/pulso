import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import {
  areUsersFriends,
  getDirectChatPreference,
  hideDirectChat,
  listDirectMessages,
  muteDirectChat,
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

  const otherUserId = String(params.otherUserId || '');
  const otherUserName = params.otherUserName;
  const otherUserPhoto = params.otherUserPhoto;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [chatPreference, setChatPreference] = useState(null);
  const flatListRef = useRef();

  // Create consistent chat ID (sorted user IDs)
  const chatId = [String(auth.currentUser?.uid || ''), otherUserId].sort().join('_');

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
      setLoading(false);
    } catch (error) {
      console.error('Error verifying chat access:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConversation();
    const interval = setInterval(() => {
      void loadConversation();
    }, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

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

      setMessages((prev) => [sentMessage, ...prev]);
      void sendDirectMessagePushNotification({
        recipientId: otherUserId,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.name || auth.currentUser.email?.split('@')?.[0] || 'Someone',
        senderPhoto: auth.currentUser.profilePhotoPath || auth.currentUser.profilePhoto || null,
      }).catch((error) => {
        console.error('Error sending direct message notification:', error);
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setText(messageText); // Restore text on error
    }
  };

  const handleDeleteChat = () => {
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
              await hideDirectChat(auth.currentUser.uid, otherUserId);
              setMenuVisible(false);
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
    try {
      if (chatPreference?.mutedAt) {
        await unmuteDirectChat(auth.currentUser.uid, otherUserId);
      } else {
        await muteDirectChat(auth.currentUser.uid, otherUserId);
      }
      setMenuVisible(false);
      await loadConversation();
    } catch (error) {
      console.error('Error updating mute state:', error);
      Alert.alert('Error', 'Failed to update mute settings');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return '';
    
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sendBy === auth.currentUser?.uid;

    return (
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
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.iconColorFocused} />
      </ThemedView>
    );
  }

  if (accessDenied) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="lock-closed-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
        <ThemedText style={styles.emptyText}>Only accepted friends can chat</ThemedText>
        <ThemedButton onPress={() => router.back()} style={{ marginTop: 16 }}>
          <ThemedText style={{ color: '#fff' }}>Go back</ThemedText>
        </ThemedButton>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.uiBackground }]}>
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

          <Pressable onPress={() => setMenuVisible(true)} style={styles.menuButton} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.iconColor} />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.iconColor} style={{ opacity: 0.3 }} />
              <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Send a message to start chatting!</ThemedText>
            </View>
          )}
        />

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.iconColor }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={theme.iconColor}
            style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text }]}
            multiline
            maxLength={2000}
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

        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
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
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    borderBottomColor: 'rgba(128,128,128,0.2)',
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
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageBubble: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 16,
    maxWidth: '75%',
  },
  myMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
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
    transform: [{ scaleY: -1 }], // Flip because list is inverted
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
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
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
  menuButton: {
    padding: 8,
    marginLeft: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 72,
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
});
