import { index, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

export const driverHoursTable = pgTable("driver_hours", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  date: text("date").notNull(),
  hours: numeric("hours", { precision: 10, scale: 4, mode: "number" }).notNull(),
  clockIn: text("clock_in").notNull(),
  clockOut: text("clock_out").notNull(),
  breakMs: integer("break_ms").notNull().default(0),
  miles: numeric("miles", { precision: 10, scale: 4, mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("driver_hours_user_id_idx").on(table.userId),
]);

export type DriverHour = typeof driverHoursTable.$inferSelect;
export type InsertDriverHour = typeof driverHoursTable.$inferInsert;