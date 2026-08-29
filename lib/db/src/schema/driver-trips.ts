import { jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

/**
 * Canonical trip records shared by the Android app and the web accounting app.
 *
 * The complete web Trip shape is kept in JSONB so the mobile client can start
 * with a smaller entry shape while the accounting UI retains all of its
 * existing fields.
 */
export const driverTripsTable = pgTable("driver_trips", {
  id: text("id").primaryKey(),
  trip: jsonb("trip").notNull(),
  source: text("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DriverTrip = typeof driverTripsTable.$inferSelect;
export type InsertDriverTrip = typeof driverTripsTable.$inferInsert;