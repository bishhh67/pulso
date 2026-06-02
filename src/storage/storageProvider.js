import { supabase } from '../../services/supabase/client';

const STORAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'pulchowkapp-media';
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const toBlob = async (uri) => {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Unable to read local file');
  }
  return response.blob();
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
    contentType: file.contentType || file.type || null,
  };
};

export async function uploadFile(file, folder = '') {
  const input = normalizeFileInput(file);
  if (!input?.uri) {
    throw new Error('Missing file URI');
  }

  const blob = await toBlob(input.uri);
  const objectPath = buildObjectPath(folder, input.fileName || 'file', input.contentType || blob.type);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, blob, {
    contentType: input.contentType || blob.type || 'application/octet-stream',
    upsert: true,
  });

  if (error) throw error;
  return objectPath;
}

export function getFileUrl(filePath) {
  if (!filePath) return null;
  if (ABSOLUTE_URL_PATTERN.test(filePath)) return filePath;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl || filePath;
}

export async function deleteFile(filePath) {
  if (!filePath || ABSOLUTE_URL_PATTERN.test(filePath)) return;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (error) throw error;
}
