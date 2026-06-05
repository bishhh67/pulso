import { supabase } from './client';
import { normalizeMessage } from './data';

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

// Normalize server row
export const normalizeServer = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    image: row.image || null,
    imagePath: row.image || null,
    ownerId: row.owner_id,
    createdAt: isoTimestamp(row.created_at),
  };
};

// Normalize channel row
export const normalizeChannel = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    description: row.description || '',
    allowedRoles: row.allowed_roles || ['admin', 'moderator', 'normal'],
    createdAt: isoTimestamp(row.created_at),
  };
};

// Normalize server member row
export const normalizeServerMember = (row) => {
  if (!row) return null;
  return {
    serverId: row.server_id,
    userId: row.user_id,
    role: row.role || 'normal',
    createdAt: isoTimestamp(row.created_at),
    // Joined profile information if available
    name: row.profiles?.name || 'User',
    email: row.profiles?.email || '',
    profilePhoto: row.profiles?.profile_photo || null,
    profilePhotoPath: row.profiles?.profile_photo || null,
  };
};

// Create a server
export async function createServer(server) {
  const { data, error } = await supabase
    .from('servers')
    .insert({
      name: server.name,
      description: server.description || '',
      image: server.imagePath ?? server.image ?? null,
      owner_id: server.ownerId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeServer(data);
}

// List servers user is a member of
export async function listServersForUser(userId) {
  const { data, error } = await supabase
    .from('server_members')
    .select(`
      server_id,
      servers (*)
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(row => normalizeServer(row.servers)).filter(Boolean);
}

// List all servers (for joining)
export async function listAllServers() {
  const { data, error } = await supabase
    .from('servers')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []).map(normalizeServer);
}

// Get server by ID
export async function getServerById(id) {
  const { data, error } = await supabase
    .from('servers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return normalizeServer(data);
}

// Update server info
export async function updateServer(serverId, patch) {
  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.image !== undefined) payload.image = patch.image;

  const { data, error } = await supabase
    .from('servers')
    .update(payload)
    .eq('id', serverId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeServer(data);
}

// Delete server
export async function deleteServer(serverId) {
  const { error } = await supabase
    .from('servers')
    .delete()
    .eq('id', serverId);

  if (error) throw error;
  return true;
}

// Join server
export async function joinServer(serverId, userId) {
  const { data, error } = await supabase
    .from('server_members')
    .upsert({
      server_id: serverId,
      user_id: userId,
      role: 'normal',
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeServerMember(data);
}

// Leave or kick user from server
// Accept server invitation (join server)
// This function is used when a user accepts a server‑invite notification.
export async function acceptServerInvite(serverId, userId) {
  // Re‑use the existing joinServer helper to add the member as a normal user.
  const member = await joinServer(serverId, userId);
  return member;
}

// Reject server invitation (simply mark notification as read)
export async function rejectServerInvite(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
  return true;
}


// List server members with profile details
export async function getServerMembers(serverId) {
  const { data, error } = await supabase
    .from('server_members')
    .select(`
      server_id,
      user_id,
      role,
      created_at,
      profiles (
        name,
        email,
        profile_photo
      )
    `)
    .eq('server_id', serverId);

  if (error) throw error;
  return (data || []).map(normalizeServerMember);
}

// Get user member role in a server
export async function getUserServerMember(serverId, userId) {
  const { data, error } = await supabase
    .from('server_members')
    .select(`
      server_id,
      user_id,
      role,
      created_at,
      profiles (
        name,
        email,
        profile_photo
      )
    `)
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return normalizeServerMember(data);
}

// Promote/demote member role
export async function updateMemberRole(serverId, userId, role) {
  const { data, error } = await supabase
    .from('server_members')
    .update({ role })
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeServerMember(data);
}

// Transfer Server Ownership
export async function transferServerOwnership(serverId, currentOwnerId, newOwnerId) {
  // Update server owner
  const { error: serverError } = await supabase
    .from('servers')
    .update({ owner_id: newOwnerId })
    .eq('id', serverId);

  if (serverError) throw serverError;

  // Make new owner an admin
  const { error: memberError } = await supabase
    .from('server_members')
    .update({ role: 'admin' })
    .eq('server_id', serverId)
    .eq('user_id', newOwnerId);

  if (memberError) throw memberError;

  // Demote old owner to normal
  const { error: demoteError } = await supabase
    .from('server_members')
    .update({ role: 'normal' })
    .eq('server_id', serverId)
    .eq('user_id', currentOwnerId);

  if (demoteError) throw demoteError;

  return true;
}

// List channels in server
export async function listServerChannels(serverId) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('server_id', serverId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeChannel);
}

// Create a channel
export async function createChannel(channel) {
  const { data, error } = await supabase
    .from('channels')
    .insert({
      server_id: channel.serverId,
      name: channel.name.toLowerCase().replace(/\s+/g, '-'),
      description: channel.description || '',
      allowed_roles: channel.allowedRoles || ['admin', 'moderator', 'normal'],
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeChannel(data);
}

// Update a channel
export async function updateChannel(channelId, patch) {
  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name.toLowerCase().replace(/\s+/g, '-');
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.allowedRoles !== undefined) payload.allowed_roles = patch.allowedRoles;

  const { data, error } = await supabase
    .from('channels')
    .update(payload)
    .eq('id', channelId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeChannel(data);
}

// Delete a channel
export async function deleteChannel(channelId) {
  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId);

  if (error) throw error;
  return true;
}

// List channel messages
export async function listChannelMessages(channelId) {
  const { data, error } = await supabase
    .from('server_messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeMessage);
}

// Send channel message
export async function sendChannelMessage(channelId, serverId, message) {
  const { data, error } = await supabase
    .from('server_messages')
    .insert({
      channel_id: channelId,
      server_id: serverId,
      send_by: message.sendBy,
      sender_name: message.senderName || 'User',
      text: message.text || '',
      type: message.type || 'text',
      shared_post: message.sharedPost || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeMessage(data);
}

// Delete channel message
export async function deleteChannelMessage(messageId) {
  const { error } = await supabase
    .from('server_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
  return true;
}
