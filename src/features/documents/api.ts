import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteAttachment,
  listAttachments,
  uploadAttachments,
  type PendingAttachment,
  type StoredAttachment,
} from '@/features/records/attachments';
import { supabase } from '@/lib/supabase';

export const DOCUMENT_TYPES = ['insurance', 'registration'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export type VehicleDocument = {
  id: string;
  vehicle_id: string;
  doc_type: DocumentType;
  number: string | null;
  provider: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  notes: string | null;
};

/** Days before expiry when a document is shown as "expiring soon". */
export const EXPIRY_WARNING_DAYS = 30;

export type DocumentStatus = 'missing' | 'expired' | 'expiring' | 'valid';

export function documentStatus(doc: VehicleDocument | undefined, today = new Date()): DocumentStatus {
  if (!doc?.expiry_date) return 'missing';
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiry = new Date(`${doc.expiry_date}T00:00:00`);
  const days = Math.round((expiry.getTime() - start.getTime()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= EXPIRY_WARNING_DAYS) return 'expiring';
  return 'valid';
}

const documentKeys = {
  list: (vehicleId: string | undefined) => ['vehicle-data', vehicleId, 'documents'] as const,
  files: (documentId: string | undefined) => ['document-files', documentId] as const,
};

const COLUMNS = 'id, vehicle_id, doc_type, number, provider, issue_date, expiry_date, notes';

/** The vehicle's documents keyed by type. */
export function useVehicleDocuments(vehicleId: string | undefined) {
  return useQuery({
    queryKey: documentKeys.list(vehicleId),
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_documents')
        .select(COLUMNS)
        .eq('vehicle_id', vehicleId!);
      if (error) throw error;
      const byType: Partial<Record<DocumentType, VehicleDocument>> = {};
      for (const doc of data as VehicleDocument[]) byType[doc.doc_type] = doc;
      return byType;
    },
  });
}

export function useDocumentFiles(documentId: string | undefined) {
  return useQuery({
    queryKey: documentKeys.files(documentId),
    enabled: !!documentId,
    // Signed URLs last an hour; refetch well before that.
    staleTime: 30 * 60 * 1000,
    queryFn: () => listAttachments('document', documentId!),
  });
}

export type SaveDocumentInput = {
  vehicle_id: string;
  doc_type: DocumentType;
  number: string | null;
  provider: string | null;
  expiry_date: string;
  notes: string | null;
  newFiles: PendingAttachment[];
  removedFiles: StoredAttachment[];
};

export function useSaveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ newFiles, removedFiles, ...doc }: SaveDocumentInput) => {
      const { data, error } = await supabase
        .from('vehicle_documents')
        .upsert({ ...doc, updated_at: new Date().toISOString() }, { onConflict: 'vehicle_id,doc_type' })
        .select('id')
        .single();
      if (error) throw error;

      for (const file of removedFiles) {
        await deleteAttachment(file);
      }
      await uploadAttachments({
        vehicleId: doc.vehicle_id,
        entityType: 'document',
        entityId: data.id,
        files: newFiles,
      });
      return data.id as string;
    },
    onSettled: (id, _error, doc) => {
      // Documents feed the Home due card through reminders.
      queryClient.invalidateQueries({ queryKey: ['vehicle-data', doc.vehicle_id] });
      if (id) queryClient.invalidateQueries({ queryKey: documentKeys.files(id) });
    },
  });
}

/** Common Saudi motor insurers; "Other" lets the user type any company. */
export const INSURANCE_COMPANIES = [
  { en: 'Tawuniya', ar: 'التعاونية' },
  { en: 'Al Rajhi Takaful', ar: 'تكافل الراجحي' },
  { en: 'Walaa', ar: 'ولاء' },
  { en: 'Malath', ar: 'ملاذ' },
  { en: 'MedGulf', ar: 'ميدغلف' },
  { en: 'SAICO', ar: 'سايكو' },
  { en: 'Salama', ar: 'سلامة' },
  { en: 'Allianz Saudi Fransi', ar: 'أليانز السعودي الفرنسي' },
  { en: 'GIG Saudi', ar: 'جي آي جي السعودية' },
  { en: 'Gulf Union Alahlia', ar: 'اتحاد الخليج الأهلية' },
  { en: 'Arabian Shield', ar: 'الدرع العربي' },
  { en: 'Buruj', ar: 'بروج' },
  { en: 'United Cooperative Assurance', ar: 'المتحدة للتأمين التعاوني' },
  { en: 'Wataniya', ar: 'الوطنية' },
  { en: 'Amana', ar: 'أمانة' },
  { en: 'Liva', ar: 'ليفا' },
  { en: 'Gulf Insurance Group', ar: 'مجموعة الخليج للتأمين' },
] as const;
