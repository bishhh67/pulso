import { supabase } from './client';

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

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeProfileSettings = (value) => {
  if (Array.isArray(value)) {
    return {
      searchHistory: value,
      pushTokens: [],
      directMessagePreferences: {},
    };
  }

  if (value && typeof value === 'object') {
    const searchHistory = Array.isArray(value.items)
      ? value.items
      : Array.isArray(value.searchHistory)
        ? value.searchHistory
        : Array.isArray(value.history)
          ? value.history
          : [];
    const pushTokens = Array.isArray(value.pushTokens) ? value.pushTokens : [];
    const directMessagePreferences =
      value.directMessagePreferences && typeof value.directMessagePreferences === 'object'
        ? value.directMessagePreferences
        : value.dmPrefs && typeof value.dmPrefs === 'object'
          ? value.dmPrefs
          : {};

    return {
      searchHistory,
      pushTokens,
      directMessagePreferences,
    };
  }

  return {
    searchHistory: [],
    pushTokens: [],
    directMessagePreferences: {},
  };
};

export const normalizeProfile = (row) => {
  if (!row) return null;
  const profileSettings = normalizeProfileSettings(row.search_history);
  return {
    uid: row.id,
    id: row.id,
    email: row.email,
    name: row.name || row.email?.split('@')?.[0] || 'User',
    bio: row.bio || '',
    profilePhoto: row.profile_photo || null,
    profilePhotoPath: row.profile_photo || null,
    following: normalizeArray(row.following),
    followers: normalizeArray(row.followers),
    searchHistory: profileSettings.searchHistory,
    pushTokens: profileSettings.pushTokens,
    directMessagePreferences: profileSettings.directMessagePreferences,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
};

export const normalizeClub = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    bio: row.bio || '',
    image: row.image || null,
    imagePath: row.image || null,
    followers: normalizeArray(row.followers),
    posts: normalizeArray(row.posts),
    createdAt: isoTimestamp(row.created_at),
  };
};

export const normalizePost = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    authorType: row.author_type,
    content: row.content || '',
    image: row.image || null,
    imagePath: row.image || null,
    video: row.video || null,
    videoThumbnail: row.video_thumbnail || null,
    likes: normalizeArray(row.likes),
    comments: normalizeArray(row.comments),
    shares: row.shares || 0,
    createdAt: isoTimestamp(row.created_at),
  };
};

export const normalizeNotification = (row) => {
  if (!row) return null;
  const friendRequestRaw = row.friend_request || row.friendRequest || null;
  const friendRequest = Array.isArray(friendRequestRaw) ? friendRequestRaw[0] : friendRequestRaw;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    fromUserId: row.from_user_id,
    fromUserName: row.from_user_name,
    fromUserPhoto: row.from_user_photo || null,
    postId: row.post_id,
    friendRequestId: row.friend_request_id,
    friendRequestStatus: friendRequest?.status || row.friend_request_status || null,
    read: !!row.read,
    createdAt: isoTimestamp(row.created_at),
  };
};

export const normalizeFriendRequest = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    requesterId: row.requester_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
    respondedAt: isoTimestamp(row.responded_at),
  };
};

export const normalizeFriendship = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    userLowId: row.user_low_id,
    userHighId: row.user_high_id,
    createdAt: isoTimestamp(row.created_at),
  };
};

export const normalizeGroup = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    image: row.image || null,
    imagePath: row.image || null,
    createdBy: row.created_by,
    members: normalizeArray(row.members),
    admins: normalizeArray(row.admins),
    createdAt: isoTimestamp(row.created_at),
  };
};

export const normalizeMessage = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    text: row.text || '',
    sendBy: row.send_by,
    sendTo: row.send_to || null,
    senderName: row.sender_name || 'User',
    type: row.type || 'text',
    sharedPost: row.shared_post || null,
    createdAt: isoTimestamp(row.created_at),
  };
};

export const normalizeDirectChatPreference = (row) => {
  if (!row) return null;
  const mutedAtValue = row.muted_at ?? row.mutedAt ?? null;
  const hiddenAtValue = row.hidden_at ?? row.hiddenAt ?? null;
  return {
    userId: row.user_id,
    otherUserId: row.other_user_id,
    mutedAt: isoTimestamp(mutedAtValue),
    hiddenAt: isoTimestamp(hiddenAtValue),
    createdAt: isoTimestamp(row.created_at),
    updatedAt: isoTimestamp(row.updated_at),
  };
};

