import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { supabase } from '../../services/supabase/client';

const STORAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'pulchowkapp-media';
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const toArrayBuffer = async (uri) => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const normalizeSegment = (segment) =>
  segment
    .split('/')
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
    )
    .filter(Boolean)
    .join('/');

const getExtension = (fileName = '', contentType = '') => {
  const extensionMatch = fileName.match(/\.[a-z0-9]+$/i);
  if (extensionMatch) return extensionMatch[0].toLowerCase();

  if (contentType === 'image/jpeg') return '.jpg';
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  if (contentType === 'image/gif') return '.gif';
  if (contentType === 'video/mp4') return '.mp4';
  if (contentType === 'video/quicktime') return '.mov';
  if (contentType === 'video/webm') return '.webm';
  if (contentType === 'video/x-m4v') return '.m4v';
  if (contentType === 'application/pdf') return '.pdf';

  return '';
};

const buildObjectPath = (folder, fileName, contentType) => {
  const safeFolder = normalizeSegment(folder || '');
  const baseName = (fileName || 'file')
    .trim()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '') || 'file';
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const extension = getExtension(fileName, contentType);
  const objectName = `${baseName}-${suffix}${extension}`;

  return [safeFolder, objectName].filter(Boolean).join('/');
};

const normalizeFileInput = (file) => {
  if (!file) return null;

  if (typeof file === 'string') {
    return { uri: file };
  }

  return {
    uri: file.uri || file.path || file.localUri || null,
    fileName: file.fileName || file.name || file.filename || null,
    contentType: file.contentType || file.mimeType || file.type || null,
  };
};

const probeUrl = async (url) => {
  if (!url) return false;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-1',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('[storage] url probe failed:', { url, error });
    return false;
  }
};

export async function uploadFile(file, folder = '') {
  const input = normalizeFileInput(file);
  if (!input?.uri) {
    throw new Error('Missing file URI');
  }

  const arrayBuffer = await toArrayBuffer(input.uri);
  const objectPath = buildObjectPath(folder, input.fileName || 'file', input.contentType || '');
  console.log('[storage] upload start:', {
    bucket: STORAGE_BUCKET,
    objectPath,
    contentType: input.contentType || 'application/octet-stream',
  });
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, arrayBuffer, {
    contentType: input.contentType || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    console.error('[storage] upload error:', {
      bucket: STORAGE_BUCKET,
      objectPath,
      error,
    });
    throw error;
  }

  console.log('[storage] upload success:', {
    bucket: STORAGE_BUCKET,
    objectPath,
  });
  return objectPath;
}

export function getFileUrl(filePath) {
  if (!filePath) return null;
  if (ABSOLUTE_URL_PATTERN.test(filePath)) return filePath;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || filePath;
}

export async function resolvePlayableStorageUrl(
  filePath,
  { bucket = STORAGE_BUCKET, expiresIn = 60 * 60 } = {}
) {
  if (!filePath) {
    return { url: null, mode: 'missing', bucket, filePath: null };
  }

  if (ABSOLUTE_URL_PATTERN.test(filePath)) {
    console.log('[storage] video url is already absolute:', { bucket, filePath });
    return { url: filePath, mode: 'absolute', bucket, filePath };
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(filePath)?.data?.publicUrl || null;
  console.log('[storage] video url candidate:', { bucket, filePath, publicUrl, expiresIn });

  if (publicUrl && (await probeUrl(publicUrl))) {
    console.log('[storage] video url resolved (public):', { bucket, filePath, url: publicUrl });
    return { url: publicUrl, mode: 'public', bucket, filePath };
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresIn);
    if (error) throw error;

    const signedUrl = data?.signedUrl || null;
    console.log('[storage] signed video url generated:', { bucket, filePath, signedUrl });

    if (signedUrl && (await probeUrl(signedUrl))) {
      console.log('[storage] video url resolved (signed):', { bucket, filePath, url: signedUrl });
      return { url: signedUrl, mode: 'signed', bucket, filePath };
    }

    return { url: signedUrl || publicUrl, mode: signedUrl ? 'signed' : 'public', bucket, filePath };
  } catch (error) {
    console.error('[storage] signed url generation failed:', { bucket, filePath, error });
    return { url: publicUrl || null, mode: publicUrl ? 'public' : 'error', bucket, filePath, error };
  }
}

export async function deleteFile(filePath) {
  if (!filePath || ABSOLUTE_URL_PATTERN.test(filePath)) return;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (error) throw error;
}
