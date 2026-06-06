import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Keyboard,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../services/supabase/auth';
import { supabase } from '../../services/supabase/client';
import { listProfilesExcept, normalizeMessage, createNotification } from '../../services/supabase/data';
import {
  joinServer,
  getServerById,
  listServerChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  listChannelMessages,
  sendChannelMessage,
  deleteChannelMessage,
  getServerMembers,
  updateMemberRole,
  transferServerOwnership,
  leaveOrKickFromServer,
  deleteServer,
  getUserServerMember,
  updateServer,
} from '../../services/supabase/server';
import { getFileUrl } from '../../src/storage/storageProvider';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupChat() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const insets = useSafeAreaInsets();

  const { groupId: serverId, groupName: serverName, groupImage: serverImage } = params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [serverData, setServerData] = useState(null);
  
  // Channels
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const activeChannelRef = useRef(null);

  // Members and Roles
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState('normal'); // 'admin', 'moderator', 'normal'
  const [usersToInvite, setUsersToInvite] = useState([]);

  // UI States
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [serverOptionsVisible, setServerOptionsVisible] = useState(false);
  const [createChannelVisible, setCreateChannelVisible] = useState(false);
  const [editChannelVisible, setEditChannelVisible] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [memberRoleModalVisible, setMemberRoleModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Password management states
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Input states for creation/editing
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelRoles, setNewChannelRoles] = useState({
    admin: true,
    moderator: true,
    normal: true,
  });

  const flatListRef = useRef();

  // Sync ref
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // Keyboard height adaptation
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

  const loadServerData = useCallback(async () => {
    try {
      const data = await getServerById(serverId);
      setServerData(data);
    } catch (error) {
      console.error('Error loading server details:', error);
    }
  }, [serverId]);

  const loadServerMembersAndRole = useCallback(async () => {
    try {
      const serverMembers = await getServerMembers(serverId);
      setMembers(serverMembers);

      const myMembership = serverMembers.find(m => m.userId === auth.currentUser?.uid);
      if (myMembership) {
        setUserRole(myMembership.role);
      }
    } catch (error) {
      console.error('Error loading server members:', error);
    }
  }, [serverId]);

  const loadChannels = useCallback(async () => {
    try {
      const allChannels = await listServerChannels(serverId);
      // Retrieve member details to get their role for visibility filtering
      const serverMembers = await getServerMembers(serverId);
      const myRole = serverMembers.find(m => m.userId === auth.currentUser?.uid)?.role || 'normal';
      
      // Filter channels to only show those accessible to the current user's role
      const visible = allChannels.filter(c => c.allowedRoles.includes(myRole));
      setChannels(visible);

      // Default active channel to general
      if (visible.length > 0) {
        if (!activeChannelRef.current || !visible.find(vc => vc.id === activeChannelRef.current.id)) {
          setActiveChannel(visible.find(c => c.name === 'general') || visible[0]);
        }
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  }, [serverId]);

  const loadMessages = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const list = await listChannelMessages(activeChannel.id);
      setMessages(list);
    } catch (error) {
      console.error('Error loading channel messages:', error);
    } finally {
      setLoading(false);
    }
  }, [activeChannel]);

  const loadAllProfilesForInvite = useCallback(async () => {
    try {
      const profiles = await listProfilesExcept(auth.currentUser?.email);
      // Filter out users already in the server
      const currentMemberIds = new Set(members.map(m => m.userId));
      const notInServer = profiles
        .map(p => ({ userId: p.uid, ...p }))
        .filter(p => !currentMemberIds.has(p.userId));
      setUsersToInvite(notInServer);
    } catch (error) {
      console.error('Error loading profiles for invitation:', error);
    }
  }, [members]);

  // Initial and dynamic loads
  useEffect(() => {
    if (!auth.currentUser || !serverId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadServerData();
    loadServerMembersAndRole();
    loadChannels();
  }, [serverId, loadServerData, loadServerMembersAndRole, loadChannels]);

  // Load messages when channel switches
  useEffect(() => {
    if (activeChannel) {
      setLoading(true);
      loadMessages();
    }
  }, [activeChannel, loadMessages]);

  // Real-time subscription setup
  useEffect(() => {
    if (!serverId) return;

    const serverChannel = supabase.channel(`server-sync-${serverId}`);

    serverChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels', filter: `server_id=eq.${serverId}` },
        () => {
          loadChannels();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_members', filter: `server_id=eq.${serverId}` },
        () => {
          loadServerMembersAndRole();
          loadChannels(); // channels view depends on roles
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_messages', filter: `server_id=eq.${serverId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            if (payload.new.channel_id === activeChannelRef.current?.id) {
              const msg = normalizeMessage(payload.new);
              setMessages((prev) => [msg, ...prev.filter(m => m.id !== msg.id)]);
            }
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(serverChannel);
    };
  }, [serverId, loadChannels, loadServerMembersAndRole]);

  const handleSendMessage = async () => {
    if (!text.trim() || !auth.currentUser || !activeChannel) return;

    const messageText = text.trim();
    setText('');

    try {
      await sendChannelMessage(activeChannel.id, serverId, {
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

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      Alert.alert('Error', 'Please enter a channel name');
      return;
    }

    const allowedRoles = [];
    if (newChannelRoles.admin) allowedRoles.push('admin');
    if (newChannelRoles.moderator) allowedRoles.push('moderator');
    if (newChannelRoles.normal) allowedRoles.push('normal');

    if (allowedRoles.length === 0) {
      Alert.alert('Error', 'At least one role must be allowed to view the channel');
      return;
    }

    try {
      await createChannel({
        serverId,
        name: newChannelName.trim(),
        description: newChannelDescription.trim(),
        allowedRoles,
      });

      Alert.alert('Success', 'Channel created!');
      setCreateChannelVisible(false);
      setNewChannelName('');
      setNewChannelDescription('');
      setNewChannelRoles({ admin: true, moderator: true, normal: true });
      loadChannels();
    } catch (error) {
      console.error('Error creating channel:', error);
      Alert.alert('Error', 'Failed to create channel');
    }
  };

  const handleEditChannel = async () => {
    if (!newChannelName.trim()) {
      Alert.alert('Error', 'Please enter a channel name');
      return;
    }

    const allowedRoles = [];
    if (newChannelRoles.admin) allowedRoles.push('admin');
    if (newChannelRoles.moderator) allowedRoles.push('moderator');
    if (newChannelRoles.normal) allowedRoles.push('normal');

    try {
      await updateChannel(channelToEdit.id, {
        name: newChannelName.trim(),
        description: newChannelDescription.trim(),
        allowedRoles,
      });

      Alert.alert('Success', 'Channel updated!');
      setEditChannelVisible(false);
      setChannelToEdit(null);
      setNewChannelName('');
      setNewChannelDescription('');
      loadChannels();
    } catch (error) {
      console.error('Error updating channel:', error);
      Alert.alert('Error', 'Failed to update channel');
    }
  };

  const handleDeleteChannel = (channel) => {
    if (channel.name === 'general') {
      Alert.alert('Error', 'The #general channel cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete #${channel.name}? This will permanently remove all messages inside it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChannel(channel.id);
              Alert.alert('Success', 'Channel deleted.');
              loadChannels();
            } catch (error) {
              console.error('Error deleting channel:', error);
              Alert.alert('Error', 'Failed to delete channel');
            }
          }
        }
      ]
    );
  };

  const handleInviteUser = async (userId) => {
    try {
      // Create a server invite notification for the target user
      await createNotification({
        userId,
        type: 'server_invite',
        fromUserId: auth.currentUser?.uid,
        fromUserName: auth.currentUser?.email?.split('@')[0] ?? 'User',
        serverId,
        serverName: serverData?.name,
        read: false,
      });
      Alert.alert('Success', 'Invitation sent!');
      loadAllProfilesForInvite();
    } catch (error) {
      console.error('Error sending server invite:', error);
      Alert.alert('Error', 'Failed to send invite');
    }
  };

  const handleKickMember = (userId, name) => {
    if (userId === serverData?.ownerId) {
      Alert.alert('Error', 'You cannot kick the server owner.');
      return;
    }

    Alert.alert(
      'Kick Member',
      `Are you sure you want to kick ${name} from the server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveOrKickFromServer(serverId, userId);
              Alert.alert('Success', `${name} kicked.`);
              loadServerMembersAndRole();
              setMemberRoleModalVisible(false);
            } catch (error) {
              console.error('Error kicking user:', error);
              Alert.alert('Error', 'Failed to kick user.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateRole = async (targetRole) => {
    if (!selectedMember) return;
    try {
      await updateMemberRole(serverId, selectedMember.userId, targetRole);
      Alert.alert('Success', 'Member role updated!');
      loadServerMembersAndRole();
      setMemberRoleModalVisible(false);
    } catch (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update member role');
    }
  };

  const handleTransferOwnership = () => {
    if (!selectedMember) return;

    Alert.alert(
      'Transfer Ownership',
      `Are you sure you want to transfer ownership to ${selectedMember.name}? You will lose administrative ownership privileges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              await transferServerOwnership(serverId, auth.currentUser.uid, selectedMember.userId);
              Alert.alert('Success', `Ownership transferred to ${selectedMember.name}`);
              loadServerData();
              loadServerMembersAndRole();
              setMemberRoleModalVisible(false);
            } catch (error) {
              console.error('Error transferring server ownership:', error);
              Alert.alert('Error', 'Failed to transfer ownership');
            }
          }
        }
      ]
    );
  };

  const handleLeaveServer = () => {
    if (auth.currentUser.uid === serverData?.ownerId) {
      Alert.alert('Error', 'As the Owner, you cannot leave. Transfer ownership to another user first.');
      return;
    }

    Alert.alert(
      'Leave Server',
      'Are you sure you want to leave this server?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveOrKickFromServer(serverId, auth.currentUser.uid);
              router.back();
            } catch (error) {
              console.error('Error leaving server:', error);
              Alert.alert('Error', 'Failed to leave server');
            }
          }
        }
      ]
    );
  };

  // Password management handler
  const handleSavePassword = async () => {
    if (newPassword.trim() && newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      // Pass empty string or null to remove password, otherwise set new password
      await updateServer(serverId, { password: newPassword.trim() || null });
      await loadServerData();
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');

      if (newPassword.trim()) {
        Alert.alert('Success', 'Server password has been updated.');
      } else {
        Alert.alert('Success', 'Server password has been removed. The server is now public.');
      }
    } catch (error) {
      console.error('Error updating server password:', error);
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('only the server owner')) {
        Alert.alert('Permission Denied', 'Only the server owner can change password settings.');
      } else {
        Alert.alert('Error', 'Failed to update server password.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteServer = () => {
    Alert.alert(
      'Delete Server',
      `Are you sure you want to delete "${serverData?.name || 'this server'}"? This is permanent and deletes all channels and messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteServer(serverId);
              Alert.alert('Success', 'Server deleted.');
              router.back();
            } catch (error) {
              console.error('Error deleting server:', error);
              Alert.alert('Error', 'Failed to delete server');
            }
          }
        }
      ]
    );
  };

  const handleMessageDelete = (messageId, sendBy) => {
    const isOwner = userRole === 'admin';
    const isMod = userRole === 'moderator';
    const isOwnMessage = sendBy === auth.currentUser?.uid;

    if (!isOwnMessage && !isOwner && !isMod) return;

    Alert.alert(
      'Delete Message',
      'Delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChannelMessage(messageId);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          }
        }
      ]
    );
  };

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sendBy === auth.currentUser?.uid;
    const canDelete = isMe || userRole === 'admin' || userRole === 'moderator';

    return (
      <Pressable
        onLongPress={() => canDelete && handleMessageDelete(item.id, item.sendBy)}
        style={({ pressed }) => [
          styles.messagePressable,
          pressed && canDelete && styles.messagePressed
        ]}
      >
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
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
      </Pressable>
    );
  };

  const renderChannelItem = ({ item }) => {
    const isActive = activeChannel?.id === item.id;
    const isStaff = userRole === 'admin' || userRole === 'moderator';

    return (
      <View style={[styles.channelItemWrapper, isActive && { backgroundColor: theme.uiBackground }]}>
        <Pressable
          style={styles.channelButton}
          onPress={() => {
            setActiveChannel(item);
            setSidebarVisible(false);
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={isActive ? '#007AFF' : theme.iconColor} />
          <ThemedText style={[styles.channelText, isActive && { color: '#007AFF', fontWeight: 'bold' }]} numberOfLines={1}>
            {item.name}
          </ThemedText>
        </Pressable>

        {isStaff && item.name !== 'general' && (
          <View style={styles.channelActions}>
            <Pressable
              onPress={() => {
                setChannelToEdit(item);
                setNewChannelName(item.name);
                setNewChannelDescription(item.description);
                setNewChannelRoles({
                  admin: item.allowedRoles.includes('admin'),
                  moderator: item.allowedRoles.includes('moderator'),
                  normal: item.allowedRoles.includes('normal'),
                });
                setEditChannelVisible(true);
              }}
              style={styles.channelIconBtn}
            >
              <Ionicons name="create-outline" size={16} color={theme.iconColor} />
            </Pressable>
            <Pressable onPress={() => handleDeleteChannel(item)} style={styles.channelIconBtn}>
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  if (loading && !activeChannel) {
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.uiBackground, paddingTop: Math.max(insets.top, 12), borderBottomColor: theme.iconColor }]}>
          <Pressable onPress={toggleSidebar} style={styles.menuButton} hitSlop={10}>
            <Ionicons name="menu-outline" size={26} color={theme.iconColor} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <ThemedText title style={styles.headerTitle} numberOfLines={1}>
              {serverData?.name || 'Server'}
            </ThemedText>
            {activeChannel && (
              <ThemedText style={styles.channelSubHeader}>
                #{activeChannel.name}
              </ThemedText>
            )}
          </View>

          <Pressable onPress={() => setServerOptionsVisible(true)} style={styles.optionsButton} hitSlop={10}>
            <Ionicons name="people-outline" size={24} color={theme.iconColor} />
          </Pressable>
        </View>

        {/* Messaging Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, { paddingBottom: 12 }]}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.iconColor} style={{ opacity: 0.3 }} />
              <ThemedText style={styles.emptyText}>No messages in #{activeChannel?.name || 'channel'}</ThemedText>
              <ThemedText style={styles.emptySubtext}>Be the first to start the discussion!</ThemedText>
            </View>
          )}
        />

        {/* Message Input container */}
        <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.iconColor, paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message #${activeChannel?.name || ''}`}
            placeholderTextColor={theme.iconColor}
            style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text }]}
            multiline
            maxLength={2000}
          />
          <Pressable
            onPress={handleSendMessage}
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

        {/* Drawer Sidebar for Channels */}
        <Modal
          visible={sidebarVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={toggleSidebar}
        >
          <View style={styles.drawerOverlay}>
            <Pressable style={styles.drawerDismiss} onPress={toggleSidebar} />
            <View style={[styles.drawerContent, { backgroundColor: theme.background, paddingTop: Math.max(insets.top, 20) }]}>
              {/* Server Name header */}
              <View style={styles.drawerHeader}>
                <View style={[styles.avatarMini, { backgroundColor: theme.uiBackground }]}>
                  {serverData?.image ? (
                    <Image source={{ uri: getFileUrl(serverData.image) }} style={styles.avatarMiniImg} />
                  ) : (
                    <Ionicons name="people" size={18} color={theme.iconColor} />
                  )}
                </View>
                <ThemedText title style={styles.drawerServerName} numberOfLines={1}>
                  {serverData?.name}
                </ThemedText>
              </View>

              <View style={styles.drawerDivider} />

              <View style={styles.channelsHeaderContainer}>
                <ThemedText style={styles.channelsSectionTitle}>TEXT CHANNELS</ThemedText>
                {(userRole === 'admin' || userRole === 'moderator') && (
                  <Pressable
                    onPress={() => {
                      setCreateChannelVisible(true);
                      setSidebarVisible(false);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={20} color={theme.iconColor} />
                  </Pressable>
                )}
              </View>

              <FlatList
                data={channels}
                keyExtractor={(item) => item.id}
                renderItem={renderChannelItem}
                contentContainerStyle={styles.drawerChannelsList}
              />
            </View>
          </View>
        </Modal>

        {/* Server Members / Options Modal */}
        <Modal
          visible={serverOptionsVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setServerOptionsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.dismissArea} onPress={() => setServerOptionsVisible(false)} />
            <View style={[styles.optionsModalContent, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
              <ThemedText title style={styles.modalTitle}>Server Options</ThemedText>

              {/* Server Details */}
              <View style={styles.serverDetailsSummary}>
                <ThemedText style={styles.serverDescText}>{serverData?.description || 'No server description.'}</ThemedText>
              </View>

              {/* Action Buttons */}
              <View style={styles.serverActionsGrid}>
                <ThemedButton
                  style={[styles.actionBtnItem, { backgroundColor: theme.uiBackground }]}
                  onPress={() => {
                    setServerOptionsVisible(false);
                    loadAllProfilesForInvite();
                    setInviteModalVisible(true);
                  }}
                >
                  <Ionicons name="person-add-outline" size={20} color="#007AFF" />
                  <ThemedText style={styles.actionBtnText}>Invite User</ThemedText>
                </ThemedButton>

                {auth.currentUser.uid === serverData?.ownerId && (
                  <ThemedButton
                    style={[styles.actionBtnItem, { backgroundColor: theme.uiBackground }]}
                    onPress={() => {
                      setServerOptionsVisible(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordModalVisible(true);
                    }}
                  >
                    <Ionicons name={serverData?.hasPassword ? 'lock-closed' : 'lock-open-outline'} size={20} color="#FF9500" />
                    <ThemedText style={styles.actionBtnText}>
                      {serverData?.hasPassword ? 'Change Password' : 'Set Password'}
                    </ThemedText>
                  </ThemedButton>
                )}

                {auth.currentUser.uid === serverData?.ownerId ? (
                  <ThemedButton
                    style={[styles.actionBtnItem, { backgroundColor: theme.uiBackground }]}
                    onPress={() => {
                      setServerOptionsVisible(false);
                      handleDeleteServer();
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    <ThemedText style={[styles.actionBtnText, { color: '#FF3B30' }]}>Delete Server</ThemedText>
                  </ThemedButton>
                ) : (
                  <ThemedButton
                    style={[styles.actionBtnItem, { backgroundColor: theme.uiBackground }]}
                    onPress={() => {
                      setServerOptionsVisible(false);
                      handleLeaveServer();
                    }}
                  >
                    <Ionicons name="exit-outline" size={20} color="#FF3B30" />
                    <ThemedText style={[styles.actionBtnText, { color: '#FF3B30' }]}>Leave Server</ThemedText>
                  </ThemedButton>
                )}
              </View>

              <ThemedText style={styles.memberListTitle}>MEMBERS ({members.length})</ThemedText>

              {/* Members List */}
              <FlatList
                data={members}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => {
                  const isOwner = item.userId === serverData?.ownerId;
                  const isMe = item.userId === auth.currentUser.uid;
                  const canManage = userRole === 'admin' && !isMe;

                  return (
                    <Pressable
                      onPress={() => {
                        if (canManage) {
                          setSelectedMember(item);
                          setServerOptionsVisible(false);
                          setMemberRoleModalVisible(true);
                        }
                      }}
                      style={[styles.memberItem, { backgroundColor: theme.uiBackground }]}
                    >
                      <View style={[styles.avatarMini, { backgroundColor: theme.background }]}>
                        {item.profilePhotoPath ? (
                          <Image source={{ uri: getFileUrl(item.profilePhotoPath) }} style={styles.avatarMiniImg} />
                        ) : (
                          <Ionicons name="person" size={14} color={theme.iconColor} />
                        )}
                      </View>
                      <View style={styles.memberInfo}>
                        <ThemedText style={styles.memberName}>{item.name} {isMe && '(You)'}</ThemedText>
                        <ThemedText style={styles.memberEmail}>{item.email}</ThemedText>
                      </View>
                      <View style={[
                        styles.roleBadge,
                        isOwner ? styles.roleBadgeOwner : item.role === 'moderator' ? styles.roleBadgeMod : styles.roleBadgeNormal
                      ]}>
                        <ThemedText style={styles.roleBadgeText}>
                          {isOwner ? 'Owner' : item.role === 'moderator' ? 'Mod' : 'Member'}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                }}
                style={styles.membersListScroll}
              />

              <ThemedButton
                style={[styles.closeButton, { backgroundColor: theme.uiBackground }]}
                onPress={() => setServerOptionsVisible(false)}
              >
                <ThemedText>Close</ThemedText>
              </ThemedButton>
            </View>
          </View>
        </Modal>

        {/* Member Role / Promotion Modal */}
        <Modal
          visible={memberRoleModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMemberRoleModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText title style={styles.modalTitle}>Manage {selectedMember?.name}</ThemedText>

              <ThemedButton
                style={styles.roleOptionRow}
                onPress={() => handleUpdateRole('moderator')}
              >
                <Ionicons name="shield-checkmark-outline" size={22} color="#007AFF" />
                <ThemedText>Promote to Moderator</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={styles.roleOptionRow}
                onPress={() => handleUpdateRole('normal')}
              >
                <Ionicons name="person-outline" size={22} color={theme.iconColor} />
                <ThemedText>Demote to Normal User</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={styles.roleOptionRow}
                onPress={handleTransferOwnership}
              >
                <Ionicons name="swap-horizontal-outline" size={22} color="#4CD964" />
                <ThemedText>Transfer Server Ownership</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={styles.roleOptionRow}
                onPress={() => handleKickMember(selectedMember?.userId, selectedMember?.name)}
              >
                <Ionicons name="ban" size={22} color="#FF3B30" />
                <ThemedText style={{ color: '#FF3B30' }}>Kick from Server</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={[styles.closeButton, { backgroundColor: theme.uiBackground, marginTop: 12 }]}
                onPress={() => setMemberRoleModalVisible(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </ThemedButton>
            </View>
          </View>
        </Modal>

        {/* Create Channel Modal */}
        <Modal
          visible={createChannelVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCreateChannelVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText title style={styles.modalTitle}>Create Channel</ThemedText>

              <TextInput
                style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                placeholder="Channel Name (e.g. study-group)"
                placeholderTextColor={theme.iconColor}
                value={newChannelName}
                onChangeText={setNewChannelName}
                maxLength={40}
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                placeholder="Description"
                placeholderTextColor={theme.iconColor}
                value={newChannelDescription}
                onChangeText={setNewChannelDescription}
                maxLength={100}
              />

              <ThemedText style={styles.rolesHeading}>VISIBLE TO ROLES</ThemedText>
              
              <Pressable
                onPress={() => setNewChannelRoles(r => ({ ...r, normal: !r.normal }))}
                style={styles.checkboxRow}
              >
                <Ionicons
                  name={newChannelRoles.normal ? "checkbox" : "square-outline"}
                  size={22}
                  color={newChannelRoles.normal ? "#007AFF" : theme.iconColor}
                />
                <ThemedText style={styles.checkboxText}>Normal Members</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setNewChannelRoles(r => ({ ...r, moderator: !r.moderator }))}
                style={styles.checkboxRow}
              >
                <Ionicons
                  name={newChannelRoles.moderator ? "checkbox" : "square-outline"}
                  size={22}
                  color={newChannelRoles.moderator ? "#007AFF" : theme.iconColor}
                />
                <ThemedText style={styles.checkboxText}>Moderators</ThemedText>
              </Pressable>

              <View style={styles.checkboxRow}>
                <Ionicons name="checkbox" size={22} color="#007AFF" style={{ opacity: 0.5 }} />
                <ThemedText style={[styles.checkboxText, { opacity: 0.5 }]}>Admins (Always Allowed)</ThemedText>
              </View>

              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.modalButton, { backgroundColor: theme.uiBackground }]}
                  onPress={() => {
                    setCreateChannelVisible(false);
                    setNewChannelName('');
                    setNewChannelDescription('');
                    setNewChannelRoles({ admin: true, moderator: true, normal: true });
                  }}
                >
                  <ThemedText>Cancel</ThemedText>
                </ThemedButton>

                <ThemedButton
                  style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                  onPress={handleCreateChannel}
                >
                  <ThemedText style={{ color: '#fff' }}>Create</ThemedText>
                </ThemedButton>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Channel Modal */}
        <Modal
          visible={editChannelVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditChannelVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText title style={styles.modalTitle}>Edit Channel</ThemedText>

              <TextInput
                style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                placeholder="Channel Name"
                placeholderTextColor={theme.iconColor}
                value={newChannelName}
                onChangeText={setNewChannelName}
                maxLength={40}
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                placeholder="Description"
                placeholderTextColor={theme.iconColor}
                value={newChannelDescription}
                onChangeText={setNewChannelDescription}
                maxLength={100}
              />

              <ThemedText style={styles.rolesHeading}>VISIBLE TO ROLES</ThemedText>
              
              <Pressable
                onPress={() => setNewChannelRoles(r => ({ ...r, normal: !r.normal }))}
                style={styles.checkboxRow}
              >
                <Ionicons
                  name={newChannelRoles.normal ? "checkbox" : "square-outline"}
                  size={22}
                  color={newChannelRoles.normal ? "#007AFF" : theme.iconColor}
                />
                <ThemedText style={styles.checkboxText}>Normal Members</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setNewChannelRoles(r => ({ ...r, moderator: !r.moderator }))}
                style={styles.checkboxRow}
              >
                <Ionicons
                  name={newChannelRoles.moderator ? "checkbox" : "square-outline"}
                  size={22}
                  color={newChannelRoles.moderator ? "#007AFF" : theme.iconColor}
                />
                <ThemedText style={styles.checkboxText}>Moderators</ThemedText>
              </Pressable>

              <View style={styles.checkboxRow}>
                <Ionicons name="checkbox" size={22} color="#007AFF" style={{ opacity: 0.5 }} />
                <ThemedText style={[styles.checkboxText, { opacity: 0.5 }]}>Admins (Always Allowed)</ThemedText>
              </View>

              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.modalButton, { backgroundColor: theme.uiBackground }]}
                  onPress={() => {
                    setEditChannelVisible(false);
                    setChannelToEdit(null);
                    setNewChannelName('');
                    setNewChannelDescription('');
                  }}
                >
                  <ThemedText>Cancel</ThemedText>
                </ThemedButton>

                <ThemedButton
                  style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                  onPress={handleEditChannel}
                >
                  <ThemedText style={{ color: '#fff' }}>Save</ThemedText>
                </ThemedButton>
              </View>
            </View>
          </View>
        </Modal>

        {/* Invite Users Modal */}
        <Modal
          visible={inviteModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background, maxHeight: '80%' }]}>
              <ThemedText title style={styles.modalTitle}>Invite Users</ThemedText>
              
              <FlatList
                data={usersToInvite}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => (
                  <View style={[styles.inviteUserRow, { backgroundColor: theme.uiBackground }]}>
                    <ThemedText style={styles.inviteUserName}>{item.name}</ThemedText>
                    <Pressable
                      style={styles.inviteButton}
                      onPress={() => handleInviteUser(item.userId)}
                    >
                      <Ionicons name="add-circle" size={24} color="#007AFF" />
                    </Pressable>
                  </View>
                )}
                contentContainerStyle={{ gap: 8 }}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>All users are already in this server.</ThemedText>
                  </View>
                )}
              />

              <ThemedButton
                style={[styles.closeButton, { backgroundColor: theme.uiBackground, marginTop: 16 }]}
                onPress={() => setInviteModalVisible(false)}
              >
                <ThemedText>Close</ThemedText>
              </ThemedButton>
            </View>
          </View>
        </Modal>

        {/* Password Management Modal */}
        <Modal
          visible={passwordModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setPasswordModalVisible(false);
            setNewPassword('');
            setConfirmPassword('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="lock-closed" size={36} color="#FF9500" />
                <ThemedText title style={[styles.modalTitle, { marginTop: 12 }]}>
                  Password Settings
                </ThemedText>
                {serverData?.hasPassword && (
                  <ThemedText style={{ fontSize: 12, opacity: 0.5, textAlign: 'center' }}>
                    This server is currently password protected.
                  </ThemedText>
                )}
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
                placeholder={serverData?.hasPassword ? 'New password (leave blank to remove)' : 'Set a password'}
                placeholderTextColor={theme.iconColor}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                maxLength={50}
              />

              {newPassword.trim().length > 0 && (
                <TextInput
                  style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: newPassword !== confirmPassword && confirmPassword.length > 0 ? '#FF3B30' : theme.iconColor }]}
                  placeholder="Confirm password"
                  placeholderTextColor={theme.iconColor}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  maxLength={50}
                />
              )}

              {newPassword !== confirmPassword && confirmPassword.length > 0 && (
                <ThemedText style={{ color: '#FF3B30', fontSize: 12, marginBottom: 8, marginTop: -8 }}>
                  Passwords do not match
                </ThemedText>
              )}

              <View style={styles.modalButtons}>
                <ThemedButton
                  style={[styles.modalButton, { backgroundColor: theme.uiBackground }]}
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <ThemedText>Cancel</ThemedText>
                </ThemedButton>

                <ThemedButton
                  style={[styles.modalButton, { backgroundColor: newPassword.trim() ? '#007AFF' : '#FF3B30' }]}
                  onPress={handleSavePassword}
                  disabled={savingPassword || (newPassword.trim().length > 0 && newPassword !== confirmPassword)}
                >
                  {savingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={{ color: '#fff' }}>
                      {newPassword.trim() ? 'Save Password' : serverData?.hasPassword ? 'Remove Password' : 'Cancel'}
                    </ThemedText>
                  )}
                </ThemedButton>
              </View>
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
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  channelSubHeader: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  optionsButton: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messagePressable: {
    maxWidth: '100%',
  },
  messagePressed: {
    opacity: 0.8,
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
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    color: '#6849a7',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    opacity: 0.5,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
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
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  // Sidebar/Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  drawerDismiss: {
    flex: 1,
  },
  drawerContent: {
    width: SCREEN_WIDTH * 0.75,
    height: '100%',
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 4, height: 0 },
    shadowRadius: 6,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
  },
  drawerServerName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginBottom: 16,
  },
  channelsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  channelsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.6,
  },
  drawerChannelsList: {
    paddingBottom: 40,
  },
  channelItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  channelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  channelActions: {
    flexDirection: 'row',
    gap: 6,
  },
  channelIconBtn: {
    padding: 4,
  },
  // Modal General Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissArea: {
    flex: 1,
    width: '100%',
  },
  optionsModalContent: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalContent: {
    width: '85%',
    padding: 20,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  serverDetailsSummary: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  serverDescText: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.8,
  },
  serverActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtnItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberListTitle: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.5,
    marginBottom: 8,
  },
  membersListScroll: {
    maxHeight: 250,
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarMiniImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeOwner: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  roleBadgeMod: {
    backgroundColor: 'rgba(90, 200, 250, 0.15)',
  },
  roleBadgeNormal: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007AFF',
  },
  roleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
  },
  closeButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  input: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Checkbox UI
  rolesHeading: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.6,
    marginTop: 8,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Invite List
  inviteUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  inviteUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  inviteButton: {
    padding: 2,
  },
});
