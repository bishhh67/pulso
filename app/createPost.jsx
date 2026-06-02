import React, { useState } from 'react';
import { StyleSheet, TextInput, Image, Alert, ActivityIndicator, ScrollView, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/supabase/auth';
import { createPost } from '../services/supabase/data';
import { uploadFile } from '../src/storage/storageProvider';

import ThemedView from '../components/ThemedView';
import ThemedText from '../components/ThemedText';
import ThemedButton from '../components/ThemedButton';
import Spacer from '../components/Spacer';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';



export default function CreatePost() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImageToStorage = async (imageUri) => {
    try {
      return await uploadFile({
        uri: imageUri,
        fileName: `post_${Date.now()}.jpg`,
        contentType: 'image/jpeg',
      }, 'posts');
    } catch (error) {
      console.error('Storage upload error:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !image) {
      Alert.alert('Empty Post', 'Please add some text or an image');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to post');
      return;
    }

    try {
      setUploading(true);

      let imagePath = null;
      if (image) {
        imagePath = await uploadImageToStorage(image);
      }

      await createPost({
        authorId: auth.currentUser.uid,
        authorType: 'user',
        content: content.trim(),
        imagePath,
        likes: [],
        comments: [],
        shares: 0,
      });

      Alert.alert('Success', 'Post created successfully! 🎉');
      router.back();
    } catch (error) {
      console.error('Post creation error:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ThemedView style={styles.container} safe={true}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedButton onPress={() => router.back()} style={styles.cancelButton}>
          <Ionicons name="close" size={28} color={theme.iconColor} />
        </ThemedButton>
        
        <ThemedText title style={styles.headerTitle}>Create Post</ThemedText>

        <ThemedButton
          onPress={handlePost}
          disabled={uploading || (!content.trim() && !image)}
          style={[
            styles.postButton,
            { backgroundColor: (!content.trim() && !image) ? theme.uiBackground : '#007AFF' }
          ]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={[
              styles.postButtonText,
              { color: (!content.trim() && !image) ? theme.iconColor : '#fff' }
            ]}>
              Post
            </ThemedText>
          )}
        </ThemedButton>
      </View>

      <Spacer height={20} />

      {/* Content Input */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TextInput
          style={[styles.textInput, { color: theme.text }]}
          placeholder="What's on your mind?"
          placeholderTextColor={theme.iconColor}
          multiline
          value={content}
          onChangeText={setContent}
          autoFocus
          editable={!uploading}
        />

        {/* Image Preview */}
        {image && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <Pressable
              style={styles.removeImageButton}
              onPress={() => setImage(null)}
            >
              <Ionicons name="close-circle" size={32} color="#fff" />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={[styles.bottomActions, { backgroundColor: theme.background }]}>
        <ThemedText style={styles.addToPostText}>Add to your post</ThemedText>

        <View style={styles.actionButtons}>
          {/* Image Button */}
          <ThemedButton onPress={pickImage} style={styles.actionButton}>
            <Ionicons name="image-outline" size={28} color="#4CAF50" />
          </ThemedButton>

          {/* Video Button (Coming Soon) */}
          <ThemedButton 
            onPress={() => Alert.alert('Coming Soon', 'Video upload will be available soon')}
            style={styles.actionButton}
          >
            <Ionicons name="videocam-outline" size={28} color="#F44336" />
          </ThemedButton>

          {/* Emoji Button (Coming Soon) */}
          <ThemedButton 
            onPress={() => Alert.alert('Coming Soon', 'Emoji picker coming soon')}
            style={styles.actionButton}
          >
            <Ionicons name="happy-outline" size={28} color="#FFC107" />
          </ThemedButton>

          {/* Poll Button (Coming Soon) */}
          <ThemedButton 
            onPress={() => Alert.alert('Coming Soon', 'Polls coming soon')}
            style={styles.actionButton}
          >
            <Ionicons name="stats-chart-outline" size={28} color="#2196F3" />
          </ThemedButton>
        </View>
      </View>
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
    paddingTop: 10,
  },
  cancelButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  textInput: {
    fontSize: 18,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  imagePreview: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  bottomActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  addToPostText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
  },
});
