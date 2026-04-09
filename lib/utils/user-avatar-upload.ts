import { apiService } from '../services/api';

const REMOTE_URI_PATTERN = /^https?:\/\//i;

const getMimeTypeFromUri = (uri: string): string => {
  const lowerUri = uri.toLowerCase();

  if (lowerUri.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
};

const getFileExtension = (mimeType: string): string => {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
};

export const isRemoteAssetUri = (value?: string | null): boolean =>
  typeof value === 'string' && REMOTE_URI_PATTERN.test(value);

export const uploadCurrentUserAvatar = async (
  uri: string,
  fileNamePrefix = 'user-avatar',
): Promise<string> => {
  const mimeType = getMimeTypeFromUri(uri);
  const formData = new FormData();

  formData.append('file', {
    uri,
    type: mimeType,
    name: `${fileNamePrefix}-${Date.now()}.${getFileExtension(mimeType)}`,
  } as any);

  const response = await apiService.users.uploadMeAvatar(formData);
  const avatarUrl =
    response.data?.avatarUrl ??
    (response as { avatarUrl?: string }).avatarUrl;

  if (!avatarUrl) {
    throw new Error('Avatar upload did not return an avatar URL.');
  }

  return avatarUrl;
};
