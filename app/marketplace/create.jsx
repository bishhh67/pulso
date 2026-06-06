import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import Spacer from '../../components/Spacer';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { uploadFile } from '../../src/storage/storageProvider';
import {
  createMarketplaceListing,
  getMarketplaceListingById,
  updateMarketplaceListing,
} from '../../services/supabase/marketplace';

export default function CreateOrEditListing() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const { user } = useAuth();

  const listingId = params.listingId;
  const isEditMode = !!listingId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pickedImages, setPickedImages] = useState([]); // Array of { uri, fileName, contentType, isExisting: boolean }
  const [loadingListing, setLoadingListing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadListingData();
    }
  }, [listingId]);

  const loadListingData = async () => {
    try {
      setLoadingListing(true);
      const listing = await getMarketplaceListingById(listingId);
      if (listing) {
        // Check permissions
        if (listing.sellerId !== user?.uid) {
          Alert.alert('Unauthorized', 'You cannot edit this listing.');
          router.back();
          return;
        }
        setName(listing.name);
        setDescription(listing.description);
        setPrice(String(listing.price));
        setPickedImages(
          listing.images.map((img) => ({
            uri: img,
            isExisting: true,
          }))
        );
      } else {
        Alert.alert('Error', 'Listing not found.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      Alert.alert('Error', 'Failed to load listing.');
    } finally {
      setLoadingListing(false);
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        const selected = result.assets.map((asset) => ({
          uri: asset.uri,
          fileName: asset.fileName || `img_${Math.random().toString(36).substring(7)}_${Date.now()}.jpg`,
          contentType: asset.mimeType || 'image/jpeg',
          isExisting: false,
        }));
        setPickedImages((prev) => [...prev, ...selected]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images.');
    }
  };

  const removeImage = (index) => {
    setPickedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter the item name.');
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Required Field', 'Please enter a valid price greater than 0.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please enter a description.');
      return;
    }
    if (pickedImages.length === 0) {
      Alert.alert('Required Field', 'Please add at least one image of the item.');
      return;
    }

    try {
      setSubmitting(true);

      // Upload new images to Supabase storage
      const uploadedImagePaths = await Promise.all(
        pickedImages.map(async (img) => {
          if (img.isExisting) {
            // Already uploaded/saved path
            return img.uri;
          }
          // Upload new file
          return await uploadFile(
            {
              uri: img.uri,
              fileName: img.fileName,
              contentType: img.contentType,
            },
            'marketplace'
          );
        })
      );

      if (isEditMode) {
        await updateMarketplaceListing(listingId, {
          name: name.trim(),
          description: description.trim(),
          price: parsedPrice,
          images: uploadedImagePaths,
        });
        Alert.alert('Success', 'Listing updated successfully! 🎉');
      } else {
        await createMarketplaceListing({
          sellerId: user?.uid,
          name: name.trim(),
          description: description.trim(),
          price: parsedPrice,
          images: uploadedImagePaths,
        });
        Alert.alert('Success', 'Listing posted successfully! 🎉');
      }
      router.back();
    } catch (error) {
      console.error('Error saving listing:', error);
      Alert.alert('Error', 'Failed to save listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingListing) {
    return (
      <ThemedView style={styles.center} safe={true}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} safe={true}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.title} />
        </Pressable>
        <ThemedText style={styles.headerTitle} title={true}>
          {isEditMode ? 'Edit Listing' : 'Create Listing'}
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Images Picker Section */}
        <ThemedText style={styles.label} title={true}>
          Photos ({pickedImages.length})
        </ThemedText>
        <Spacer height={8} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          <Pressable style={[styles.addImageCard, { borderColor: theme.iconColor }]} onPress={pickImages}>
            <Ionicons name="camera-outline" size={32} color={theme.iconColor} />
            <Spacer height={4} />
            <ThemedText style={styles.addImageText}>Add Photo</ThemedText>
          </Pressable>

          {pickedImages.map((img, index) => {
            // If it's existing, it's a storage path, so resolve URL. If it's picked, it's local URI.
            const displayUri = img.isExisting ? getFileUrl(img.uri) : img.uri;
            return (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: displayUri }} style={styles.previewImage} />
                <Pressable style={styles.removeImageBadge} onPress={() => removeImage(index)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        <Spacer height={24} />

        {/* Input Fields */}
        <ThemedText style={styles.label} title={true}>
          Item Name
        </ThemedText>
        <Spacer height={8} />
        <TextInput
          placeholder="What are you selling?"
          placeholderTextColor={theme.iconColor}
          value={name}
          onChangeText={setName}
          style={[styles.input, { color: theme.text, backgroundColor: theme.uiBackground }]}
          maxLength={100}
        />
        <Spacer height={16} />

        <ThemedText style={styles.label} title={true}>
          Price (Rs.)
        </ThemedText>
        <Spacer height={8} />
        <TextInput
          placeholder="Enter price"
          placeholderTextColor={theme.iconColor}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={[styles.input, { color: theme.text, backgroundColor: theme.uiBackground }]}
        />
        <Spacer height={16} />

        <ThemedText style={styles.label} title={true}>
          Description
        </ThemedText>
        <Spacer height={8} />
        <TextInput
          placeholder="Describe your item (condition, size, pickup location, etc.)"
          placeholderTextColor={theme.iconColor}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          style={[
            styles.input,
            styles.multilineInput,
            { color: theme.text, backgroundColor: theme.uiBackground },
          ]}
        />
        <Spacer height={32} />

        <ThemedButton
          style={[styles.submitButton, { backgroundColor: Colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.submitButtonText}>
              {isEditMode ? 'Save Changes' : 'Publish Listing'}
            </ThemedText>
          )}
        </ThemedButton>
        <Spacer height={40} />
      </ScrollView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  imageScroll: {
    flexDirection: 'row',
  },
  addImageCard: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addImageText: {
    fontSize: 12,
    opacity: 0.6,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 15,
  },
  multilineInput: {
    height: 120,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
