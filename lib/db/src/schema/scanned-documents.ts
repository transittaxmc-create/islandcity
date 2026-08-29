import { pgTable, serial, timestamp, jsonb, varchar, date, numeric, text, index } from "drizzle-orm/pg-core";

export const scannedDocumentsTable = pgTable("scanned_documents", {
  id:         serial("id").primaryKey(),
  userId:     text("user_id"),
  type:       varchar("type", { length: 20 }).notNull(),      // 'receipt' | 'statement'
  objectPath: varchar("object_path", { length: 500 }).notNull(), // GCS path
  fileDate:   date("file_date"),
  category:   varchar("category", { length: 100 }),
  vendor:     varchar("vendor", { length: 200 }),
  amount:     numeric("amount", { precision: 10, scale: 2 }),
  metadata:   jsonb("metadata").default({}).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("scanned_documents_user_id_created_at_idx").on(table.userId, table.createdAt),
]);

export type ScannedDocument    = typeof scannedDocumentsTable.$inferSelect;
export type InsertScannedDocument = typeof scannedDocumentsTable.$inferInsert;