export const normalizeNote = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url || null,
    fileUrl: row.file_url || null,
    filePath: row.file_url || null,
    fileName: row.file_name || null,
    uploadedBy: row.uploaded_by || 'anonymous',
    timestamp: isoTimestamp(row.created_at),
  };
};

const mapProfileInsert = (profile) => ({
  id: profile.id,
  email: profile.email,
  name: profile.name || profile.email?.split('@')?.[0] || 'User',
  bio: profile.bio || '',
  profile_photo: profile.profilePhotoPath ?? profile.profilePhoto ?? null,
  following: profile.following || [],
  followers: profile.followers || [],
  search_history: {
    items: Array.isArray(profile.searchHistory) ? profile.searchHistory : [],
    pushTokens: Array.isArray(profile.pushTokens) ? profile.pushTokens : [],
    directMessagePreferences:
      profile.directMessagePreferences && typeof profile.directMessagePreferences === 'object'
        ? profile.directMessagePreferences
        : {},
  },
});

const mapClubInsert = (club) => ({
  id: club.id,
  name: club.name,
  bio: club.bio || '',
  image: club.imagePath ?? club.image ?? null,
  followers: club.followers || [],
  posts: club.posts || [],
});

const mapPostInsert = (post) => ({
  author_id: post.authorId,
  author_type: post.authorType,
  content: post.content || '',
  image: post.imagePath ?? post.image ?? null,
  video: post.video || null,
  video_thumbnail: post.videoThumbnail || null,
  likes: post.likes || [],
  comments: post.comments || [],
  shares: post.shares || 0,
});

const mapGroupInsert = (group) => ({
  name: group.name,
  description: group.description || '',
  image: group.imagePath ?? group.image ?? null,
  created_by: group.createdBy,
  members: group.members || [],
  admins: group.admins || [],
});

const mapNoteInsert = (note) => ({
  department: note.department,
  semester: note.semester,
  subject: note.subject,
  category: note.category,
  title: note.title,
  type: note.type,
  url: note.url || null,
  file_url: note.filePath ?? note.fileUrl ?? null,
  file_name: note.fileName || null,
  uploaded_by: note.uploadedBy || 'anonymous',
});

const mapFriendRequestInsert = (request) => ({
  requester_id: request.requesterId,
  receiver_id: request.receiverId,
  status: request.status || 'pending',
  responded_at: request.respondedAt ?? null,
});

const mapFriendshipInsert = (userId, friendId) => {
  const [userLowId, userHighId] = [userId, friendId].sort((left, right) => String(left).localeCompare(String(right)));
  return { user_low_id: userLowId, user_high_id: userHighId };
};

export async function upsertProfile(profile) {
  const payload = mapProfileInsert(profile);
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeProfile(data);
}

export async function getProfileById(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return normalizeProfile(data);
}

export async function updateProfile(id, patch) {
  const payload = {};
  const needsSettingsMerge =
    patch.searchHistory !== undefined ||
    patch.pushTokens !== undefined ||
    patch.directMessagePreferences !== undefined;

  let currentSettings = null;
  if (needsSettingsMerge) {
    const currentProfile = await getProfileById(id).catch(() => null);
    currentSettings = {
      searchHistory: currentProfile?.searchHistory || [],
      pushTokens: currentProfile?.pushTokens || [],
      directMessagePreferences: currentProfile?.directMessagePreferences || {},
    };
  }

  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.bio !== undefined) payload.bio = patch.bio;
  if (patch.profilePhotoPath !== undefined) payload.profile_photo = patch.profilePhotoPath;
  if (patch.profilePhoto !== undefined) payload.profile_photo = patch.profilePhoto;
  if (patch.following !== undefined) payload.following = patch.following;
  if (patch.followers !== undefined) payload.followers = patch.followers;

  if (needsSettingsMerge) {
    payload.search_history = {
      items: patch.searchHistory !== undefined ? patch.searchHistory : currentSettings.searchHistory,
      pushTokens: patch.pushTokens !== undefined ? patch.pushTokens : currentSettings.pushTokens,
      directMessagePreferences:
        patch.directMessagePreferences !== undefined
          ? patch.directMessagePreferences
          : currentSettings.directMessagePreferences,
    };
  }

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeProfile(data);
}

