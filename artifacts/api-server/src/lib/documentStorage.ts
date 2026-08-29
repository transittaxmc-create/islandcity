/**
 * documentStorage.ts
 * Server-side helper: save a base64-encoded file directly to GCS and
 * record the metadata in the scanned_documents DB table.
 */
import { randomUUID } from "crypto";
import { objectStorageClient } from "./objectStorage";
import { db, scannedDocumentsTable } from "@workspace/db";

const bucketId = () => {
  const id = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];
  if (!id) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is not set");
  return id;
};

/** Extension map for common MIME types */
const extFor: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export interface SaveDocumentInput {
  userId:      string;
  /** 'receipt' | 'statement' */
  type:        string;
  /** raw base64 string (no data-URI prefix) */
  imageBase64: string;
  mimeType:    string;
  /** Date string YYYY-MM-DD from the document itself */
  fileDate?:   string | null;
  category?:   string | null;
  vendor?:     string | null;
  amount?:     number | null;
  /** any extra data to store alongside (e.g. full AI scan result) */
  metadata?:   Record<string, unknown>;
}

export interface SavedDocument {
  id:         number;
  objectPath: string;
  serveUrl:   string; // /api/documents/:id/file
}

export async function saveDocument(input: SaveDocumentInput): Promise<SavedDocument> {
  const { userId, type, imageBase64, mimeType, fileDate, category, vendor, amount, metadata = {} } = input;

  // Derive storage path: documents/{type}/{YYYY-MM}/{uuid}.ext
  const now    = new Date();
  const month  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ext    = extFor[mimeType] ?? "bin";
  const uuid   = randomUUID();
  const objectPath = `documents/${type}/${month}/${uuid}.${ext}`;

  // Write directly to GCS from the server — no presigned URL needed
  const bucket = objectStorageClient.bucket(bucketId());
  const file   = bucket.file(objectPath);
  const buffer = Buffer.from(imageBase64, "base64");
  await file.save(buffer, {
    contentType: mimeType,
    metadata: { type, category: category ?? "", vendor: vendor ?? "" },
  });

  // Store metadata in DB
  const [row] = await db.insert(scannedDocumentsTable).values({
    userId,
    type,
    objectPath,
    fileDate:  fileDate   ?? null,
    category:  category   ?? null,
    vendor:    vendor     ?? null,
    amount:    amount != null ? String(amount) : null,
    metadata:  { ...metadata, mimeType },
  }).returning({ id: scannedDocumentsTable.id });

  return { id: row.id, objectPath, serveUrl: `/api/documents/${row.id}/file` };
}
