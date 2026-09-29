import { readFileAsArrayBuffer } from '@/lib/read-file';
import { supabase } from '@/lib/supabase';

export const RECEIPTS_BUCKET = 'receipts';
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** A file picked in the form, not uploaded yet. */
export type PendingAttachment = {
  key: string;
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
};

export type AttachmentEntity = 'fuel' | 'maintenance' | 'expense' | 'document';

/** A stored file with a short-lived URL for viewing. */
export type StoredAttachment = {
  id: string;
  storage_path: string;
  mime_type: string | null;
  url: string | null;
};

/** Thrown when the record saved but one or more files did not upload. */
export class AttachmentUploadError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'AttachmentUploadError';
  }
}

function extension(file: PendingAttachment) {
  const fromName = /\.([a-z0-9]{1,8})$/i.exec(file.name)?.[1];
  if (fromName) return fromName.toLowerCase();
  const fromMime = file.mimeType.split('/')[1];
  return fromMime === 'jpeg' ? 'jpg' : (fromMime ?? 'bin');
}

/**
 * Uploads files to `receipts/<user>/<vehicle>/<entity>/<id>/…` (the storage policy
 * requires the user id as the first folder) and links each one in `attachments`.
 */
export async function uploadAttachments(params: {
  vehicleId: string;
  entityType: AttachmentEntity;
  entityId: string;
  files: PendingAttachment[];
}) {
  const { vehicleId, entityType, entityId, files } = params;
  if (files.length === 0) return;

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new AttachmentUploadError('Not signed in');

  try {
    for (const [index, file] of files.entries()) {
      const path = `${userId}/${vehicleId}/${entityType}/${entityId}/${Date.now()}-${index}.${extension(file)}`;
      const body = await readFileAsArrayBuffer(file.uri);

      const upload = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, body, { contentType: file.mimeType, upsert: false });
      if (upload.error) throw upload.error;

      const row = await supabase.from('attachments').insert({
        vehicle_id: vehicleId,
        entity_type: entityType,
        entity_id: entityId,
        storage_path: path,
        mime_type: file.mimeType,
      });
      if (row.error) {
        await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
        throw row.error;
      }
    }
  } catch (error) {
    throw new AttachmentUploadError(error);
  }
}

const SIGNED_URL_SECONDS = 60 * 60;

/** Files linked to a record, with signed URLs (the bucket is private). */
export async function listAttachments(entityType: AttachmentEntity, entityId: string) {
  const { data, error } = await supabase
    .from('attachments')
    .select('id, storage_path, mime_type')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at');
  if (error) throw error;
  if (data.length === 0) return [];

  const signed = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrls(
      data.map((a) => a.storage_path),
      SIGNED_URL_SECONDS
    );
  if (signed.error) throw signed.error;

  return data.map((a, i) => ({ ...a, url: signed.data[i]?.signedUrl ?? null })) as StoredAttachment[];
}

export async function deleteAttachment(attachment: Pick<StoredAttachment, 'id' | 'storage_path'>) {
  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
  if (error) throw error;
  await supabase.storage.from(RECEIPTS_BUCKET).remove([attachment.storage_path]);
}