export async function getDirectChatPreference(userId, otherUserId) {
  if (!userId || !otherUserId) return null;
  const profile = await getProfileById(userId);
  const preference = profile?.directMessagePreferences?.[otherUserId] || null;
  return preference ? normalizeDirectChatPreference({ user_id: userId, other_user_id: otherUserId, ...preference }) : null;
}

export async function listDirectChatPreferences(userId) {
  if (!userId) return [];
  const profile = await getProfileById(userId);
  const preferences = profile?.directMessagePreferences || {};
  return Object.entries(preferences).map(([otherUserId, preference]) =>
    normalizeDirectChatPreference({ user_id: userId, other_user_id: otherUserId, ...preference })
  );
}

export async function upsertDirectChatPreference(userId, otherUserId, patch = {}) {
  if (!userId || !otherUserId) {
    throw new Error('Missing direct chat preference participants.');
  }

  const profile = await getProfileById(userId);
  const currentPreferences = profile?.directMessagePreferences || {};
  const existingPreference = currentPreferences[otherUserId] || {};
  const nextPreference = {
    mutedAt: patch.mutedAt === undefined ? existingPreference.mutedAt || null : patch.mutedAt,
    hiddenAt: patch.hiddenAt === undefined ? existingPreference.hiddenAt || null : patch.hiddenAt,
  };

  const updatedPreferences = {
    ...currentPreferences,
    [otherUserId]: nextPreference,
  };

  await updateProfile(userId, { directMessagePreferences: updatedPreferences });

  return normalizeDirectChatPreference({
    user_id: userId,
    other_user_id: otherUserId,
    muted_at: nextPreference.mutedAt,
    hidden_at: nextPreference.hiddenAt,
  });
}

export async function muteDirectChat(userId, otherUserId) {
  return upsertDirectChatPreference(userId, otherUserId, { mutedAt: new Date().toISOString() });
}

export async function unmuteDirectChat(userId, otherUserId) {
  return upsertDirectChatPreference(userId, otherUserId, { mutedAt: null });
}

export async function hideDirectChat(userId, otherUserId) {
  return upsertDirectChatPreference(userId, otherUserId, { hiddenAt: new Date().toISOString() });
}

export async function searchProfiles(searchText, currentUserId) {
  const text = searchText.trim().toLowerCase();
  if (!text) return [];

  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;

  return (data || [])
    .map(normalizeProfile)
    .filter((profile) => profile.name?.toLowerCase().includes(text) && profile.uid !== currentUserId);
}

export async function listProfilesExcept(email) {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return (data || [])
    .map(normalizeProfile)
    .filter((profile) => profile.email !== email);
}

export async function getClubById(id) {
  const { data, error } = await supabase.from('clubs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return normalizeClub(data);
}

export async function listClubs() {
  const { data, error } = await supabase.from('clubs').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeClub);
}

export async function updateClub(id, patch) {
  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.bio !== undefined) payload.bio = patch.bio;
  if (patch.imagePath !== undefined) payload.image = patch.imagePath;
  if (patch.image !== undefined) payload.image = patch.image;
  if (patch.followers !== undefined) payload.followers = patch.followers;
  if (patch.posts !== undefined) payload.posts = patch.posts;

  const { data, error } = await supabase
    .from('clubs')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeClub(data);
}

export async function getPostById(id) {
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return normalizePost(data);
}

export async function createPost(post) {
  const { data, error } = await supabase
    .from('posts')
    .insert(mapPostInsert(post))
    .select('*')
    .single();
  if (error) throw error;
  return normalizePost(data);
}

