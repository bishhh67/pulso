import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getProfileById } from '../services/supabase/data';
import { getFileUrl } from '../src/storage/storageProvider';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';

export default function FriendsModal({ visible, onClose, friendIds, currentUserId }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && friendIds?.length > 0) {
      loadItems();
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [visible, friendIds]);

  const loadItems = async () => {
    try {
      setLoading(true);

      const itemPromises = friendIds.map(async (id) => {
        const user = await getProfileById(id).catch(() => null);
        if (!user) return null;
        return { id, type: 'user', ...user };
      });

      const loadedItems = await Promise.all(itemPromises);
      setItems(loadedItems.filter(item => item !== null));
      setLoading(false);
    } catch (error) {
      console.error('Error loading items:', error);
      setLoading(false);
    }
  };

  const handleItemPress = (item) => {
    onClose();
    if (item.id !== currentUserId) {
      router.push(`/profile/${item.id}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText title style={styles.title}>
              Friends
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.iconColor} />
            </Pressable>
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ThemedText>Loading...</ThemedText>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={64} color={theme.iconColor} style={{ opacity: 0.3 }} />
              <ThemedText style={styles.emptyText}>No friends yet</ThemedText>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.itemRow,
                    pressed && styles.itemPressed,
                  ]}
                  onPress={() => handleItemPress(item)}
                >
                  <View style={styles.itemInfo}>
                    {/* Avatar/Image */}
                    {item.profilePhoto ? (
                      <Image 
                        source={{ uri: getFileUrl(item.profilePhotoPath || item.profilePhoto) }} 
                        style={styles.avatar} 
                      />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: theme.uiBackground }]}>
                        <Ionicons 
                          name="person" 
                          size={24} 
                          color={theme.iconColor} 
                        />
                      </View>
                    )}

                    {/* Name & Type */}
                    <View style={styles.itemText}>
                      <ThemedText style={styles.itemName}>
                        {item.name || 'Unnamed'}
                      </ThemedText>
                      {item.bio && (
                        <ThemedText style={styles.itemBio} numberOfLines={1}>
                          {item.bio}
                        </ThemedText>
                      )}
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
                </Pressable>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemPressed: {
    opacity: 0.6,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemType: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
  itemBio: {
    fontSize: 12,
    opacity: 0.6,
    flex: 1,
  },
});
