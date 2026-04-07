import { API_BASE } from './apiBase';

type EventAssetType = 'iv' | 'sequence-attachment';

type UploadEventAssetParams = {
  token: string;
  file: File;
  assetType: EventAssetType;
  eventRef?: string | null;
};

type SignedUploadResponse = {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  contentType: string;
};

const inferContentType = (file: File, assetType: EventAssetType) => {
  if (file.type) return file.type;

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.pdf')) return 'application/pdf';

  return assetType === 'iv' ? 'image/png' : 'application/octet-stream';
};

const buildErrorMessage = (payload: any, fallback: string) =>
  payload?.details ? `${payload.message} ${payload.details}` : payload?.message || fallback;

export const uploadEventAsset = async ({
  token,
  file,
  assetType,
  eventRef,
}: UploadEventAssetParams) => {
  const contentType = inferContentType(file, assetType);

  const signedResponse = await fetch(`${API_BASE}/events/assets/presign`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assetType,
      fileName: file.name,
      contentType,
      eventRef: eventRef || 'event',
    }),
  });

  const signedPayload = (await signedResponse.json().catch(() => null)) as SignedUploadResponse | null;
  if (!signedResponse.ok || !signedPayload?.uploadUrl || !signedPayload?.fileUrl) {
    throw new Error(buildErrorMessage(signedPayload, 'Failed to initialize file upload'));
  }

  const uploadResponse = await fetch(signedPayload.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload ${assetType === 'iv' ? 'event image' : 'attachment'} to storage`);
  }

  return {
    url: signedPayload.fileUrl,
    key: signedPayload.key,
    filename: file.name,
    contentType,
  };
};