export async function updatePost(id, patch) {
  const payload = {};
  if (patch.content !== undefined) payload.content = patch.content;
  if (patch.imagePath !== undefined) payload.image = patch.imagePath;
  if (patch.image !== undefined) payload.image = patch.image;
  if (patch.video !== undefined) payload.video = patch.video;
  if (patch.videoThumbnail !== undefined) payload.video_thumbnail = patch.videoThumbnail;
  if (patch.likes !== undefined) payload.likes = patch.likes;
  if (patch.comments !== undefined) payload.comments = patch.comments;
  if (patch.shares !== undefined) payload.shares = patch.shares;

  const { data, error } = await supabase
    .from('posts')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizePost(data);
}

export async function createNotification(notification) {
  const payload = {
    user_id: notification.userId,
    type: notification.type,
    from_user_id: notification.fromUserId,
    from_user_name: notification.fromUserName,
    from_user_photo: notification.fromUserPhoto || notification.fromUserPhotoPath || null,
    post_id: notification.postId || null,
    friend_request_id: notification.friendRequestId || null,
    read: notification.read || false,
  };

  const { error } = await supabase.from('notifications').insert(payload);

  if (error) {
    const isMissingPhotoColumn =
      error.code === 'PGRST204' ||
      /from_user_photo/i.test(error.message || '') ||
      /from_user_photo/i.test(error.details || '') ||
      /from_user_photo/i.test(error.hint || '');

    if (isMissingPhotoColumn && payload.from_user_photo !== null) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.from_user_photo;

      const { error: fallbackError } = await supabase.from('notifications').insert(fallbackPayload);

      if (fallbackError) throw fallbackError;
      return null;
    }

    throw error;
  }

  return null;
}

export async function listNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, friend_request:friend_requests(status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeNotification);
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw error;
}

const fetchFriendRequestByPair = async (requesterId, receiverId) => {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('requester_id', requesterId)
    .eq('receiver_id', receiverId)
    .maybeSingle();

  if (error) throw error;
  return normalizeFriendRequest(data);
};

const fetchFriendRequestBetweenUsers = async (userAId, userBId) => {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(
      `and(requester_id.eq.${userAId},receiver_id.eq.${userBId}),and(requester_id.eq.${userBId},receiver_id.eq.${userAId})`
    )
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return normalizeFriendRequest((data || [])[0] || null);
};

const fetchFriendshipBetweenUsers = async (userAId, userBId) => {
  const [userLowId, userHighId] = [userAId, userBId].sort((left, right) => String(left).localeCompare(String(right)));

  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_low_id', userLowId)
    .eq('user_high_id', userHighId)
    .maybeSingle();

  if (error) throw error;
  return normalizeFriendship(data);
};

export async function getFriendRelation(userId, otherUserId) {
  if (!userId || !otherUserId || userId === otherUserId) {
    return { status: 'none', request: null, friendship: null };
  }

  const friendship = await fetchFriendshipBetweenUsers(userId, otherUserId);
  if (friendship) {
    return { status: 'friends', request: null, friendship };
  }

  const request = await fetchFriendRequestBetweenUsers(userId, otherUserId);
  if (!request) {
    return { status: 'none', request: null, friendship: null };
  }

  if (request.requesterId === userId) {
    if (request.status === 'pending') {
      return { status: 'outgoing_pending', request, friendship: null };
    }
    if (request.status === 'accepted') {
      return { status: 'accepted_without_friendship', request, friendship: null };
    }
    return { status: 'none', request, friendship: null };
  }

  if (request.receiverId === userId) {
    if (request.status === 'pending') {
      return { status: 'incoming_pending', request, friendship: null };
    }
    if (request.status === 'accepted') {
      return { status: 'accepted_without_friendship', request, friendship: null };
    }
    return { status: 'none', request, friendship: null };
  }

  return { status: 'none', request, friendship: null };
}

export async function listFriendIds(userId) {
  if (!userId) return [];

  const [lowResult, highResult] = await Promise.all([
    supabase.from('friendships').select('*').eq('user_low_id', userId),
    supabase.from('friendships').select('*').eq('user_high_id', userId),
  ]);

  if (lowResult.error) throw lowResult.error;
  if (highResult.error) throw highResult.error;

  const rows = [...(lowResult.data || []), ...(highResult.data || [])].map(normalizeFriendship);
  const ids = rows.map((row) => (row.userLowId === userId ? row.userHighId : row.userLowId));
  return Array.from(new Set(ids.filter(Boolean)));
}

