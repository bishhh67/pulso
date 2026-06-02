import React, { useState } from 'react';
import { StyleSheet, Modal, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import ThemedButton from './ThemedButton';
import Spacer from './Spacer';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';

export default function CreatePostButton() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [modalVisible, setModalVisible] = useState(false);

  const handleCreatePost = () => {
    setModalVisible(false);
    router.push('/createPost');
  };

  const handleAddStory = () => {
    setModalVisible(false);
    // TODO: Implement stories later
    alert('Stories coming soon!');
  };

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        style={[styles.fab, { backgroundColor: '#007AFF' }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>

      {/* Modal for Post/Story Selection */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View 
            style={[styles.modalContent, { backgroundColor: theme.background }]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText title style={styles.modalTitle}>Create</ThemedText>

            <Spacer height={20} />

            {/* Post Option */}
            <ThemedButton
              onPress={handleCreatePost}
              style={[styles.option, { backgroundColor: theme.uiBackground }]}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}>
                  <Ionicons name="create-outline" size={24} color="#fff" />
                </View>
                <View style={styles.optionText}>
                  <ThemedText style={styles.optionTitle}>Create Post</ThemedText>
                  <ThemedText style={styles.optionSubtitle}>Share your thoughts</ThemedText>
                </View>
              </View>
            </ThemedButton>

            <Spacer height={12} />

            {/* Story Option (Coming Soon) */}
            <ThemedButton
              onPress={handleAddStory}
              style={[styles.option, { backgroundColor: theme.uiBackground }]}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: '#FF3B30' }]}>
                  <Ionicons name="flash-outline" size={24} color="#fff" />
                </View>
                <View style={styles.optionText}>
                  <ThemedText style={styles.optionTitle}>Add Story</ThemedText>
                  <ThemedText style={styles.optionSubtitle}>Coming soon</ThemedText>
                </View>
              </View>
            </ThemedButton>

            <Spacer height={20} />

            {/* Cancel Button */}
            <ThemedButton
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
            >
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </ThemedButton>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  option: {
    borderRadius: 16,
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});