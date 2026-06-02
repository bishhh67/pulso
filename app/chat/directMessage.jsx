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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import { listDirectMessages, sendDirectMessage } from '../../services/supabase/data';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import { getFileUrl } from '../../src/storage/storageProvider';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

export default function DirectMessage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const { otherUserId, otherUserName, otherUserPhoto } = params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef();

  // Create consistent chat ID (sorted user IDs)
  const chatId = [auth.currentUser?.uid, otherUserId].sort().join('_');

  useEffect(() => {
    if (!auth.currentUser || !otherUserId) {
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      const messagesList = await listDirectMessages(chatId);
      setMessages(messagesList);
      setLoading(false);
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim() || !auth.currentUser) return;

    const messageText = text.trim();
    setText('');

    try {
      await sendDirectMessage(chatId, {
        text: messageText,
        sendBy: auth.currentUser.uid,
        sendTo: otherUserId,
        type: 'text',
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

          <ThemedText title style={styles.headerTitle}>
            {otherUserName || 'User'}
          </ThemedText>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
});
