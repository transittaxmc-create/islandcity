import { pgTable, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const driverBackupsTable = pgTable("driver_backups", {
  id:           serial("id").primaryKey(),
  savedAt:      timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
  trips:        jsonb("trips").default([]).notNull(),
  expenses:     jsonb("expenses").default([]).notNull(),
  hoursLog:     jsonb("hours_log").default([]).notNull(),
  settings:     jsonb("settings").default({}).notNull(),
  tripCount:    integer("trip_count").default(0).notNull(),
  expenseCount: integer("expense_count").default(0).notNull(),
});

export type DriverBackup    = typeof driverBackupsTable.$inferSelect;
export type InsertDriverBackup = typeof driverBackupsTable.$inferInsert;
