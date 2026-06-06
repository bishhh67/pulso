import { supabase } from './client';

// Helper to format ISO timestamps
const isoTimestamp = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    toDate: () => new Date(date.getTime()),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  };
};

export const normalizeListing = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    sellerId: row.seller_id,
    name: row.name,
    description: row.description || '',
    price: parseFloat(row.price) || 0,
    images: Array.isArray(row.images) ? row.images : [],
    status: row.status || 'active',
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    seller: row.profiles ? {
      id: row.profiles.id,
      name: row.profiles.name,
      email: row.profiles.email,
      profilePhoto: row.profiles.profile_photo || null,
    } : null,
  };
};

export const normalizeComment = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    userId: row.user_id,
    text: row.text,
    parentId: row.parent_id || null,
    createdAt: isoTimestamp(row.created_at),
    user: row.profiles ? {
      id: row.profiles.id,
      name: row.profiles.name,
      email: row.profiles.email,
      profilePhoto: row.profiles.profile_photo || null,
    } : null,
  };
};

// List all marketplace listings
export async function listMarketplaceListings() {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      profiles:seller_id (
        id,
        name,
        email,
        profile_photo
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeListing);
}

// Get single listing with comments
export async function getMarketplaceListingById(id) {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      profiles:seller_id (
        id,
        name,
        email,
        profile_photo
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const listing = normalizeListing(data);

  // Fetch comments
  const { data: commentsData, error: commentsError } = await supabase
    .from('marketplace_comments')
    .select(`
      *,
      profiles:user_id (
        id,
        name,
        email,
        profile_photo
      )
    `)
    .eq('listing_id', id)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;
  listing.comments = (commentsData || []).map(normalizeComment);

  return listing;
}

// Create a new listing
export async function createMarketplaceListing(listing) {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert({
      seller_id: listing.sellerId,
      name: listing.name,
      description: listing.description || '',
      price: listing.price,
      images: listing.images || [],
      status: 'active',
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeListing(data);
}

// Update an existing listing
export async function updateMarketplaceListing(id, patch) {
  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.price !== undefined) payload.price = patch.price;
  if (patch.images !== undefined) payload.images = patch.images;
  if (patch.status !== undefined) payload.status = patch.status;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('marketplace_listings')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeListing(data);
}

// Delete a listing
export async function deleteMarketplaceListing(id) {
  const { error } = await supabase
    .from('marketplace_listings')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Add a comment to a listing
export async function addMarketplaceComment(comment) {
  const { data, error } = await supabase
    .from('marketplace_comments')
    .insert({
      listing_id: comment.listingId,
      user_id: comment.userId,
      text: comment.text,
      parent_id: comment.parentId || null,
    })
    .select(`
      *,
      profiles:user_id (
        id,
        name,
        email,
        profile_photo
      )
    `)
    .single();

  if (error) throw error;
  return normalizeComment(data);
}

// Delete a comment
export async function deleteMarketplaceComment(id) {
  const { error } = await supabase
    .from('marketplace_comments')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
