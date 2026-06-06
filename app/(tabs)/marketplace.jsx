import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import { Colors } from '../../constants/colors';
import { listMarketplaceListings } from '../../services/supabase/marketplace';
import { getFileUrl } from '../../src/storage/storageProvider';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
};

const MarketPlace = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredListings(listings);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = listings.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
      setFilteredListings(filtered);
    }
  }, [searchQuery, listings]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await listMarketplaceListings();
      setListings(data);
      setFilteredListings(data);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await listMarketplaceListings();
      setListings(data);
      setFilteredListings(data);
    } catch (error) {
      console.error('Error refreshing listings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderListingCard = ({ item }) => {
    const mainImage = item.images && item.images.length > 0 ? getFileUrl(item.images[0]) : null;
    const isSold = item.status === 'sold';

    return (
      <Pressable
        style={[styles.card, { backgroundColor: theme.uiBackground }]}
        onPress={() => router.push(`/marketplace/${item.id}`)}
      >
        <View style={styles.imageContainer}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.cardImage} />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: theme.background }]}>
              <Ionicons name="image-outline" size={40} color={theme.iconColor} />
            </View>
          )}
          {isSold && (
            <View style={styles.soldBadge}>
              <ThemedText style={styles.soldText}>SOLD</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <ThemedText style={styles.cardPrice} numberOfLines={1} title={true}>
            Rs. {item.price.toLocaleString()}
          </ThemedText>
          <ThemedText style={styles.cardName} numberOfLines={1} title={true}>
            {item.name}
          </ThemedText>
          <Spacer height={4} />
          <View style={styles.sellerRow}>
            <ThemedText style={styles.sellerName} numberOfLines={1}>
              {item.seller?.name || 'Seller'}
            </ThemedText>
            <ThemedText style={styles.timePosted}>
              • {formatTimeAgo(item.createdAt)}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: theme.uiBackground }]}>
          <Ionicons name="search-outline" size={20} color={theme.iconColor} style={styles.searchIcon} />
          <TextInput
            placeholder="Search Marketplace..."
            placeholderTextColor={theme.iconColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.iconColor} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.sellButton, { backgroundColor: Colors.primary }]}
          onPress={() => router.push('/marketplace/create')}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <ThemedText style={styles.sellButtonText}>Sell</ThemedText>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderListingCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={64} color={theme.iconColor} style={{ opacity: 0.5 }} />
              <Spacer height={16} />
              <ThemedText style={styles.emptyTitle} title={true}>
                No listings found
              </ThemedText>
              <ThemedText style={styles.emptySub}>
                Be the first to list an item for sale!
              </ThemedText>
            </View>
          }
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
  },
  sellButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: COLUMN_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  imageContainer: {
    width: '100%',
    height: COLUMN_WIDTH * 0.9,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ff3b30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  soldText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardInfo: {
    padding: 10,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardName: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.9,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerName: {
    fontSize: 11,
    opacity: 0.6,
    maxWidth: '60%',
  },
  timePosted: {
    fontSize: 11,
    opacity: 0.5,
    marginLeft: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySub: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default MarketPlace;