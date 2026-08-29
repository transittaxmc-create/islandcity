import { pgTable, serial, timestamp, jsonb, integer, text, index } from "drizzle-orm/pg-core";

export const driverBackupsTable = pgTable("driver_backups", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id"),
  savedAt:      timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
  trips:        jsonb("trips").default([]).notNull(),
  expenses:     jsonb("expenses").default([]).notNull(),
  hoursLog:     jsonb("hours_log").default([]).notNull(),
  settings:     jsonb("settings").default({}).notNull(),
  tripCount:    integer("trip_count").default(0).notNull(),
  expenseCount: integer("expense_count").default(0).notNull(),
}, (table) => [
  index("driver_backups_user_id_saved_at_idx").on(table.userId, table.savedAt),
]);

export type DriverBackup    = typeof driverBackupsTable.$inferSelect;
export type InsertDriverBackup = typeof driverBackupsTable.$inferInsert;
