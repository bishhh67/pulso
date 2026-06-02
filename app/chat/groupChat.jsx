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
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import { getGroupById, listGroupMessages, listProfilesExcept, sendGroupMessage, addGroupMember, removeGroupMember } from '../../services/supabase/data';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import { getFileUrl } from '../../src/storage/storageProvider';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

export default function GroupChat() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const { groupId, groupName, groupImage } = params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const flatListRef = useRef();

  useEffect(() => {
    if (!auth.currentUser || !groupId) {
      setLoading(false);
      return;
    }

    loadGroupData();
    loadUsers();

    const loadMessages = async () => {
      const messagesList = await listGroupMessages(groupId);
      setMessages(messagesList);
      setLoading(false);
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setGroupData(await getGroupById(groupId));
    } catch (error) {
      console.error('Error loading group:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersList = await listProfilesExcept(auth.currentUser?.email);
      setUsers(usersList.map((user) => ({ userId: user.uid, ...user })));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !auth.currentUser) return;

    const messageText = text.trim();
    setText('');

    try {
      await sendGroupMessage(groupId, {
        text: messageText,
        sendBy: auth.currentUser.uid,
        senderName: auth.currentUser.name || 'User',
        type: 'text',
      });

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setText(messageText);
    }
  };

  const addMember = async (userId) => {
    try {
      await addGroupMember(groupId, userId);
      
      Alert.alert('Success', 'Member added to group');
      setAddMemberVisible(false);
      loadGroupData();
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'Failed to add member');
    }
  };

  const leaveGroup = async () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroupMember(groupId, auth.currentUser.uid);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group');
            }
          }
        }
      ]
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return '';
    
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isAdmin = groupData?.admins?.includes(auth.currentUser?.uid);

  const renderMessage = ({ item }) => {
    const isMe = item.sendBy === auth.currentUser?.uid;

    // Check if it's a shared post
    if (item.type === 'shared_post' && item.sharedPost) {
      return (
        <View style={[styles.sharedPostContainer, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
          <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
            {!isMe && (
              <ThemedText style={styles.senderName}>{item.senderName}</ThemedText>
            )}
            <ThemedText style={{ color: isMe ? '#fff' : theme.text, marginBottom: 8 }}>
              Shared a post
            </ThemedText>
            
            {/* Shared Post Preview */}
            <View style={[styles.sharedPost, { backgroundColor: theme.background }]}>
              {(item.sharedPost.imagePath || item.sharedPost.image) && (
                <Image source={{ uri: getFileUrl(item.sharedPost.imagePath || item.sharedPost.image) }} style={styles.sharedPostImage} />
              )}
              <ThemedText style={styles.sharedPostContent} numberOfLines={3}>
                {item.sharedPost.content}
              </ThemedText>
              <ThemedText style={styles.sharedPostAuthor}>
                By {item.sharedPost.authorName}
              </ThemedText>
            </View>

            {item.createdAt && (
              <ThemedText style={[styles.timeText, { color: isMe ? '#ddd' : theme.iconColor }]}>
                {formatTime(item.createdAt)}
              </ThemedText>
            )}
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.otherMessage,
        ]}
      >
        {!isMe && (
          <ThemedText style={styles.senderName}>{item.senderName}</ThemedText>
        )}
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
            {groupImage ? (
              <Image source={{ uri: getFileUrl(groupImage) }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="people" size={20} color={theme.iconColor} />
            )}
          </View>

          <ThemedText title style={styles.headerTitle}>
            {groupName || 'Group'}
          </ThemedText>

          <ThemedButton onPress={() => setOptionsVisible(true)} style={styles.optionsButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={theme.iconColor} />
          </ThemedButton>
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
              <ThemedText style={styles.emptySubtext}>Start the conversation!</ThemedText>
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

        {/* Options Modal */}
        <Modal
          visible={optionsVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setOptionsVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setOptionsVisible(false)}>
            <Pressable style={[styles.optionsModal, { backgroundColor: theme.background }]}>
              <ThemedText title style={styles.modalTitle}>Group Options</ThemedText>

              <ThemedButton
                style={styles.optionButton}
                onPress={() => {
                  setOptionsVisible(false);
                  // Navigate to group info screen
                }}
              >
                <Ionicons name="information-circle-outline" size={24} color={theme.iconColor} />
                <ThemedText style={styles.optionText}>Group Info</ThemedText>
              </ThemedButton>

              {isAdmin && (
                <ThemedButton
                  style={styles.optionButton}
                  onPress={() => {
                    setOptionsVisible(false);
                    setAddMemberVisible(true);
                  }}
                >
                  <Ionicons name="person-add-outline" size={24} color={theme.iconColor} />
                  <ThemedText style={styles.optionText}>Add Members</ThemedText>
                </ThemedButton>
              )}

              <ThemedButton
                style={styles.optionButton}
                onPress={() => {
                  setOptionsVisible(false);
                  leaveGroup();
                }}
              >
                <Ionicons name="exit-outline" size={24} color="#FF3B30" />
                <ThemedText style={[styles.optionText, { color: '#FF3B30' }]}>Leave Group</ThemedText>
              </ThemedButton>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Add Member Modal */}
        <Modal
          visible={addMemberVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setAddMemberVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.addMemberModal, { backgroundColor: theme.background }]}>
              <ThemedText title style={styles.modalTitle}>Add Members</ThemedText>
              
              <FlatList
                data={users.filter(u => !groupData?.members?.includes(u.userId))}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => (
                  <ThemedButton
                    style={[styles.userItem, { backgroundColor: theme.uiBackground }]}
                    onPress={() => addMember(item.userId)}
                  >
                    <ThemedText>{item.name}</ThemedText>
                    <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                  </ThemedButton>
                )}
              />

              <ThemedButton
                style={[styles.closeButton, { backgroundColor: theme.uiBackground }]}
                onPress={() => setAddMemberVisible(false)}
              >
                <ThemedText>Close</ThemedText>
              </ThemedButton>
            </View>
          </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  optionsButton: {
    padding: 8,
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
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#007AFF',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  sharedPostContainer: {
    maxWidth: '85%',
    marginVertical: 4,
  },
  sharedPost: {
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  sharedPostImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  sharedPostContent: {
    fontSize: 14,
    marginBottom: 4,
  },
  sharedPostAuthor: {
    fontSize: 12,
    opacity: 0.6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  addMemberModal: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  closeButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
});
