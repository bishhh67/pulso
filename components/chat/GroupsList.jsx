import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/supabase/auth';
import { listGroupsForUser, createGroup } from '../../services/supabase/data';
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

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      setGroups(await listGroupsForUser(auth.currentUser.uid));
      setLoading(false);
    } catch (error) {
      console.error('Error loading groups:', error);
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreating(true);

    try {
      await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        image: null,
        createdBy: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        admins: [auth.currentUser.uid],
      });
      
      Alert.alert('Success', 'Group created successfully!');
      setCreateModalVisible(false);
      setGroupName('');
      setGroupDescription('');
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleGroupPress = (group) => {
    router.push({
      pathname: '/chat/groupChat',
      params: {
        groupId: group.id,
        groupName: group.name,
        groupImage: group.imagePath || group.image || '',
      }
    });
  };

  if (loading) {
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
        <ThemedText style={styles.emptyText}>Please log in to join groups</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Create Group Button */}
      <ThemedButton
        style={[styles.createButton, { backgroundColor: '#007AFF' }]}
        onPress={() => setCreateModalVisible(true)}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <ThemedText style={styles.createButtonText}>Create Group</ThemedText>
      </ThemedButton>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.groupItem,
              { backgroundColor: theme.uiBackground },
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => handleGroupPress(item)}
          >
            <View style={[styles.avatar, { backgroundColor: theme.background }]}>
              {(item.imagePath || item.image) && (
                <Image source={{ uri: getFileUrl(item.imagePath || item.image) }} style={styles.avatarImage} />
              )}
              {!(item.imagePath || item.image) && (
                <Ionicons name="people" size={28} color={theme.iconColor} />
              )}
            </View>

            <View style={styles.groupInfo}>
              <ThemedText style={styles.groupName}>{item.name}</ThemedText>
              <ThemedText style={styles.groupDescription} numberOfLines={1}>
                {item.description || `${item.members?.length || 0} members`}
              </ThemedText>
            </View>

            <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
            <ThemedText style={styles.emptyText}>No groups yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Create a group to get started!</ThemedText>
          </View>
        )}
      />

      {/* Create Group Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <ThemedText title style={styles.modalTitle}>Create Group</ThemedText>

            <TextInput
              style={[styles.input, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
              placeholder="Group Name"
              placeholderTextColor={theme.iconColor}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />

            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.uiBackground, color: theme.text, borderColor: theme.iconColor }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.iconColor}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              maxLength={200}
            />

            <View style={styles.modalButtons}>
              <ThemedButton
                style={[styles.modalButton, { backgroundColor: theme.uiBackground }]}
                onPress={() => {
                  setCreateModalVisible(false);
                  setGroupName('');
                  setGroupDescription('');
                }}
              >
                <ThemedText>Cancel</ThemedText>
              </ThemedButton>

              <ThemedButton
                style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                onPress={handleCreateGroup}
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 13,
    opacity: 0.6,
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
});
