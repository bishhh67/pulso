import { createPost as createPostRecord, listFeedPosts } from '../services/supabase/data';
import { auth } from '../services/supabase/auth';

/**
 * Create a new post
 */
export async function createPost({ authorId, authorType, content, image }) {
  try {
    const post = await createPostRecord({
      authorId,
      authorType,
      content,
      image: image || null,
      likes: [],
      comments: [],
      shares: 0,
    });
    console.log(`Post created with ID: ${post.id}`);
    return post.id;
  } catch (error) {
    console.error('Error creating post:', error);
  }
}

/**
 * Fetch posts for the home feed based on following list
 */
export async function getFeedPosts(currentUserId, limitNum = 20) {
  try {
    return await listFeedPosts(currentUserId, limitNum);
  } catch (error) {
    console.error('Error fetching feed posts:', error);
    return [];
  }
}