export async function listFriendProfiles(userId) {
  const friendIds = await listFriendIds(userId);
  if (!friendIds.length) return [];

  const { data, error } = await supabase.from('profiles').select('*').in('id', friendIds).order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeProfile);
}

export async function areUsersFriends(userId, otherUserId) {
  const relation = await getFriendRelation(userId, otherUserId);
  return relation.status === 'friends';
}

export async function listIncomingFriendRequests(userId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeFriendRequest);
}

export async function listOutgoingFriendRequests(userId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('requester_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeFriendRequest);
}

export async function sendFriendRequest(requesterId, receiverId) {
  if (!requesterId || !receiverId) {
    throw new Error('Missing friend request participants.');
  }

  if (requesterId === receiverId) {
    throw new Error('You cannot send a friend request to yourself.');
  }

  const relation = await getFriendRelation(requesterId, receiverId);
  if (relation.status === 'friends') {
    return relation;
  }

  if (relation.status === 'outgoing_pending') {
    return relation;
  }

  if (relation.status === 'incoming_pending') {
    throw new Error('This user already sent you a friend request. Accept it instead.');
  }

  const requesterProfile = await getProfileById(requesterId);
  const payload = mapFriendRequestInsert({
    requesterId,
    receiverId,
    status: 'pending',
  });

  const { data, error } = await supabase
    .from('friend_requests')
    .upsert(payload, { onConflict: 'requester_id,receiver_id' })
    .select('*')
    .single();

  if (error) throw error;

  const request = normalizeFriendRequest(data);

  await createNotification({
    userId: receiverId,
    type: 'friend_request',
    fromUserId: requesterId,
    fromUserName: requesterProfile?.name || requesterProfile?.email?.split('@')?.[0] || 'Someone',
    fromUserPhoto: requesterProfile?.profilePhotoPath || requesterProfile?.profilePhoto || null,
    friendRequestId: request.id,
    read: false,
  }).catch((notificationError) => {
    console.error('Error creating friend request notification:', notificationError);
  });

  return request;
}

export async function acceptFriendRequest(requestId) {
  if (!requestId) {
    throw new Error('Missing friend request id.');
  }

  const { data: requestData, error: fetchError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  const request = normalizeFriendRequest(requestData);
  if (!request) throw new Error('Friend request not found.');

  const updatedPayload = {
    status: 'accepted',
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updatedRequestData, error: updateError } = await supabase
    .from('friend_requests')
    .update(updatedPayload)
    .eq('id', requestId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  const acceptedRequest = normalizeFriendRequest(updatedRequestData);
  const friendshipPayload = mapFriendshipInsert(acceptedRequest.requesterId, acceptedRequest.receiverId);
  const { error: friendshipError } = await supabase
    .from('friendships')
    .upsert(friendshipPayload, { onConflict: 'user_low_id,user_high_id' });

  if (friendshipError) throw friendshipError;

  const { error: markRequestReadError } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('friend_request_id', acceptedRequest.id)
    .eq('user_id', acceptedRequest.receiverId);
  if (markRequestReadError) {
    console.error('Error marking friend request notification read:', markRequestReadError);
  }

  const receiverProfile = await getProfileById(acceptedRequest.receiverId).catch(() => null);
  await createNotification({
    userId: acceptedRequest.requesterId,
    type: 'friend_request_accepted',
    fromUserId: acceptedRequest.receiverId,
    fromUserName: receiverProfile?.name || receiverProfile?.email?.split('@')?.[0] || 'Someone',
    fromUserPhoto: receiverProfile?.profilePhotoPath || receiverProfile?.profilePhoto || null,
    friendRequestId: acceptedRequest.id,
    read: false,
  }).catch((notificationError) => {
    console.error('Error creating friend request accepted notification:', notificationError);
  });

  return acceptedRequest;
}

export async function rejectFriendRequest(requestId) {
  if (!requestId) {
    throw new Error('Missing friend request id.');
  }

  const { data: requestData, error: fetchError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  const request = normalizeFriendRequest(requestData);
  if (!request) throw new Error('Friend request not found.');

  const updatedPayload = {
    status: 'rejected',
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: updatedRequestData, error: updateError } = await supabase
    .from('friend_requests')
    .update(updatedPayload)
    .eq('id', requestId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  const rejectedRequest = normalizeFriendRequest(updatedRequestData);

  const { error: markRejectedReadError } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('friend_request_id', rejectedRequest.id)
    .eq('user_id', rejectedRequest.receiverId);
  if (markRejectedReadError) {
    console.error('Error marking rejected friend request notification read:', markRejectedReadError);
  }

  return rejectedRequest;
}

export async function removeFriend(userId, friendId) {
  if (!userId || !friendId) {
    throw new Error('Missing friend ids.');
  }

  const [userLowId, userHighId] = [userId, friendId].sort((left, right) => String(left).localeCompare(String(right)));

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('user_low_id', userLowId)
    .eq('user_high_id', userHighId);

  if (error) throw error;

  const currentUserProfile = await getProfileById(userId).catch(() => null);
  await createNotification({
    userId: friendId,
    type: 'friend_removed',
    fromUserId: userId,
    fromUserName: currentUserProfile?.name || currentUserProfile?.email?.split('@')?.[0] || 'Someone',
    fromUserPhoto: currentUserProfile?.profilePhotoPath || currentUserProfile?.profilePhoto || null,
    read: false,
  }).catch((notificationError) => {
    console.error('Error creating friend removed notification:', notificationError);
  });
}

export async function listFeedPosts(currentUserId, limitCount = 50) {
  const friendIds = await listFriendIds(currentUserId);
  if (!friendIds.length) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .in('author_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(limitCount);
  if (error) throw error;
  return (data || []).map(normalizePost);
}

export async function listRecentPosts(limitCount = 50) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitCount);
  if (error) throw error;
  return (data || []).map(normalizePost);
}

export async function listPostsByAuthorIds(authorIds, limitCount = 50) {
  if (!authorIds?.length) return [];
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .in('author_id', authorIds)
    .order('created_at', { ascending: false })
    .limit(limitCount);
  if (error) throw error;
  return (data || []).map(normalizePost);
}

export async function listAuthorPosts(authorId, limitCount = 50, authorType = null) {
  let query = supabase.from('posts').select('*').eq('author_id', authorId).order('created_at', { ascending: false }).limit(limitCount);
  if (authorType) query = query.eq('author_type', authorType);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizePost);
}

export async function listAllPosts(limitCount = 50) {
  return listRecentPosts(limitCount);
}

export async function getUserFollowing(userId) {
  const profile = await getProfileById(userId);
  return profile?.following || [];
}

export async function addPostComment(postId, comment) {
  const post = await getPostById(postId);
  if (!post) throw new Error('Post not found');
  const comments = [...(post.comments || []), comment];
  return updatePost(postId, { comments });
}

export async function togglePostLike(postId, userId) {
  const post = await getPostById(postId);
  if (!post) throw new Error('Post not found');
  const likes = new Set(post.likes || []);
  if (likes.has(userId)) likes.delete(userId);
  else likes.add(userId);
  return updatePost(postId, { likes: Array.from(likes) });
}

export async function incrementPostShare(postId) {
  const post = await getPostById(postId);
  if (!post) throw new Error('Post not found');
  return updatePost(postId, { shares: (post.shares || 0) + 1 });
}

export async function createGroup(group) {
  const { data, error } = await supabase
    .from('groups')
    .insert(mapGroupInsert(group))
    .select('*')
    .single();
  if (error) throw error;
  return normalizeGroup(data);
}

export async function listGroupsForUser(userId) {
  const { data, error } = await supabase.from('groups').select('*').contains('members', [userId]);
  if (error) throw error;
  return (data || []).map(normalizeGroup);
}

export async function getGroupById(id) {
  const { data, error } = await supabase.from('groups').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return normalizeGroup(data);
}

export async function updateGroup(id, patch) {
  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.imagePath !== undefined) payload.image = patch.imagePath;
  if (patch.image !== undefined) payload.image = patch.image;
  if (patch.members !== undefined) payload.members = patch.members;
  if (patch.admins !== undefined) payload.admins = patch.admins;
  const { data, error } = await supabase.from('groups').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return normalizeGroup(data);
}

export async function listGroupMessages(groupId) {
  const { data, error } = await supabase
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeMessage);
}

export async function sendGroupMessage(groupId, message) {
  const payload = {
    group_id: groupId,
    text: message.text || '',
    send_by: message.sendBy,
    sender_name: message.senderName || 'User',
    type: message.type || 'text',
    shared_post: message.sharedPost || null,
  };
  const { data, error } = await supabase.from('group_messages').insert(payload).select('*').single();
  if (error) throw error;
  return normalizeMessage(data);
}

export async function addGroupMember(groupId, userId) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error('Group not found');
  const members = Array.from(new Set([...(group.members || []), userId]));
  return updateGroup(groupId, { members });
}

