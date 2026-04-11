import type { OwnerPortfolioRequest } from '../types';

const getRequestAttachmentUrl = (
  attachment: OwnerPortfolioRequest['attachments'][number],
): string | null => {
  if (typeof attachment === 'string') {
    const trimmed = attachment.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const candidate = attachment.url ?? attachment.fileUrl ?? attachment.uri ?? null;
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : null;
};

export const getOwnerRequestAttachmentUrl = getRequestAttachmentUrl;

export const getOwnerRequestAttachmentLabel = (
  attachment: OwnerPortfolioRequest['attachments'][number],
  index: number,
): string => {
  if (attachment && typeof attachment === 'object' && 'name' in attachment) {
    const name = attachment.name;
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
  }

  const url = getRequestAttachmentUrl(attachment);
  if (!url) {
    return `Attachment ${index + 1}`;
  }

  const segments = url.split('/');
  const rawFileName = segments[segments.length - 1]?.split('?')[0] ?? '';
  let decodedFileName = rawFileName;

  if (rawFileName) {
    try {
      decodedFileName = decodeURIComponent(rawFileName);
    } catch {
      decodedFileName = rawFileName;
    }
  }

  return decodedFileName || `Attachment ${index + 1}`;
};
