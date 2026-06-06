import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Image, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import { listServersForUser, createServer, listAllServers, joinServer, joinServerWithPassword } from '../../services/supabase/server';
import { getFileUrl } from '../../src/storage/storageProvider';
import ThemedView from '../ThemedView';
import ThemedText from '../ThemedText';
import ThemedButton from '../ThemedButton';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

export default function GroupsList() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [activeTab, setActiveTab] = useState('mine'); // 'mine' or 'discover'
  const [servers, setServers] = useState([]);
  const [discoverServers, setDiscoverServers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverDescription, setServerDescription] = useState('');
  const [serverPassword, setServerPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Password prompt modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [joiningServer, setJoiningServer] = useState(null);
  const [joining, setJoining] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const loadServers = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      
      const mine = await listServersForUser(auth.currentUser.uid);
      setServers(mine);

      const all = await listAllServers();
      // Filter discover servers to those the user is NOT a member of
      const mineIds = new Set(mine.map((s) => s.id));
      const discoverable = all.filter((s) => !mineIds.has(s.id));
      setDiscoverServers(discoverable);

      setLoading(false);
    } catch (error) {
      console.error('Error loading servers:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleCreateServer = async () => {
    if (!serverName.trim()) {
      Alert.alert('Error', 'Please enter a server name');
      return;
    }

    setCreating(true);

    try {
      const newServer = await createServer({
        name: serverName.trim(),
        description: serverDescription.trim(),
        image: null,
        ownerId: auth.currentUser.uid,
        password: serverPassword.trim() || null,
      });
      
      Alert.alert('Success', 'Server created successfully!');
      setCreateModalVisible(false);
      setServerName('');
      setServerDescription('');
      setServerPassword('');
      
      // Reload lists and navigate directly to the new server
      await loadServers();
      handleServerPress(newServer);
    } catch (error) {
      console.error('Error creating server:', error);
      Alert.alert('Error', 'Failed to create server');
    } finally {
      setCreating(false);
    }
  };

  const handleServerPress = (server) => {
    router.push({
      pathname: '/chat/groupChat',
      params: {
        groupId: server.id,
        groupName: server.name,
        groupImage: server.imagePath || server.image || '',
      }
    });
  };

  const handleJoinServer = async (server) => {
    if (server.hasPassword) {
      // Show password modal
      setJoiningServer(server);
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordInput(false);
      setPasswordModalVisible(true);
    } else {
      // Join directly (no password)
      Alert.alert(
        'Join Server',
        `Are you sure you want to join "${server.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: async () => {
              try {
                setLoading(true);
                await joinServerWithPassword(server.id, null);
                Alert.alert('Success', `You joined ${server.name}!`);
                await loadServers();
                handleServerPress(server);
              } catch (error) {
                console.error('Error joining server:', error);
                Alert.alert('Error', 'Failed to join server');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    }
  };

  const handlePasswordJoin = async () => {
    if (!joiningServer) return;
    if (!passwordInput.trim()) {
      setPasswordError('Please enter the server password.');
      return;
    }

    setJoining(true);
    setPasswordError('');

    try {
      await joinServerWithPassword(joiningServer.id, passwordInput.trim());
      setPasswordModalVisible(false);
      setPasswordInput('');
      setJoiningServer(null);
      Alert.alert('Success', `You joined ${joiningServer.name}!`);
      await loadServers();
      handleServerPress(joiningServer);
    } catch (error) {
      console.error('Error joining server with password:', error);
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('incorrect password')) {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setPasswordError('Failed to join server. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  // Filter display lists based on search query
  const displayedServers = (activeTab === 'mine' ? servers : discoverServers).filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && servers.length === 0 && discoverServers.length === 0) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.iconColorFocused} />
      </ThemedView>
    );
  }

  if (!auth.currentUser) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Ionicons name="people-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
        <ThemedText style={styles.emptyText}>Please log in to view servers</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.uiBackground }]}>
        <Ionicons name="search" size={20} color={theme.iconColor} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search servers..."
          placeholderTextColor={theme.iconColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.iconColor} />
          </Pressable>
        )}
      </View>

      {/* Internal Tab Bar */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[
            styles.tabButton,
            activeTab === 'mine' && { borderBottomColor: '#007AFF', borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('mine')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'mine' && { color: '#007AFF', fontWeight: 'bold' }]}>
            My Servers
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.tabButton,
            activeTab === 'discover' && { borderBottomColor: '#007AFF', borderBottomWidth: 2 }
          ]}
          onPress={() => setActiveTab('discover')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'discover' && { color: '#007AFF', fontWeight: 'bold' }]}>
            Discover
          </ThemedText>
        </Pressable>
      </View>

      {/* Main List */}
      <FlatList
        data={displayedServers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.serverItem,
              { backgroundColor: theme.uiBackground },
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => activeTab === 'mine' ? handleServerPress(item) : handleJoinServer(item)}
          >
            <View style={[styles.avatar, { backgroundColor: theme.background }]}>
              {(item.imagePath || item.image) && (
                <Image source={{ uri: getFileUrl(item.imagePath || item.image) }} style={styles.avatarImage} />
              )}
              {!(item.imagePath || item.image) && (
                <Ionicons name="people" size={28} color={theme.iconColor} />
              )}
            </View>

            <View style={styles.serverInfo}>
              <View style={styles.serverNameRow}>
                <ThemedText style={styles.serverName} numberOfLines={1}>{item.name}</ThemedText>
                {item.hasPassword && activeTab === 'discover' && (
                  <Ionicons name="lock-closed" size={14} color="#FF9500" style={{ marginLeft: 6 }} />
                )}
              </View>
              <ThemedText style={styles.serverDescription} numberOfLines={2}>
                {item.description || 'No description provided.'}
              </ThemedText>
            </View>

            {activeTab === 'mine' ? (
              <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
            ) : (
              <View style={[styles.joinBadge, item.hasPassword && styles.joinBadgeLocked]}>
                {item.hasPassword && (
                  <Ionicons name="lock-closed" size={12} color="#fff" style={{ marginRight: 4 }} />
                )}
                <ThemedText style={styles.joinText}>Join</ThemedText>
              </View>
            )}
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
            <ThemedText style={styles.emptyText}>
              {activeTab === 'mine' ? 'You have not joined any servers yet.' : 'No new servers to discover.'}
            </ThemedText>
            {activeTab === 'mine' && (
              <ThemedText style={styles.emptySubtext}>Head over to the Discover tab to find communities!</ThemedText>
            )}
          </View>
        )}
      />

      {/* Floating Create Server Button */}
      <ThemedButton
        style={[styles.floatingButton, { backgroundColor: '#007AFF' }]}
        onPress={() => setCreateModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </ThemedButton>

      {/* Create Server Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <ThemedText title style={styles.modalTitle}>Create a Server</ThemedText>

            <TextInput
              style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
              placeholder="Server Name"
              placeholderTextColor={theme.iconColor}
              value={serverName}
              onChangeText={setServerName}
              maxLength={50}
            />

            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
              placeholder="Describe your server community..."
              placeholderTextColor={theme.iconColor}
              value={serverDescription}
              onChangeText={setServerDescription}
              multiline
              maxLength={200}
            />

            {/* Password Section */}
            <View style={styles.passwordSection}>
              <Pressable
                style={styles.passwordToggleRow}
                onPress={() => {
                  setShowCreatePassword(!showCreatePassword);
                  if (showCreatePassword) setServerPassword('');
                }}
              >
                <Ionicons
                  name={showCreatePassword ? 'lock-closed' : 'lock-open-outline'}
                  size={20}
                  color={showCreatePassword ? '#FF9500' : theme.iconColor}
                />
                <ThemedText style={styles.passwordToggleText}>
                  {showCreatePassword ? 'Password Protected' : 'Add Password (Optional)'}
                </ThemedText>
                <Ionicons
                  name={showCreatePassword ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.iconColor}
                />
              </Pressable>
              {showCreatePassword && (
                <TextInput
                  style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor, marginTop: 8 }]}
                  placeholder="Enter server password"
                  placeholderTextColor={theme.iconColor}
                  value={serverPassword}
                  onChangeText={setServerPassword}
                  secureTextEntry
                  maxLength={50}
                />
              )}
            </View>

            <View style={styles.modalButtons}>
              <ThemedButton
                style={[styles.modalButton, { backgroundColor: theme.uiBackground }]}
                onPress={() => {
                  setCreateModalVisible(false);
                  setServerName('');
                  setServerDescription('');
                  setServerPassword('');
                  setShowCreatePassword(false);
                }}
              >
                <ThemedText>Cancel</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                onPress={handleCreateServer}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={{ color: '#fff' }}>Create</ThemedText>
                )}
              </ThemedButton>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Prompt Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setPasswordModalVisible(false);
          setPasswordInput('');
          setJoiningServer(null);
          setPasswordError('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.passwordModalHeader}>
              <Ionicons name="lock-closed" size={36} color="#FF9500" />
              <ThemedText title style={[styles.modalTitle, { marginTop: 12 }]}>
                Password Required
              </ThemedText>
              <ThemedText style={styles.passwordModalSubtitle}>
                "{joiningServer?.name}" is password protected. Enter the password to join.
              </ThemedText>
            </View>

            <View style={styles.passwordInputRow}>
              <TextInput
                style={[styles.input, styles.passwordInputField, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: passwordError ? '#FF3B30' : theme.iconColor }]}
                placeholder="Enter server password"
                placeholderTextColor={theme.iconColor}
                value={passwordInput}
                onChangeText={(val) => {
                  setPasswordInput(val);
                  if (passwordError) setPasswordError('');
                }}
                secureTextEntry={!showPasswordInput}
                autoFocus
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPasswordInput(!showPasswordInput)}
              >
                <Ionicons name={showPasswordInput ? 'eye-off' : 'eye'} size={22} color={theme.iconColor} />
              </Pressable>
            </View>

            {passwordError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                <ThemedText style={styles.errorText}>{passwordError}</ThemedText>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <ThemedButton
                style={[styles.modalButton, { backgroundColor: theme.uiBackground }]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setPasswordInput('');
                  setJoiningServer(null);
                  setPasswordError('');
                }}
              >
                <ThemedText>Cancel</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                onPress={handlePasswordJoin}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={{ color: '#fff' }}>Join</ThemedText>
                )}
              </ThemedButton>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    paddingVertical: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  serverInfo: {
    flex: 1,
    marginRight: 8,
  },
  serverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    flexShrink: 1,
  },
  serverDescription: {
    fontSize: 13,
    opacity: 0.6,
  },
  joinBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinBadgeLocked: {
    backgroundColor: '#FF9500',
  },
  joinText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.5,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.4,
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  passwordSection: {
    marginBottom: 16,
  },
  passwordToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  passwordToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
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
  // Password prompt modal styles
  passwordModalHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordModalSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInputField: {
    flex: 1,
    marginRight: 0,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: -8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
});