export async function removeGroupMember(groupId, userId) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error('Group not found');
  return updateGroup(groupId, {
    members: (group.members || []).filter((memberId) => memberId !== userId),
    admins: (group.admins || []).filter((adminId) => adminId !== userId),
  });
}

export async function listDirectMessages(chatId) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeMessage);
}

export async function listDirectChatSummaries(userId) {
  if (!userId) return [];

  const [friends, messagesResult, preferences] = await Promise.all([
    listFriendProfiles(userId),
    supabase
      .from('direct_messages')
      .select('*')
      .or(`send_by.eq.${userId},send_to.eq.${userId}`)
      .order('created_at', { ascending: false }),
    listDirectChatPreferences(userId),
  ]);

  if (messagesResult.error) throw messagesResult.error;

  const friendMap = new Map((friends || []).map((friend) => [friend.uid || friend.id, friend]));
  const preferenceMap = new Map((preferences || []).map((pref) => [pref.otherUserId, pref]));
  const threadMap = new Map();

  (messagesResult.data || []).forEach((row) => {
    const message = normalizeMessage(row);
    if (!message) return;
    const otherUserId = message.sendBy === userId ? message.sendTo : message.sendBy;
    if (!otherUserId || threadMap.has(otherUserId)) return;

    threadMap.set(otherUserId, message);
  });

  return Array.from(friendMap.values())
    .map((friend) => {
      const otherUserId = friend.uid || friend.id;
      const latestMessage = threadMap.get(otherUserId) || null;
      const preference = preferenceMap.get(otherUserId) || null;
      const latestTimestamp = latestMessage?.createdAt?.toDate?.() || null;
      const hiddenAt = preference?.hiddenAt?.toDate?.() || null;
      const isHidden = hiddenAt && (!latestTimestamp || latestTimestamp.getTime() <= hiddenAt.getTime());

      if (isHidden) return null;

      return {
        userId: otherUserId,
        name: friend.name || 'User',
        email: friend.email,
        profilePhoto: friend.profilePhotoPath || friend.profilePhoto || null,
        latestMessageText: latestMessage?.text || '',
        latestMessageCreatedAt: latestMessage?.createdAt || null,
        hasMessages: !!latestMessage,
        mutedAt: preference?.mutedAt || null,
        hiddenAt: preference?.hiddenAt || null,
        chatId: [userId, otherUserId].sort().join('_'),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = left.latestMessageCreatedAt?.toDate?.()?.getTime() || 0;
      const rightTime = right.latestMessageCreatedAt?.toDate?.()?.getTime() || 0;
      return rightTime - leftTime || String(left.name).localeCompare(String(right.name));
    });
}

export async function sendDirectMessage(chatId, message) {
  const payload = {
    chat_id: chatId,
    text: message.text || '',
    send_by: message.sendBy,
    send_to: message.sendTo,
    type: message.type || 'text',
    shared_post: message.sharedPost || null,
  };
  const { data, error } = await supabase.from('direct_messages').insert(payload).select('*').single();
  if (error) throw error;
  return normalizeMessage(data);
}

export async function listNotes(department, semester, subject, category) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('department', department)
    .eq('semester', semester)
    .eq('subject', subject)
    .eq('category', category)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeNote);
}

export async function createNote(note) {
  const { data, error } = await supabase.from('notes').insert(mapNoteInsert(note)).select('*').single();
  if (error) throw error;
  return normalizeNote(data);
}

export async function listUsersForSearch(currentEmail) {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return (data || [])
    .map(normalizeProfile)
    .filter((item) => item.email !== currentEmail);
}
